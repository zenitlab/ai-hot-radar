#!/usr/bin/env python3
"""
Chinese platform search: Sogou, Bilibili, Weibo.
No API keys required. Outputs JSON array to stdout.

Usage:
    python search_china.py "AI编程"
    python search_china.py "GPT-5" --sources bilibili,weibo
    python search_china.py "程序员鱼皮" --detect-account
"""

import argparse
import json
import random
import re
import sys
import time
import uuid
from datetime import datetime, timezone

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("Error: Install dependencies first: pip install requests beautifulsoup4", file=sys.stderr)
    sys.exit(1)

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
]

ALL_SOURCES = ["sogou", "bilibili", "weibo"]


def rand_ua():
    return random.choice(USER_AGENTS)


# ============================================================
# Sogou Search
# ============================================================
def search_sogou(query, limit=20):
    """Search Sogou web (Chinese search engine, no API key)."""
    try:
        resp = requests.get(
            "https://www.sogou.com/web",
            params={"query": query, "ie": "utf-8"},
            headers={
                "User-Agent": rand_ua(),
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            },
            timeout=15,
            allow_redirects=True,
        )
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        results = []
        for item in soup.select(".vrwrap, .rb"):
            title_el = item.select_one("h3 a, .vr-title a, .vrTitle a")
            if not title_el:
                continue
            title = title_el.get_text(strip=True)
            url = title_el.get("href", "")
            if url.startswith("/link?url="):
                url = f"https://www.sogou.com{url}"

            snippet_el = (
                item.select_one(".space-txt")
                or item.select_one(".str-text-info")
                or item.select_one(".str_info")
                or item.select_one(".text-layout")
                or item.select_one("p")
            )
            snippet = snippet_el.get_text(strip=True) if snippet_el else ""

            if title and url and "大家还在搜" not in title:
                results.append({
                    "title": title,
                    "content": snippet or title,
                    "url": url,
                    "source": "sogou",
                })
                if len(results) >= limit:
                    break
        print(f"Sogou: {len(results)} results", file=sys.stderr)
        return results
    except Exception as e:
        print(f"Sogou error: {e}", file=sys.stderr)
        return []


# ============================================================
# Bilibili Search
# ============================================================
def _bili_headers():
    buvid3 = f"{uuid.uuid4()}infoc"
    return {
        "User-Agent": rand_ua(),
        "Referer": "https://search.bilibili.com/",
        "Accept": "application/json",
        "Cookie": f"buvid3={buvid3}",
    }


def search_bilibili(query, limit=20):
    """Search Bilibili videos (public API, no key)."""
    try:
        resp = requests.get(
            "https://api.bilibili.com/x/web-interface/search/type",
            params={
                "keyword": query,
                "search_type": "video",
                "order": "pubdate",
                "page": 1,
                "pagesize": limit,
            },
            headers=_bili_headers(),
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        if data.get("code") != 0 or not data.get("data", {}).get("result"):
            print(f"Bilibili: no results (code={data.get('code')})", file=sys.stderr)
            return []

        results = []
        for v in data["data"]["result"]:
            title = re.sub(r"</?em[^>]*>", "", v.get("title", ""))
            results.append({
                "title": title,
                "content": v.get("description") or title,
                "url": f"https://www.bilibili.com/video/{v['bvid']}",
                "source": "bilibili",
                "sourceId": v.get("bvid"),
                "publishedAt": datetime.fromtimestamp(v.get("pubdate", 0), tz=timezone.utc).isoformat(),
                "viewCount": v.get("play", 0),
                "likeCount": v.get("like", 0),
                "commentCount": v.get("review", 0),
                "danmakuCount": v.get("danmaku", 0),
                "author": {
                    "name": v.get("author", ""),
                    "username": str(v.get("mid", "")),
                },
            })
            if len(results) >= limit:
                break
        print(f"Bilibili: {len(results)} results", file=sys.stderr)
        return results
    except Exception as e:
        print(f"Bilibili error: {e}", file=sys.stderr)
        return []


def search_bilibili_user(keyword):
    """Search Bilibili for a user matching the keyword. Returns user dict or None."""
    try:
        resp = requests.get(
            "https://api.bilibili.com/x/web-interface/search/type",
            params={
                "keyword": keyword,
                "search_type": "bili_user",
                "page": 1,
                "pagesize": 5,
            },
            headers=_bili_headers(),
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        if data.get("code") != 0 or not data.get("data", {}).get("result"):
            return None

        users = data["data"]["result"]
        # Exact match
        for u in users:
            if u["uname"].lower() == keyword.lower():
                return u
        # Fuzzy: top result with >1000 fans and name contains keyword
        top = users[0]
        if top.get("fans", 0) > 1000 and keyword.lower() in top["uname"].lower():
            return top
        return None
    except Exception as e:
        print(f"Bilibili user search error: {e}", file=sys.stderr)
        return None


def get_bilibili_user_videos(mid, limit=10):
    """Fetch latest videos from a Bilibili user's channel."""
    try:
        resp = requests.get(
            "https://api.bilibili.com/x/space/arc/search",
            params={"mid": mid, "pn": 1, "ps": limit, "order": "pubdate"},
            headers={
                "User-Agent": rand_ua(),
                "Referer": f"https://space.bilibili.com/{mid}",
                "Accept": "application/json",
            },
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        vlist = data.get("data", {}).get("list", {}).get("vlist", [])
        results = []
        for v in vlist:
            results.append({
                "title": v.get("title", ""),
                "content": v.get("description") or v.get("title", ""),
                "url": f"https://www.bilibili.com/video/{v['bvid']}",
                "source": "bilibili",
                "sourceId": v.get("bvid"),
                "publishedAt": datetime.fromtimestamp(v.get("created", 0), tz=timezone.utc).isoformat(),
                "viewCount": v.get("play", 0),
                "commentCount": v.get("comment", 0) or v.get("review", 0),
                "danmakuCount": v.get("danmaku", 0),
                "author": {
                    "name": v.get("author", ""),
                    "username": str(v.get("mid", "")),
                },
            })
        print(f"Bilibili user {mid}: {len(results)} videos", file=sys.stderr)
        return results
    except Exception as e:
        print(f"Bilibili user videos error: {e}", file=sys.stderr)
        return []


# ============================================================
# Weibo Hot Search
# ============================================================
def search_weibo(query, _limit=20):
    """Match query against Weibo realtime hot search topics (public API, no login)."""
    try:
        resp = requests.get(
            "https://weibo.com/ajax/side/hotSearch",
            headers={
                "User-Agent": rand_ua(),
                "Accept": "application/json",
                "Referer": "https://weibo.com/",
            },
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        if data.get("ok") != 1 or not data.get("data", {}).get("realtime"):
            print("Weibo: no data", file=sys.stderr)
            return []

        hot_items = data["data"]["realtime"]
        query_lower = query.lower()
        query_words = [w for w in query_lower.split() if w]
        results = []

        for item in hot_items:
            word = (item.get("note") or item.get("word") or "").lower()
            is_match = (
                any(qw in word or word in qw for qw in query_words)
                or query_lower in word
                or word in query_lower
            )
            if is_match:
                topic = item.get("note") or item.get("word", "")
                from urllib.parse import quote
                url = f"https://s.weibo.com/weibo?q={quote('#' + topic + '#')}"
                results.append({
                    "title": f"🔥 微博热搜: {topic}",
                    "content": f"微博热搜话题「{topic}」，热度 {item.get('num', 0):,}",
                    "url": url,
                    "source": "weibo",
                    "viewCount": item.get("num", 0),
                })

        print(f"Weibo: {len(results)} matches", file=sys.stderr)
        return results
    except Exception as e:
        print(f"Weibo error: {e}", file=sys.stderr)
        return []


# ============================================================
# Aggregation
# ============================================================
SEARCH_FNS = {
    "sogou": search_sogou,
    "bilibili": search_bilibili,
    "weibo": search_weibo,
}

RATE_LIMITS = {
    "sogou": 3,
    "bilibili": 2,
    "weibo": 3,
}


def main():
    parser = argparse.ArgumentParser(description="Chinese platform search aggregator")
    parser.add_argument("query", help="Search query (Chinese or English)")
    parser.add_argument("--sources", default=",".join(ALL_SOURCES),
                        help=f"Comma-separated sources (default: {','.join(ALL_SOURCES)})")
    parser.add_argument("--limit", type=int, default=20, help="Max results per source (default: 20)")
    parser.add_argument("--detect-account", action="store_true",
                        help="Detect if keyword is a Bilibili account and fetch their latest videos")
    args = parser.parse_args()

    sources = [s.strip().lower() for s in args.sources.split(",") if s.strip()]
    invalid = [s for s in sources if s not in SEARCH_FNS]
    if invalid:
        print(f"Unknown sources: {invalid}. Available: {ALL_SOURCES}", file=sys.stderr)
        sys.exit(1)

    all_results = []

    # Account detection (optional)
    if args.detect_account:
        print("Detecting Bilibili account...", file=sys.stderr)
        user = search_bilibili_user(args.query)
        if user:
            info = {
                "_type": "account_detected",
                "platform": "bilibili",
                "name": user["uname"],
                "mid": user["mid"],
                "fans": user.get("fans", 0),
                "verified": user.get("official_verify", {}).get("type", -1) >= 0,
                "description": user.get("usign", ""),
            }
            print(f"  → Found Bilibili account: {user['uname']} ({user.get('fans', 0)} fans)", file=sys.stderr)
            all_results.append(info)

            time.sleep(2)
            videos = get_bilibili_user_videos(user["mid"])
            all_results.extend(videos)
        else:
            print("  → No matching account found", file=sys.stderr)

    # Regular search
    for i, source in enumerate(sources):
        if i > 0 or (args.detect_account and all_results):
            delay = RATE_LIMITS.get(source, 3)
            print(f"Waiting {delay}s before {source}...", file=sys.stderr)
            time.sleep(delay)
        results = SEARCH_FNS[source](args.query, args.limit)
        all_results.extend(results)

    print(f"\nTotal: {len(all_results)} results", file=sys.stderr)
    json.dump(all_results, sys.stdout, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
