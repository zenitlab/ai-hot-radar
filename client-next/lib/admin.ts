import { useUser } from './auth';

/**
 * Admin mode: signed in as the ADMIN_EMAIL account (server/src/auth). The
 * backend checks every write itself; this only decides which controls to show.
 */
export function useIsAdmin(): boolean {
  return useUser()?.isAdmin ?? false;
}
