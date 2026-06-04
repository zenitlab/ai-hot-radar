/**
 * Merge duplicate hotspots — fix historical clusters where multiple items
 * are marked isClusterMain=true due to concurrent insertion race.
 *
 * Strategy:
 *   1. Find clusters with 2+ mains (same clusterKey, all isClusterMain=true)
 *   2. Pick the most authoritative as the real main (via getAuthorityScore)
 *   3. Demote the rest (set isClusterMain=false)
 *
 * Usage:
 *   npx ts-node src/merge-duplicate-hotspots.ts         # dry-run (preview only)
 *   npx ts-node src/merge-duplicate-hotspots.ts --apply # actually write DB
 */

import 'reflect-metadata';
import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { getAuthorityScore } from './utils/authority';
import type { SourceTier } from './rss-feeds/feeds.config';

const prisma = new PrismaClient();

interface DuplicateGroup {
  clusterKey: string;
  mains: Array<{
    id: string;
    title: string;
    source: string;
    sourceTier: string | null;
    authority: number;
    createdAt: Date;
  }>;
}

async function findDuplicateClusters(): Promise<DuplicateGroup[]> {
  console.log('🔍 Scanning for clusters with multiple mains...\n');

  // Get all mains grouped by clusterKey
  const allMains = await prisma.hotspot.findMany({
    where: {
      isClusterMain: true,
      clusterKey: { not: null },
    },
    select: {
      id: true,
      title: true,
      source: true,
      sourceTier: true,
      clusterKey: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  // Group by clusterKey
  const grouped = new Map<string, typeof allMains>();
  for (const item of allMains) {
    if (!item.clusterKey) continue;
    const list = grouped.get(item.clusterKey) || [];
    list.push(item);
    grouped.set(item.clusterKey, list);
  }

  // Keep only groups with 2+ mains (the duplicates)
  const duplicates: DuplicateGroup[] = [];
  for (const [clusterKey, mains] of grouped.entries()) {
    if (mains.length < 2) continue;

    // Compute authority for each
    const withAuthority = mains.map(m => ({
      id: m.id,
      title: m.title,
      source: m.source,
      sourceTier: m.sourceTier,
      authority: getAuthorityScore(m.source, m.sourceTier as SourceTier | null),
      createdAt: m.createdAt,
    }));

    duplicates.push({ clusterKey, mains: withAuthority });
  }

  return duplicates.sort((a, b) => b.mains.length - a.mains.length);
}

async function mergeDuplicates(dryRun: boolean) {
  const duplicates = await findDuplicateClusters();

  if (duplicates.length === 0) {
    console.log('✅ No duplicate clusters found. All clean!\n');
    await prisma.$disconnect();
    return;
  }

  console.log(`📊 Found ${duplicates.length} clusters with multiple mains\n`);
  console.log(`Total duplicate main cards: ${duplicates.reduce((sum, g) => sum + g.mains.length, 0)}\n`);
  console.log('─'.repeat(80));

  let totalDemotions = 0;

  for (const group of duplicates) {
    // Sort by authority desc, then createdAt asc (earlier wins ties)
    const sorted = [...group.mains].sort((a, b) => {
      if (a.authority !== b.authority) return b.authority - a.authority;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    const winner = sorted[0];
    const losers = sorted.slice(1);

    console.log(`\nCluster: ${group.clusterKey}`);
    console.log(`  ✅ KEEP as main (authority ${winner.authority}):`);
    console.log(`     [${winner.source}] ${winner.title.slice(0, 60)}...`);
    console.log(`  ❌ DEMOTE to non-main (${losers.length} cards):`);
    for (const loser of losers) {
      console.log(`     [${loser.source}] authority ${loser.authority}: ${loser.title.slice(0, 55)}...`);
    }

    if (!dryRun) {
      await prisma.hotspot.updateMany({
        where: { id: { in: losers.map(l => l.id) } },
        data: { isClusterMain: false },
      });
      console.log(`  💾 Demoted ${losers.length} cards in DB`);
    }

    totalDemotions += losers.length;
  }

  console.log('\n' + '─'.repeat(80));
  console.log(`\n📈 Summary: ${totalDemotions} cards will be demoted across ${duplicates.length} clusters`);

  if (dryRun) {
    console.log('\n⚠️  DRY-RUN MODE: No changes written to database.');
    console.log('   Run with --apply to actually merge duplicates.\n');
  } else {
    console.log('\n✅ Merge complete! Database updated.\n');
  }

  await prisma.$disconnect();
}

// Parse CLI args
const args = process.argv.slice(2);
const dryRun = !args.includes('--apply');

mergeDuplicates(dryRun).catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
