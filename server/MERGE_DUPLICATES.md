# 历史重复卡合并脚本

修复历史数据中**同一 cluster 有多张 `isClusterMain=true` 卡**的问题(v0.7.21 之前因并发入库各自成 main)。

## 原理

1. 找出所有 `clusterKey` 相同但有 2+ 张 `isClusterMain=true` 的 cluster
2. 按 `getAuthorityScore(source, tier)` + `createdAt` 排序,选权威度最高的为真正 main
3. 其余降级为 `isClusterMain=false`(不删除,保留多源可追溯)

## 用法

**Dry-run(默认,只预览不写库):**
```bash
cd server
npx ts-node src/merge-duplicate-hotspots.ts
```

输出示例:
```
📊 Found 3 clusters with multiple mains

Cluster: a1b2c3d4e5f6g7h8
  ✅ KEEP as main (authority 100):
     [rss_openai] OpenAI launches GPT-5 with breakthrough reasoning...
  ❌ DEMOTE to non-main (2 cards):
     [bing] authority 50: OpenAI launches GPT-5 with breakthrough...
     [twitter] authority 45: GPT-5 is here! New reasoning model from...

📈 Summary: 5 cards will be demoted across 3 clusters

⚠️  DRY-RUN MODE: No changes written to database.
   Run with --apply to actually merge duplicates.
```

**实际执行(写库):**
```bash
npx ts-node src/merge-duplicate-hotspots.ts --apply
```

## 幂等性

可重复跑,已正确的 cluster 不会再动。每次只改那些确实重复的。

## 注意

- 需要 Prisma 能连上数据库(读 `.env` 的 `DATABASE_URL`)
- 生产库执行前**先备份**,或先 dry-run 确认输出合理
- 不删除任何卡,只改 `isClusterMain` 标志
