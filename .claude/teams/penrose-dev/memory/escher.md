# Escher Scratchpad (_PD:Escher_)

## 2026-03-24

[LEARNED] Speed slider bug root cause: slider range 0.02–0.5 was designed for old screen-space SIGNAL_SPEED (pixels/ms). At L7, conduit lengths are ~0.013 in tiling space. Even slider min (0.02) causes signals to traverse a conduit ~24x per frame — both extremes look identical. Correct range: 0.0001–0.01 with defaultSpeed 0.001.

[DECISION] Option A approved: fix slider range in HTML, display speed×1000 in controls.ts for human-readable values. No simulation code changes needed for this fix.

[CHECKPOINT] UI changes complete:

- index.html:32 — slider min="0.0001" max="0.01" value="0.001" step="0.0001"
- controls.ts:52-59 — display format: speed × 1000 (0.001 → "1.0")
- main.ts:32 — defaultSpeed: 0.001 verified correct

[GOTCHA] controls.ts:53 syncs slider to config value, but if config value is below slider min, browser clamps silently while the displayed textContent reads from config (not clamped DOM value). Fixed by aligning slider range with actual defaultSpeed.
