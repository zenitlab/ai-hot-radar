import * as cheerio from 'cheerio';
import { isIP } from 'node:net';

/**
 * Pure helpers for fetching article text when a feed gives only a headline
 * (borrowed from AIHOT's "补取正文" step). The network side lives in
 * services/article-fetch.service.ts.
 *
 * The text is only read by the scoring model, never shown on the site, so
 * extraction aims for "the paragraphs a reader would read" rather than a
 * faithful copy of the page.
 */

/** Feed items shorter than this are a headline plus a line; worth fetching. */
export const FETCH_BELOW_CHARS = 300;
/** Characters of article text kept for the model. */
export const MAX_ARTICLE_CHARS = 3000;
/** Extracted text shorter than this is navigation or a paywall stub, not an article. */
const MIN_ARTICLE_CHARS = 200;

/**
 * Hosts whose pages aren't articles a plain GET can read: social posts and
 * videos (the feed already carries all the text there is), Google News
 * redirect links (resolved by JavaScript), and sites that block crawlers.
 */
const SKIP_HOSTS = [
  'x.com', 'twitter.com', 'reddit.com', 'bilibili.com', 'b23.tv', 'youtube.com', 'youtu.be',
  'news.google.com', 'weibo.com', 'xueqiu.com', 'v2ex.com', 'news.ycombinator.com',
  'arxiv.org', // feed abstracts are already the useful text
  'bing.com', // search pages; tracking links are unwrapped first (unwrapTrackingUrl)
];

/** File types that aren't HTML articles. */
const SKIP_EXTENSIONS = /\.(?:pdf|docx?|pptx?|xlsx?|zip|gz|tar|mp4|mov|mp3|m4a|png|jpe?g|gif|webp|svg)(?:$|[?#])/iu;

/**
 * The article behind a Bing click-tracking link (`bing.com/ck/a?...&u=a1<base64url>`),
 * which is how most Bing results arrive. Other URLs are returned unchanged.
 */
export function unwrapTrackingUrl(url: string): string {
  try {
    const u = new URL(url);
    if (!/(^|\.)bing\.com$/iu.test(u.hostname) || u.pathname !== '/ck/a') return url;
    const encoded = u.searchParams.get('u');
    if (!encoded?.startsWith('a1')) return url;
    const target = Buffer.from(encoded.slice(2), 'base64url').toString('utf8');
    return /^https?:\/\//iu.test(target) ? target : url;
  } catch {
    return url;
  }
}

export function shouldFetchArticle(url: string | undefined, content: string): boolean {
  if (!url || content.trim().length >= FETCH_BELOW_CHARS) return false;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
  if (u.port && u.port !== '80' && u.port !== '443') return false;
  if (SKIP_EXTENSIONS.test(u.pathname)) return false;
  // A site's front page is a list of links, not the article a search result is about.
  if ((u.pathname === '/' || u.pathname === '') && !u.search) return false;
  const host = u.hostname.toLowerCase();
  if (isIP(host)) return false; // real articles live on named hosts
  return !SKIP_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
}

/**
 * True for addresses a fetch must never reach: loopback, private ranges,
 * link-local, carrier-grade NAT (Aliyun's metadata service is 100.100.100.200),
 * multicast and their IPv6 equivalents. Feed URLs are attacker-controlled, so
 * without this a feed item could point the server at its own internals.
 * 198.18.0.0/15 is deliberately allowed: it is a benchmarking range with no
 * services, and proxies such as Clash hand out fake DNS answers from it.
 */
export function isBlockedAddress(address: string): boolean {
  const v4mapped = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/iu)?.[1];
  const ip = v4mapped ?? address;
  if (isIP(ip) === 4) {
    const [a, b] = ip.split('.').map(Number);
    return (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0)
    );
  }
  if (isIP(ip) === 6) {
    const lower = ip.toLowerCase();
    return (
      lower === '::' || lower === '::1' ||
      lower.startsWith('fc') || lower.startsWith('fd') || // unique local
      lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb') || // link-local
      lower.startsWith('ff') // multicast
    );
  }
  return true; // not an IP at all: refuse rather than guess
}

/**
 * Whether a redirect target is safe to follow. Node connects to an IP literal
 * without a DNS lookup, so the lookup guard never sees `http://127.0.0.1/`;
 * this check covers that case.
 */
export function isSafeRedirect(protocol: string, hostname: string, port: string): boolean {
  if (protocol !== 'https:' && protocol !== 'http:') return false;
  if (port && port !== '80' && port !== '443') return false;
  const host = hostname.replace(/^\[|\]$/gu, '');
  return !isIP(host) || !isBlockedAddress(host);
}

/** Charset from a Content-Type header or the page's own <meta>, defaulting to UTF-8. */
export function detectCharset(contentType: string | undefined, head: string): string {
  const fromHeader = contentType?.match(/charset=["']?([\w-]+)/iu)?.[1];
  const fromMeta = head.match(/<meta[^>]+charset=["']?([\w-]+)/iu)?.[1];
  const charset = (fromHeader || fromMeta || 'utf-8').toLowerCase();
  return charset === 'gb2312' ? 'gbk' : charset;
}

const NOISE = [
  'script', 'style', 'noscript', 'template', 'svg', 'iframe', 'form', 'button', 'nav', 'header', 'footer', 'aside',
  '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]', '[aria-hidden="true"]',
  '.comments', '#comments', '.comment', '.related', '.share', '.social', '.newsletter', '.subscribe',
  '.advert', '.ad', '.ads', '.sidebar', '.breadcrumb', '.cookie',
].join(',');

const CANDIDATES = [
  '[itemprop="articleBody"]', 'article', 'main', '[role="main"]',
  '.post-content', '.entry-content', '.article-content', '.article-body', '.post-body', '.content', '#content',
];

const clean = (s: string) => s.replace(/\s+/gu, ' ').trim();

/** Paragraph-ish text inside one element, in reading order. */
function paragraphsOf($: cheerio.CheerioAPI, root: cheerio.Cheerio<any>): string[] {
  const out: string[] = [];
  root.find('p, h2, h3, li, blockquote, pre').each((_, el) => {
    // A <p> inside an <li> or <blockquote> would be read twice.
    if ($(el).parents('p, li, blockquote').length > 0) return;
    const text = clean($(el).text());
    if (text.length >= 2) out.push(text);
  });
  return out;
}

/**
 * Main article text from an HTML page: the candidate container with the most
 * paragraph text, falling back to the meta description. Returns '' when the
 * page has no usable article (a homepage, a login wall, a JS-only app).
 */
export function extractArticleText(html: string): string {
  const $ = cheerio.load(html);
  const description = clean(
    $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '',
  );
  $(NOISE).remove();

  let best: string[] = [];
  let bestChars = 0;
  for (const selector of CANDIDATES) {
    $(selector).each((_, el) => {
      const paragraphs = paragraphsOf($, $(el));
      const chars = paragraphs.reduce((n, p) => n + p.length, 0);
      if (chars > bestChars) {
        best = paragraphs;
        bestChars = chars;
      }
    });
  }
  // No semantic container: take every paragraph on the page.
  if (bestChars < MIN_ARTICLE_CHARS) {
    const all = paragraphsOf($, $('body'));
    const chars = all.reduce((n, p) => n + p.length, 0);
    if (chars > bestChars) {
      best = all;
      bestChars = chars;
    }
  }

  let text = [...new Set(best)].join('\n');
  if (text.length < MIN_ARTICLE_CHARS) text = description.length >= MIN_ARTICLE_CHARS ? description : '';
  if (text.length > MAX_ARTICLE_CHARS) {
    const cut = text.lastIndexOf('\n', MAX_ARTICLE_CHARS);
    text = text.slice(0, cut > MAX_ARTICLE_CHARS / 2 ? cut : MAX_ARTICLE_CHARS);
  }
  return text;
}

/**
 * Whether robots.txt lets `agent` fetch `path`. Groups for our agent win over
 * `*`; within a group the longest matching rule wins and Allow wins ties, as in
 * RFC 9309. Supports `*` and `$` in rules.
 */
export function robotsAllows(robotsTxt: string, agent: string, path: string): boolean {
  type Rule = { allow: boolean; pattern: string };
  const groups: Array<{ agents: string[]; rules: Rule[] }> = [];
  let current: { agents: string[]; rules: Rule[] } | null = null;
  let lastWasAgent = false;

  for (const raw of robotsTxt.split(/\r?\n/u)) {
    const line = raw.replace(/#.*/u, '').trim();
    const m = line.match(/^([\w-]+)\s*:\s*(.*)$/u);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const value = m[2].trim();
    if (key === 'user-agent') {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if ((key === 'allow' || key === 'disallow') && current) {
      if (value) current.rules.push({ allow: key === 'allow', pattern: value });
      lastWasAgent = false;
    } else {
      lastWasAgent = false;
    }
  }

  const name = agent.toLowerCase();
  const ours = groups.filter((g) => g.agents.some((a) => a !== '*' && name.includes(a)));
  const applicable = ours.length > 0 ? ours : groups.filter((g) => g.agents.includes('*'));
  const rules = applicable.flatMap((g) => g.rules);

  let verdict: Rule | null = null;
  for (const rule of rules) {
    const source = rule.pattern
      .replace(/[.+?^{}()|[\]\\]/gu, '\\$&')
      .replace(/\*/gu, '.*')
      .replace(/\\\$$|\$$/u, '$');
    if (!new RegExp(`^${source}`, 'u').test(path)) continue;
    if (
      !verdict ||
      rule.pattern.length > verdict.pattern.length ||
      (rule.pattern.length === verdict.pattern.length && rule.allow)
    ) {
      verdict = rule;
    }
  }
  return verdict ? verdict.allow : true;
}
