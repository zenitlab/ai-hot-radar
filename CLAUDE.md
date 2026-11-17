# AI Hot Radar — notes for Claude

## Baidu site verification (do not remove)

aihotradar.com is verified on 百度搜索资源平台 with:

```html
<meta name="baidu-site-verification" content="codeva-scasn4IZS3" />
```

It lives in `client-next/app/layout.tsx` as `metadata.verification.other`, so every Next.js page inherits it. If it disappears, Baidu drops the verified status, and with it sitemap submission and the 普通收录 API push (`BAIDU_PUSH_TOKEN`, used by `server/src/hotspots/discovery.job.ts`).

Baidu file verification is also in place: `client-next/public/baidu_verify_codeva-scasn4IZS3.html` (content `80b95b950191c544113102051d02b1c7`), served at `https://aihotradar.com/baidu_verify_codeva-scasn4IZS3.html`. Never delete or rename it, and keep it reachable without redirects or auth.

- When editing metadata, never remove or rename `verification` in the root layout.
- Any new HTML entry point that doesn't go through the root layout must include the same tag: static `.html` in `client-next/public/`, a layout that renders its own `<html>`/`<head>`, the legacy `client/index.html` if it's revived, or error pages served outside Next.
- After layout or metadata changes, check with `curl -s <url> | grep baidu-site-verification`.

## Reader-facing text goes through the writing rules

Every prompt that produces text readers see (Chinese title, summary, recommend reason, event overview, digest) must include the rule blocks from `server/src/utils/writing-rules.ts`, and its output must pass that file's guards before it is stored.

- Prompts: `UNTRUSTED_NOTE` always (feed text is attacker-controlled), plus `ANTI_HALLUCINATION_RULES` and, where they apply, `SELF_CONTAINED_TITLE_RULES` / `ANSWER_FIRST_SUMMARY_RULES`.
- Guards: `acceptTitleZh`, `cleanSummary`, `stripUnsupportedYears`, `groundSummary`, `unsupportedTerms`. They exist because live runs with the production model (agnes-3.0-flash) ignored the prompt rules on thin sources: it padded summaries with invented reactions and wrote sentences about the reporting itself. Don't remove a guard because the prompt already says the same thing.
- `Hotspot.titleZh` is nullable (rejected or pre-existing rows). The frontend must show titles through `displayTitle()` in `client-next/lib/utils.ts`, never `item.title` directly.
- Event overviews (`StoryDigest`, written by `server/src/hotspots/story-digest.job.ts`) cost one AI call each and are capped by `STORY_DIGEST_PER_RUN`. The free LLM tier allows roughly 1000 calls a day, so anything that adds a call per item needs the user's agreement first.

## Article fetching (server/src/services/article-fetch.service.ts)

Thin feed items (< 300 chars) get their article fetched before scoring. Feed URLs are attacker-controlled, so keep both guards when touching it: `safeLookup` refuses private/metadata addresses on every connection, and `isSafeRedirect` covers redirects to IP literals (Node skips DNS for those). `198.18.0.0/15` is deliberately allowed because local Clash TUN answers DNS from it. Fetched text is for the model only: don't store it in `Hotspot.content` or show it on the site.
