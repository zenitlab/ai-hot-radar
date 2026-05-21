#!/usr/bin/env python3
"""
Generate a formatted Markdown hotspot report from JSON search results.
Reads JSON array from stdin (output from search_*.py scripts).

Usage:
    python search_web.py "AI" | python generate_report.py --keyword "AI"
    cat results.json | python generate_report.py --keyword "GPT-5"
    python generate_report.py --keyword "AI编程" --file results.json

The report groups results by source and sorts by engagement metrics.
Note: This script produces the raw data report. AI analysis (importance,
relevance, authenticity) should be done by Claude after reviewing the report.
"""

import argparse
import json
import math
import sys
from datetime import datetime, timezone


def calc_heat_score(item):
    """Calculate composite heat score from engagement metrics."""
    likes = item.get("likeCount", 0) or 0
    retweets = item.get("retweetCount", 0) or 0
    views = item.get("viewCount", 0) or 0
    comments = item.get("commentCount", 0) or 0
    score = item.get("score", 0) or 0  # HN points

    raw = likes * 10 + retweets * 5 + math.log10(max(views, 1)) * 2 + comments * 3 + score * 8
    return raw


def heat_label(score, max_score):
    """Get heat tier label."""
    if max_score == 0:
        return "❄️ 冷"
    normalized = min(100, score / max_score * 100)
    if normalized >= 80:
        return "🔥 爆"
    elif normalized >= 60:
        return "🌡️ 热"
    elif normalized >= 40:
        return "☀️ 温"
    elif normalized >= 20:
        return "🌤️ 凉"
    else:
        return "❄️ 冷"


SOURCE_LABELS = {
    "bing": "🔍 Bing",
    "google": "🔍 Google",
    "duckduckgo": "🦆 DuckDuckGo",
    "hackernews": "📰 HackerNews",
    "sogou": "🔍 搜狗",
    "bilibili": "📺 B站",
    "weibo": "🔥 微博",
    "twitter": "🐦 Twitter",
}


def format_number(n):
    if n is None:
        return ""
    if n >= 10000:
        return f"{n/10000:.1f}万"
    elif n >= 1000:
        return f"{n/1000:.1f}k"
    return str(n)


def relative_time(iso_str):
    """Convert ISO timestamp to relative time in Chinese."""
    if not iso_str:
        return ""
    try:
        dt = datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        diff = now - dt
        seconds = diff.total_seconds()
        if seconds < 60:
            return "刚刚"
        elif seconds < 3600:
            return f"{int(seconds/60)} 分钟前"
        elif seconds < 86400:
            return f"{int(seconds/3600)} 小时前"
        elif seconds < 2592000:
            return f"{int(seconds/86400)} 天前"
        else:
            return dt.strftime("%Y-%m-%d")
    except Exception:
        return ""


def generate_report(results, keyword):
    """Generate Markdown report from search results."""
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    # Compute heat scores
    for r in results:
        r["_heat"] = calc_heat_score(r)
    max_heat = max((r["_heat"] for r in results), default=0)

    # Group by source
    by_source = {}
    for r in results:
        src = r.get("source", "unknown")
        by_source.setdefault(src, []).append(r)

    # Count sources
    sources_used = ", ".join(SOURCE_LABELS.get(s, s) for s in by_source)

    lines = []
    lines.append(f"## 🔥 热点监控报告 — {keyword}")
    lines.append(f"> 扫描时间: {now} | 数据源: {sources_used} | 共 {len(results)} 条结果")
    lines.append("")

    # Skip account detection info entries
    filtered_results = [r for r in results if r.get("_type") != "account_detected"]

    # Sort all results by heat score
    filtered_results.sort(key=lambda r: r["_heat"], reverse=True)

    # Top highlights (top 5 by heat)
    if filtered_results:
        lines.append("### 📊 热度排行")
        lines.append("")
        for i, r in enumerate(filtered_results[:5], 1):
            src_label = SOURCE_LABELS.get(r.get("source", ""), r.get("source", ""))
            hl = heat_label(r["_heat"], max_heat)
            time_str = relative_time(r.get("publishedAt"))
            time_part = f" | {time_str}" if time_str else ""

            lines.append(f"{i}. **{r['title']}** {hl}")

            # Engagement metrics
            metrics = []
            if r.get("viewCount"):
                metrics.append(f"👁 {format_number(r['viewCount'])}")
            if r.get("likeCount"):
                metrics.append(f"❤️ {format_number(r['likeCount'])}")
            if r.get("retweetCount"):
                metrics.append(f"🔁 {format_number(r['retweetCount'])}")
            if r.get("commentCount"):
                metrics.append(f"💬 {format_number(r['commentCount'])}")
            if r.get("danmakuCount"):
                metrics.append(f"💭 {format_number(r['danmakuCount'])}")
            if r.get("score"):
                metrics.append(f"⬆️ {r['score']}pts")

            meta = f"   {src_label}"
            if metrics:
                meta += f" | {' '.join(metrics)}"
            meta += time_part
            lines.append(meta)

            # Author info if available
            author = r.get("author", {})
            if author and author.get("name"):
                author_str = f"   👤 {author['name']}"
                if author.get("username"):
                    author_str += f" (@{author['username']})"
                if author.get("verified"):
                    author_str += " ✅"
                if author.get("followers"):
                    author_str += f" | {format_number(author['followers'])} followers"
                lines.append(author_str)

            lines.append(f"   🔗 {r['url']}")
            lines.append("")

    # By source breakdown
    lines.append("---")
    lines.append("### 📋 按来源分类")
    lines.append("")

    for source, items in by_source.items():
        # Skip account detection entries
        items = [r for r in items if r.get("_type") != "account_detected"]
        if not items:
            continue

        src_label = SOURCE_LABELS.get(source, source)
        lines.append(f"#### {src_label} ({len(items)} 条)")
        lines.append("")

        items.sort(key=lambda r: r["_heat"], reverse=True)
        for r in items[:10]:  # Max 10 per source
            time_str = relative_time(r.get("publishedAt"))
            time_part = f" ({time_str})" if time_str else ""
            content_preview = (r.get("content") or "")[:80]
            if len(r.get("content", "")) > 80:
                content_preview += "..."

            lines.append(f"- **{r['title']}**{time_part}")
            if content_preview and content_preview != r["title"]:
                lines.append(f"  {content_preview}")
            lines.append(f"  🔗 {r['url']}")
            lines.append("")

    # Account detection results
    accounts = [r for r in results if r.get("_type") == "account_detected"]
    if accounts:
        lines.append("---")
        lines.append("### 👤 检测到的账号")
        lines.append("")
        for acc in accounts:
            verified = " ✅" if acc.get("verified") else ""
            lines.append(f"- **{acc['name']}** ({acc['platform']}){verified}")
            lines.append(f"  粉丝: {format_number(acc.get('fans', 0))} | {acc.get('description', '')}")
            lines.append("")

    # Summary
    lines.append("---")
    lines.append(f"*共发现 {len(filtered_results)} 条结果，来自 {len(by_source)} 个数据源*")
    lines.append("")
    lines.append("> 💡 以上为原始搜索数据，请根据分析框架进一步评估每条内容的真实性、相关性和重要程度。")

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Generate hotspot Markdown report")
    parser.add_argument("--keyword", required=True, help="The keyword being monitored")
    parser.add_argument("--file", help="JSON file to read (default: stdin)")
    args = parser.parse_args()

    if args.file:
        with open(args.file, "r", encoding="utf-8") as f:
            results = json.load(f)
    else:
        results = json.load(sys.stdin)

    if not isinstance(results, list):
        print("Error: Expected JSON array", file=sys.stderr)
        sys.exit(1)

    report = generate_report(results, args.keyword)
    print(report)


if __name__ == "__main__":
    main()
