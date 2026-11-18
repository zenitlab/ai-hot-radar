/**
 * Resolved value of a CSS variable on <html>, for canvas/SVG libraries
 * (ECharts) that need real colour strings rather than `var(--…)`.
 * Call it inside an effect; re-run the effect when the theme changes.
 */
export function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
