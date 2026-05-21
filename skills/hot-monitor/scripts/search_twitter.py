#!/usr/bin/env python3
"""
Twitter/X search via twitterapi.io.
Requires TWITTER_API_KEY env var. Outputs JSON array to stdout.

Usage:
    python search_twitter.py "AI programming"
    python search_twitter.py "GPT-5" --limit 10
    python search_twitter.py --trends
    python search_twitter.py --user OpenAI
"""

import argparse
import json
import os
import re
import sys
from datetime import datetime, timezone, timedelta

try:
    import requests
except ImportError:
    print("Error: Install dependencies first: pip install requests", file=sys.stderr)
    sys.exit(1)

TWITTER_API_BASE = "https://api.twitterapi.io"

# Quality filter thresholds
MIN_LIKES = 10
MIN_RETWEETS = 5
MIN_VIEWS = 500
MIN_FOLLOWERS = 100


def get_api_key():
    key = os.environ.get("TWITTER_API_KEY")
    if not key:
        print("Error: TWITTER_API_KEY environment variable not set", file=sys.stderr)
        print("Get a key from https://twitterapi.io", file=sys.stderr)
        sys.exit(1)
    return key


def api_request(endpoint, params=None):
    """Make authenticated request to twitterapi.io."""
    url = f"{TWITTER_API_BASE}{endpoint}"
    resp = requests.get(
        url,
        params=params or {},
        headers={
            "X-API-Key": get_api_key(),
            "Content-Type": "application/json",
        },
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


def format_since_date(days_ago):
    d = datetime.now(timezone.utc) - timedelta(days=days_ago)
    return d.strftime("%Y-%m-%d")


def build_query(keyword, query_type):
    """Build advanced search query."""
    parts = [keyword, "-filter:retweets", "-filter:replies"]
    days_ago = 7 if query_type == "Top" else 3
    parts.append(f"since:{format_since_date(days_ago)}")
    if query_type == "Top":
        parts.append("min_faves:10")
    return " ".join(parts)


def fetch_page(query, query_type, cursor=None):
    """Fetch one page of tweet search results."""
    params = {"query": query, "queryType": query_type}
    if cursor:
        params["cursor"] = cursor
    data = api_request("/twitter/tweet/advanced_search", params)
    tweets = data.get("tweets", [])
    if not isinstance(tweets, list):
        tweets = []
    next_cursor = data.get("next_cursor") if data.get("has_next_page") else None
    return tweets, next_cursor


def quality_filter(tweets):
    """Filter and rank tweets by quality metrics."""
    filtered = []
    for t in tweets:
        # Skip replies
        if t.get("type", "").lower().find("reply") >= 0:
            continue
        if re.match(r"^@\w+\s", t.get("text", "").strip()):
            continue

        author = t.get("author", {})
        factor = 0.5 if author.get("isBlueVerified") else 1.0

        if t.get("likeCount", 0) < MIN_LIKES * factor:
            continue
        if t.get("retweetCount", 0) < MIN_RETWEETS * factor:
            continue
        if t.get("viewCount", 0) < MIN_VIEWS * factor:
            continue
        if author.get("followers", 0) < MIN_FOLLOWERS * factor:
            continue

        filtered.append(t)

    # Sort by quality score
    def score(t):
        s = t.get("likeCount", 0) * 2 + t.get("retweetCount", 0) * 3 + t.get("viewCount", 0) / 100
        if t.get("author", {}).get("isBlueVerified"):
            s += 50
        return s

    filtered.sort(key=score, reverse=True)
    return filtered


def tweet_to_result(tweet):
    """Convert raw tweet to unified result format."""
    author = tweet.get("author", {})
    return {
        "title": tweet.get("text", "")[:100],
        "content": tweet.get("text", ""),
        "url": tweet.get("url", ""),
        "source": "twitter",
        "sourceId": tweet.get("id"),
        "publishedAt": tweet.get("createdAt"),
        "viewCount": tweet.get("viewCount", 0),
        "likeCount": tweet.get("likeCount", 0),
        "retweetCount": tweet.get("retweetCount", 0),
        "replyCount": tweet.get("replyCount", 0),
        "quoteCount": tweet.get("quoteCount", 0),
        "author": {
            "name": author.get("name", ""),
            "username": author.get("userName", ""),
            "avatar": author.get("profilePicture", ""),
            "followers": author.get("followers", 0),
            "verified": author.get("isBlueVerified", False),
        },
    }


def search_twitter(query, limit=20):
    """Full search: Top (2 pages) + Latest (1 page), deduplicated and quality-filtered."""
    top_query = build_query(query, "Top")
    latest_query = build_query(query, "Latest")
    print(f"Top query: {top_query}", file=sys.stderr)
    print(f"Latest query: {latest_query}", file=sys.stderr)

    all_tweets = []
    seen_ids = set()

    def add_tweets(tweets):
        for t in tweets:
            tid = t.get("id")
            if tid and tid not in seen_ids:
                seen_ids.add(tid)
                all_tweets.append(t)

    # Page 1: Top + Latest in sequence
    try:
        top1, top_cursor = fetch_page(top_query, "Top")
        add_tweets(top1)
        print(f"Top page 1: {len(top1)} tweets", file=sys.stderr)
    except Exception as e:
        print(f"Top page 1 error: {e}", file=sys.stderr)
        top_cursor = None

    try:
        latest1, _ = fetch_page(latest_query, "Latest")
        add_tweets(latest1)
        print(f"Latest page 1: {len(latest1)} tweets", file=sys.stderr)
    except Exception as e:
        print(f"Latest page 1 error: {e}", file=sys.stderr)

    # Page 2: Top only (more hot content)
    if top_cursor:
        try:
            top2, _ = fetch_page(top_query, "Top", top_cursor)
            add_tweets(top2)
            print(f"Top page 2: {len(top2)} tweets", file=sys.stderr)
        except Exception as e:
            print(f"Top page 2 error: {e}", file=sys.stderr)

    print(f"Unique tweets: {len(all_tweets)}", file=sys.stderr)

    # Quality filter
    quality = quality_filter(all_tweets)
    print(f"After quality filter: {len(quality)}", file=sys.stderr)

    results = [tweet_to_result(t) for t in quality[:limit]]
    return results


def get_trends():
    """Get worldwide Twitter trends."""
    data = api_request("/twitter/trends", {"woeid": "1"})
    return data.get("trends", [])


def get_user_tweets(username):
    """Get a user's latest tweets."""
    data = api_request("/twitter/user/last_tweets", {"userName": username})
    tweets = data.get("tweets", [])
    if not isinstance(tweets, list):
        return []
    return [tweet_to_result(t) for t in tweets]


def main():
    parser = argparse.ArgumentParser(description="Twitter search via twitterapi.io")
    parser.add_argument("query", nargs="?", help="Search query")
    parser.add_argument("--limit", type=int, default=20, help="Max results (default: 20)")
    parser.add_argument("--trends", action="store_true", help="Get worldwide trending topics")
    parser.add_argument("--user", help="Get latest tweets from a specific user")
    args = parser.parse_args()

    if args.trends:
        trends = get_trends()
        json.dump(trends, sys.stdout, ensure_ascii=False, indent=2)
    elif args.user:
        results = get_user_tweets(args.user)
        json.dump(results, sys.stdout, ensure_ascii=False, indent=2)
    elif args.query:
        results = search_twitter(args.query, args.limit)
        json.dump(results, sys.stdout, ensure_ascii=False, indent=2)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
