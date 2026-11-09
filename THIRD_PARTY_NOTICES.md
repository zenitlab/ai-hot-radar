# Third-party notices

## AIHOT

Parts of the scoring, clustering, feed scheduling, event heat and digest
selection logic are adapted from AIHOT (formulas and parameters, re-implemented
in this codebase):

- server/src/utils/event-heat.ts      — events/hot.ts (cross-source heat, 24h half-life)
- server/src/utils/feed-schedule.ts   — sources/collect.ts, sources/rss.ts (adaptive interval, backoff, conditional GET)
- server/src/utils/digest-compose.ts  — reports/compose.ts (rule-based digest selection)
- server/src/utils/title-cluster.ts   — events/relate.ts (overlap-coefficient title similarity)
- server/src/services/scoring.service.ts — industry/prompts/selection-score.md (per-type weights, noise caps)

The AIHOT name and logo are not covered by its license and are not used here.

MIT License

Copyright (c) 2026 数字生命卡兹克

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
