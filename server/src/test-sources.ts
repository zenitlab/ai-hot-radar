/**
 * 逐一测试每个搜索源的可用性
 * 运行方式: npx ts-node src/test-sources.ts
 */
import 'reflect-metadata';
import dotenv from 'dotenv';
dotenv.config();

import { TwitterService } from './services/twitter.service';
import { SearchService } from './services/search.service';
import { ChinaSearchService } from './services/china-search.service';

const _twitter = new TwitterService();
const _search = new SearchService();
const _china = new ChinaSearchService();
const searchTwitter = _twitter.searchTwitter.bind(_twitter);
const searchBing = _search.searchBing.bind(_search);
const searchHackerNews = _search.searchHackerNews.bind(_search);
const searchSogou = _china.searchSogou.bind(_china);
const searchBilibili = _china.searchBilibili.bind(_china);
const searchWeibo = _china.searchWeibo.bind(_china);

const TEST_QUERY = 'Codex';

async function testSource(name: string, fn: () => Promise<any[]>) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Testing: ${name}`);
  console.log(`${'='.repeat(50)}`);
  try {
    const start = Date.now();
    const results = await fn();
    const elapsed = Date.now() - start;
    console.log(`✅ ${name}: ${results.length} results (${elapsed}ms)`);
    if (results.length > 0) {
      // 打印前 3 条
      results.slice(0, 3).forEach((r, i) => {
        console.log(`  [${i + 1}] ${r.title?.slice(0, 60)}`);
        console.log(`      URL: ${r.url?.slice(0, 80)}`);
        console.log(`      Source: ${r.source}, Published: ${r.publishedAt || 'N/A'}`);
      });
    }
    return { name, success: true, count: results.length, elapsed };
  } catch (error) {
    console.log(`❌ ${name}: ERROR - ${error instanceof Error ? error.message : error}`);
    return { name, success: false, count: 0, elapsed: 0 };
  }
}

async function main() {
  console.log(`\n🔍 Testing all search sources with query: "${TEST_QUERY}"\n`);

  const results = [];

  results.push(await testSource('Twitter', () => searchTwitter(TEST_QUERY)));
  results.push(await testSource('Bing', () => searchBing(TEST_QUERY)));
  results.push(await testSource('HackerNews', () => searchHackerNews(TEST_QUERY)));
  results.push(await testSource('Sogou', () => searchSogou(TEST_QUERY)));
  results.push(await testSource('Bilibili', () => searchBilibili(TEST_QUERY)));
  results.push(await testSource('Weibo', () => searchWeibo(TEST_QUERY)));

  console.log(`\n${'='.repeat(50)}`);
  console.log('SUMMARY');
  console.log(`${'='.repeat(50)}`);
  for (const r of results) {
    const status = r.success ? '✅' : '❌';
    console.log(`${status} ${r.name.padEnd(15)} ${String(r.count).padStart(3)} results  (${r.elapsed}ms)`);
  }
}

main().catch(console.error);
