/**
 * The heat scale (DESIGN.md · 颜色): five steps from cool to hot, used only to
 * show how hot a story is or how many outlets carry it.
 */

/** Heat index on the board's scale: each participant counts up to 10, halving every 24 hours. */
export const heatIndex = (heat: number) => Math.round(heat * 10);

const HEAT_STEPS = [10, 20, 40, 70];

/** CSS colour for a heat index (heat × 10). */
export function heatColor(index: number): string {
  return `var(--heat-${1 + HEAT_STEPS.filter((s) => index >= s).length})`;
}

/** CSS colour for "N 家来源"; one source has no colour (nothing to signal). */
export function sourceCountColor(n: number): string | null {
  if (n <= 1) return null;
  return `var(--heat-${Math.min(5, n)})`;
}

export const HEAT_LEGEND = [1, 2, 3, 4, 5].map((i) => `var(--heat-${i})`);
