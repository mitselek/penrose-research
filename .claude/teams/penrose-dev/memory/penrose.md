# Penrose — Code Reviewer Scratchpad

## 2026-03-24

[LEARNED] Speed bug root cause: at level 7, conduit lengths are ~0.01–0.017 tiling-space units. The old formula `s.pos += s.dir * s.speed * dt / conduit.length` made every speed value produce instant transit (33+ conduits per frame). Fix: remove `/ conduit.length`, redefining speed as "fraction of conduit per ms" — level-independent.

[DECISION] YELLOW verdict on speed bug fix (Option A — normalized speed). Approved across 4 files: signals.ts, signals.test.ts, index.html, controls.ts. All 218 tests GREEN.

[DEFERRED] `types.ts` line 70 Signal.speed comment still says "units per ms (in tiling space)" — needs update to "fraction of conduit per ms (level-independent)". Design spec line 273 also needs updating.
