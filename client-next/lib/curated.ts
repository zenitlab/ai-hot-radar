/** Shared by the 精选 page (server) and its feed (client). */

/** Items per request. The list covers the last 7 days, newest first. */
export const CURATED_PAGE_SIZE = 40;

/** Today's Beijing calendar date, YYYY-MM-DD. */
export const beijingToday = (now = Date.now()) => new Date(now + 8 * 3600_000).toISOString().slice(0, 10);
