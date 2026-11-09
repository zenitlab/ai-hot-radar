import { describe, it, expect } from 'vitest';
import { computeEventHeat, participantOf, type HeatItem } from '../utils/event-heat.js';

const H = 3600_000;
const NOW = 100 * H;
let n = 0;
const item = (clusterKey: string, source: string, hoursAgo: number, author?: string): HeatItem => ({
  id: `i${n++}`,
  clusterKey,
  source,
  authorUsername: author ?? null,
  publishedAt: new Date(NOW - hoursAgo * H),
  createdAt: new Date(NOW - hoursAgo * H),
});

describe('participantOf', () => {
  it('splits community sources by author but not feeds', () => {
    expect(participantOf(item('k', 'hackernews', 0, 'Alice'))).toBe('hackernews:alice');
    expect(participantOf(item('k', 'rss_openai', 0, 'Bob'))).toBe('rss_openai');
  });
});

describe('computeEventHeat', () => {
  it('requires at least two independent participants', () => {
    const events = computeEventHeat([item('a', 'rss_x', 1), item('a', 'rss_x', 2)], NOW);
    expect(events).toHaveLength(0);
  });

  it('counts each participant once and decays with a 24h half-life', () => {
    const events = computeEventHeat([
      item('a', 'rss_x', 0), item('a', 'rss_x', 1), // same participant, latest counts
      item('a', 'rss_y', 24),
    ], NOW);
    expect(events).toHaveLength(1);
    expect(events[0].heat).toBeCloseTo(1.5, 2);
    expect(events[0].participants.sort()).toEqual(['rss_x', 'rss_y']);
  });

  it('ignores items outside the 48h window and items without a cluster', () => {
    const events = computeEventHeat([
      item('a', 'rss_x', 1), item('a', 'rss_y', 60),
      { ...item('b', 'rss_x', 1), clusterKey: null }, item('b', 'rss_y', 1),
    ], NOW);
    expect(events).toHaveLength(0);
  });

  it('ranks more corroborated events higher', () => {
    const events = computeEventHeat([
      item('big', 'rss_a', 2), item('big', 'rss_b', 2), item('big', 'rss_c', 2),
      item('small', 'rss_a', 2), item('small', 'rss_b', 2),
    ], NOW);
    expect(events.map(e => e.clusterKey)).toEqual(['big', 'small']);
  });

  it('marks events as new or rising against six hours ago', () => {
    const fresh = computeEventHeat([item('a', 'rss_x', 1), item('a', 'rss_y', 2)], NOW);
    expect(fresh[0].trend).toBe('new');
    const rising = computeEventHeat([
      item('a', 'rss_x', 10), item('a', 'rss_y', 10), item('a', 'rss_z', 1),
    ], NOW);
    expect(rising[0].trend).toBe('rising');
  });
});
