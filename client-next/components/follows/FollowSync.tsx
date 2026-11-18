'use client';
import { useEffect, useRef } from 'react';
import { saveFollows, useUser } from '@/lib/auth';
import { MAX_FOLLOWS, setFollows, useFollows } from '@/lib/follows';

const same = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

/**
 * Keeps this browser's followed topics and the signed-in account in step.
 * On sign-in the two lists are merged (account first), so follows made before
 * signing up aren't lost; after that every change is saved to the account.
 * Renders nothing.
 */
export function FollowSync() {
  const user = useUser();
  const local = useFollows();
  const synced = useRef<{ userId: string; list: string[] } | null>(null);

  // First sight of this account: merge, store locally, save if it grew.
  useEffect(() => {
    if (!user) {
      synced.current = null;
      return;
    }
    if (synced.current?.userId === user.id) return;
    const merged = [...new Set([...user.follows, ...local])].slice(0, MAX_FOLLOWS);
    synced.current = { userId: user.id, list: merged };
    if (!same(merged, local)) setFollows(merged);
    if (!same(merged, user.follows)) void saveFollows(merged).catch(() => {});
    // Runs once per account; later local changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Later changes in this browser: save them, shortly after the last click.
  useEffect(() => {
    const cur = synced.current;
    if (!user || !cur || cur.userId !== user.id || same(cur.list, local)) return;
    const t = setTimeout(() => {
      cur.list = local;
      void saveFollows(local).catch(() => {});
    }, 600);
    return () => clearTimeout(t);
  }, [local, user]);

  return null;
}
