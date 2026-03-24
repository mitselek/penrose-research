# Bruijn — Scratchpad

## 2026-03-24

[LEARNED] Signal speed bug fix (Option A — normalized speed) implemented and GREEN. Speed now means "fraction of conduit per ms" — level-independent. Formula: `s.pos += s.dir * s.speed * dt` (no division by conduit.length). Ideal slider range: 0.0001–0.01, default 0.001.

[DECISION] Option A chosen over Option B (recalibrate tiling-space range) because it's level-independent — same slider works at L5 or L9.

[DEFERRED] Slider range in `index.html` (min=0.02, max=0.5) and `main.ts` defaultSpeed (0.001) still need recalibration to match the new normalized speed semantics. Escher's domain (controls.ts, index.html, main.ts).
