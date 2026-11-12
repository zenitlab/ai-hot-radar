# AI Hot Radar — notes for Claude

## Baidu site verification (do not remove)

aihotradar.com is verified on 百度搜索资源平台 with:

```html
<meta name="baidu-site-verification" content="codeva-scasn4IZS3" />
```

It lives in `client-next/app/layout.tsx` as `metadata.verification.other`, so every Next.js page inherits it. If it disappears, Baidu drops the verified status, and with it sitemap submission and the 普通收录 API push (`BAIDU_PUSH_TOKEN`, used by `server/src/hotspots/discovery.job.ts`).

- When editing metadata, never remove or rename `verification` in the root layout.
- Any new HTML entry point that doesn't go through the root layout must include the same tag: static `.html` in `client-next/public/`, a layout that renders its own `<html>`/`<head>`, the legacy `client/index.html` if it's revived, or error pages served outside Next.
- After layout or metadata changes, check with `curl -s <url> | grep baidu-site-verification`.
