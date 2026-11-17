import { describe, it, expect } from 'vitest';
import {
  detectCharset,
  extractArticleText,
  isBlockedAddress,
  isSafeRedirect,
  robotsAllows,
  shouldFetchArticle,
  unwrapTrackingUrl,
} from '../utils/article-extract.js';

const para = (s: string) => `<p>${s.repeat(4)}</p>`;

describe('shouldFetchArticle', () => {
  it('fetches headline-only items on ordinary article hosts', () => {
    expect(shouldFetchArticle('https://techcrunch.com/2026/11/16/x/', 'One line')).toBe(true);
  });

  it('skips items that already have enough text', () => {
    expect(shouldFetchArticle('https://techcrunch.com/a', 'x'.repeat(400))).toBe(false);
  });

  it('skips social, video, redirect and file URLs', () => {
    for (const url of [
      'https://x.com/OpenAI/status/1', 'https://www.reddit.com/r/x', 'https://www.bilibili.com/video/BV1',
      'https://news.google.com/rss/articles/abc', 'https://arxiv.org/abs/2611.1', 'https://example.com/a.pdf',
      'https://openai.com/', 'https://openai.com',
    ]) expect(shouldFetchArticle(url, '')).toBe(false);
  });

  it('skips IP hosts, odd ports and non-http schemes', () => {
    expect(shouldFetchArticle('http://127.0.0.1/a', '')).toBe(false);
    expect(shouldFetchArticle('http://100.100.100.200/latest/meta-data', '')).toBe(false);
    expect(shouldFetchArticle('https://example.com:8443/a', '')).toBe(false);
    expect(shouldFetchArticle('file:///etc/passwd', '')).toBe(false);
    expect(shouldFetchArticle(undefined, '')).toBe(false);
  });
});

describe('unwrapTrackingUrl', () => {
  it('decodes the article URL from a Bing click-tracking link', () => {
    const bing = 'https://www.bing.com/ck/a?!&&p=abc&ptn=3&ver=2&hsh=4&u=a1aHR0cHM6Ly9za2lsbGh1Yi5qcC9ibG9ncy80MzQ&ntb=1';
    expect(unwrapTrackingUrl(bing)).toBe('https://skillhub.jp/blogs/434');
  });

  it('leaves other URLs alone, including undecodable Bing links', () => {
    expect(unwrapTrackingUrl('https://techcrunch.com/a')).toBe('https://techcrunch.com/a');
    expect(unwrapTrackingUrl('https://www.bing.com/ck/a?u=zz')).toBe('https://www.bing.com/ck/a?u=zz');
    expect(shouldFetchArticle('https://www.bing.com/search?q=ai', '')).toBe(false);
  });
});

describe('isBlockedAddress', () => {
  it('blocks internal, metadata and v4-mapped addresses', () => {
    for (const ip of ['127.0.0.1', '10.0.0.5', '172.20.1.1', '192.168.1.1', '169.254.169.254', '100.100.100.200', '0.0.0.0', '::1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1'])
      expect(isBlockedAddress(ip), ip).toBe(true);
  });

  it('allows public addresses and proxy fake-IP answers', () => {
    for (const ip of ['104.16.1.1', '8.8.8.8', '2606:4700::1111', '198.18.0.57']) expect(isBlockedAddress(ip), ip).toBe(false);
  });
});

describe('isSafeRedirect', () => {
  it('refuses redirects to internal IP literals, odd ports and other schemes', () => {
    expect(isSafeRedirect('http:', '127.0.0.1', '')).toBe(false);
    expect(isSafeRedirect('http:', '100.100.100.200', '80')).toBe(false);
    expect(isSafeRedirect('http:', '[::1]', '')).toBe(false);
    expect(isSafeRedirect('https:', 'example.com', '8443')).toBe(false);
    expect(isSafeRedirect('ftp:', 'example.com', '')).toBe(false);
  });

  it('follows ordinary redirects', () => {
    expect(isSafeRedirect('https:', 'www.example.com', '')).toBe(true);
    expect(isSafeRedirect('https:', 'www.example.com', '443')).toBe(true);
  });
});

describe('extractArticleText', () => {
  it('takes the article body and drops navigation, footer and comments', () => {
    const html = `<html><body>
      <nav>${para('Home About Pricing ')}</nav>
      <article><h2>Heading</h2>${para('OpenAI released a new model today. ')}${para('It is faster and cheaper than before. ')}</article>
      <div class="comments">${para('Great post! ')}</div>
      <footer>${para('Copyright ')}</footer>
    </body></html>`;
    const text = extractArticleText(html);
    expect(text).toContain('OpenAI released a new model today.');
    expect(text).toContain('Heading');
    expect(text).not.toContain('Home About');
    expect(text).not.toContain('Great post');
    expect(text).not.toContain('Copyright');
  });

  it('falls back to all paragraphs when there is no article container', () => {
    const html = `<body><div>${para('Plain page paragraph with real content. ')}${para('Second paragraph. ')}</div></body>`;
    expect(extractArticleText(html)).toContain('Plain page paragraph');
  });

  it('falls back to a long meta description, else returns nothing', () => {
    const long = 'A meta description long enough to stand in for the article text. '.repeat(4);
    expect(extractArticleText(`<head><meta property="og:description" content="${long}"></head><body><p>hi</p></body>`)).toBe(long.trim());
    expect(extractArticleText('<head><meta name="description" content="short"></head><body><p>Login</p></body>')).toBe('');
  });

  it('caps the text length at a line boundary', () => {
    const html = `<article>${Array.from({ length: 80 }, (_, i) => `<p>Paragraph ${i} ${'word '.repeat(12)}</p>`).join('')}</article>`;
    const text = extractArticleText(html);
    expect(text.length).toBeLessThanOrEqual(3000);
    expect(text.endsWith(' ')).toBe(false);
  });
});

describe('detectCharset', () => {
  it('reads the header first, then the meta tag, and maps gb2312 to gbk', () => {
    expect(detectCharset('text/html; charset=GB2312', '')).toBe('gbk');
    expect(detectCharset('text/html', '<meta charset="big5">')).toBe('big5');
    expect(detectCharset(undefined, '')).toBe('utf-8');
  });
});

describe('robotsAllows', () => {
  const txt = [
    'User-agent: *',
    'Disallow: /private/',
    'Allow: /private/public',
    'Disallow: /*.json$',
    '',
    'User-agent: GPTBot',
    'Disallow: /',
  ].join('\n');

  it('applies the * group with longest-match precedence', () => {
    expect(robotsAllows(txt, 'AIHotRadar', '/blog/post')).toBe(true);
    expect(robotsAllows(txt, 'AIHotRadar', '/private/x')).toBe(false);
    expect(robotsAllows(txt, 'AIHotRadar', '/private/public/x')).toBe(true);
    expect(robotsAllows(txt, 'AIHotRadar', '/data.json')).toBe(false);
    expect(robotsAllows(txt, 'AIHotRadar', '/data.json?x=1')).toBe(true);
  });

  it('uses a group naming our agent over *', () => {
    expect(robotsAllows('User-agent: *\nAllow: /\n\nUser-agent: AIHotRadar\nDisallow: /', 'AIHotRadar', '/a')).toBe(false);
  });

  it('allows everything when there are no rules', () => {
    expect(robotsAllows('', 'AIHotRadar', '/a')).toBe(true);
  });
});
