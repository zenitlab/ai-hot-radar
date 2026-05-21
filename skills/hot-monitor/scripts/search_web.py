#!/usr/bin/env python3
"""
International web search: Bing, Google, DuckDuckGo, HackerNews.
No API keys required. Outputs JSON array to stdout.

Usage:
    python search_web.py "AI programming"
    python search_web.py "GPT-5" --sources bing,hackernews
    python search_web.py "AI" --limit 10
"""

import argparse
import json
import random
import sys
import time
import math
from datetime import datetime, timezone, timedelta
from urllib.parse import urlencode, urlparse, parse_qs, unquote

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
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
]

ALL_SOURCES = ["bing", "google", "duckduckgo", "hackernews"]


def get_headers(lang="en"):
    accept_lang = "en-US,en;q=0.5" if lang == "en" else "zh-CN,zh;q=0.9,en;q=0.8"
    return {
        "User-Agent": random.choice(USER_AGENTS),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": accept_lang,
    }


def search_bing(query, limit=20):
    """Search Bing via HTML scraping."""
    try:
        resp = requests.get(
            "https://www.bing.com/search",
            params={"q": query, "count": limit},
            headers=get_headers(),
            timeout=15,
        )
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        results = []
        for item in soup.select("li.b_algo"):
            title_el = item.select_one("h2 a")
            if not title_el:
                continue
            title = title_el.get_text(strip=True)
            url = title_el.get("href", "")
            snippet_el = item.select_one(".b_caption p")
            snippet = snippet_el.get_text(strip=True) if snippet_el else ""
            if title and url and url.startswith("http"):
                results.append({
                    "title": title,
                    "content": snippet,
                    "url": url,
                    "source": "bing",
                })
                if len(results) >= limit:
                    break
        print(f"Bing: {len(results)} results", file=sys.stderr)
        return results
    except Exception as e:
        print(f"Bing error: {e}", file=sys.stderr)
        return []


def search_google(query, limit=20):
    """Search Google via HTML scraping."""
    try:
        resp = requests.get(
            "https://www.google.com/search",
            params={"q": query, "num": limit, "hl": "en"},
            headers=get_headers(),
            timeout=15,
        )
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        results = []
        for item in soup.select("div.g"):
            h3 = item.select_one("h3")
            if not h3:
                continue
            title = h3.get_text(strip=True)
            link_el = item.select_one("a")
            url = link_el.get("href", "") if link_el else ""
            snippet_el = item.select_one(".VwiC3b")
            snippet = snippet_el.get_text(strip=True) if snippet_el else ""
            if title and url and url.startswith("http"):
                results.append({
                    "title": title,
                    "content": snippet,
                    "url": url,
                    "source": "google",
                })
                if len(results) >= limit:
                    break
        print(f"Google: {len(results)} results", file=sys.stderr)
        return results
    except Exception as e:
        print(f"Google error: {e}", file=sys.stderr)
        return []


def search_duckduckgo(query, limit=20):
    """Search DuckDuckGo via HTML version."""
    try:
        resp = requests.get(
            "https://html.duckduckgo.com/html/",
            params={"q": query},
            headers=get_headers(),
            timeout=15,
        )
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        results = []
        for item in soup.select(".result"):
            title_el = item.select_one(".result__title a")
            if not title_el:
                continue
            title = title_el.get_text(strip=True)
            raw_url = title_el.get("href", "")
            snippet_el = item.select_one(".result__snippet")
            snippet = snippet_el.get_text(strip=True) if snippet_el else ""

            # Extract real URL from DuckDuckGo redirect
            url = raw_url
            if "uddg=" in raw_url:
                try:
                    # Handle both //duckduckgo.com/l/?uddg= and ?uddg= formats
                    full_url = raw_url if raw_url.startswith("http") else "https:" + raw_url
                    parsed = urlparse(full_url)
                    params = parse_qs(parsed.query)
                    extracted = unquote(params.get("uddg", [""])[0])
                    # Skip ad redirect URLs (contain duckduckgo.com/y.js)
                    if extracted and "duckduckgo.com/y.js" not in extracted:
                        url = extracted
                    else:
                        continue  # Skip ad results
                except Exception:
                    pass

            if title and url and url.startswith("http"):
                results.append({
                    "title": title,
                    "content": snippet,
                    "url": url,
                    "source": "duckduckgo",
                })
                if len(results) >= limit:
                    break
        print(f"DuckDuckGo: {len(results)} results", file=sys.stderr)
        return results
    except Exception as e:
        print(f"DuckDuckGo error: {e}", file=sys.stderr)
        return []


def search_hackernews(query, limit=20):
    """Search Hacker News via Algolia API (official, free, no key needed)."""
    try:
        one_day_ago = int((datetime.now(timezone.utc) - timedelta(hours=24)).timestamp())
        resp = requests.get(
            "https://hn.algolia.com/api/v1/search",
            params={
                "query": query,
                "tags": "story",
                "hitsPerPage": limit,
                "numericFilters": f"created_at_i>{one_day_ago}",
            },
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        results = []
        for hit in data.get("hits", []):
            if not (hit.get("url") or hit.get("story_text")):
                continue
            url = hit.get("url") or f"https://news.ycombinator.com/item?id={hit['objectID']}"
            results.append({
                "title": hit.get("title", ""),
                "content": hit.get("story_text") or hit.get("title", ""),
                "url": url,
                "source": "hackernews",
                "sourceId": hit.get("objectID"),
                "publishedAt": hit.get("created_at"),
                "score": hit.get("points", 0),
                "commentCount": hit.get("num_comments", 0),
                "author": {
                    "name": hit.get("author", ""),
                    "username": hit.get("author", ""),
                },
            })
            if len(results) >= limit:
                break
        print(f"HackerNews: {len(results)} results", file=sys.stderr)
        return results
    except Exception as e:
        print(f"HackerNews error: {e}", file=sys.stderr)
        return []


def deduplicate(results):
    """Remove duplicate URLs after normalization."""
    seen = set()
    unique = []
    for r in results:
        normalized = r["url"].rstrip("/").replace("http://www.", "https://").replace("https://www.", "https://")
        if normalized not in seen:
            seen.add(normalized)
            unique.append(r)
    return unique


SEARCH_FNS = {
    "bing": search_bing,
    "google": search_google,
    "duckduckgo": search_duckduckgo,
    "hackernews": search_hackernews,
}

RATE_LIMITS = {
    "bing": 5,
    "google": 10,
    "duckduckgo": 3,
    "hackernews": 1,
}


def main():
    parser = argparse.ArgumentParser(description="International web search aggregator")
    parser.add_argument("query", help="Search query")
    parser.add_argument("--sources", default=",".join(ALL_SOURCES),
                        help=f"Comma-separated sources (default: {','.join(ALL_SOURCES)})")
    parser.add_argument("--limit", type=int, default=20, help="Max results per source (default: 20)")
    args = parser.parse_args()

    sources = [s.strip().lower() for s in args.sources.split(",") if s.strip()]
    invalid = [s for s in sources if s not in SEARCH_FNS]
    if invalid:
        print(f"Unknown sources: {invalid}. Available: {ALL_SOURCES}", file=sys.stderr)
        sys.exit(1)

    all_results = []
    for i, source in enumerate(sources):
        if i > 0:
            delay = RATE_LIMITS.get(source, 3)
            print(f"Waiting {delay}s before {source}...", file=sys.stderr)
            time.sleep(delay)
        results = SEARCH_FNS[source](args.query, args.limit)
        all_results.extend(results)

    unique = deduplicate(all_results)
    print(f"\nTotal: {len(all_results)} → {len(unique)} after dedup", file=sys.stderr)
    json.dump(unique, sys.stdout, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
