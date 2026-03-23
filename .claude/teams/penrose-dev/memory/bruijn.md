# Bruijn — Scratchpad

## 2026-03-24

[LEARNED] Signal speed slider bug: at L7, conduit lengths are ~0.008–0.027 in tiling space. The slider range 0.02–0.5 produces delta/frame of 12–968x (instant transit). Even defaultSpeed 0.001 crosses thin conduits in <1 frame. The formula `speed * dt / conduit.length` needs either normalized speed units or a drastically smaller range.

[DECISION] Two viable fix approaches identified:
1. Normalized speed (remove /conduit.length, use fraction-of-conduit per ms) — simpler, level-independent
2. Keep tiling-space speed, recalibrate range to ~0.000002–0.0004 — preserves physics-based speed
