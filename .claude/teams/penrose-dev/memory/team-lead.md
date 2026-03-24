# Team Lead Scratchpad

## [CHECKPOINT] 2026-03-24 — Full modularization complete

### Completed Phases

- Phase 0: Scaffold (Escher)
- Phase 1: Geometry — types.ts, geometry.ts, subdivision.ts, tiling.ts (Ammann)
- Phase 2: Simulation — wiring.ts, signals.ts, simulation.ts (Bruijn)
- Phase 3: Rendering — renderer.ts, controls.ts, main.ts, index.html (Escher)
- Phase 5: Cleanup — penrose.js removed, extracted to penrose-research submodule

### Test Coverage: 218/218 GREEN

- geometry: 35, subdivision: 54, wiring: 27, tiling: 36, signals: 28, simulation: 38

## [DECISION] 2026-03-24 — Normalized signal speed

Speed changed from "tiling-space units/ms" to "fraction of conduit/ms".
Removes level-dependence — same slider works at L5 or L9.
Formula: `s.pos += s.dir * s.speed * dt` (no `/ conduit.length`).

## [PATTERN] Parallel TDD tracks

Shechtman can write tests for module N+1 while implementer works on module N.
Key parallel: wiring tests (Bruijn) written while Ammann did subdivision.
Also: Escher's UI changes don't need TDD — can run parallel with simulation work.

## [PATTERN] Direct [COORDINATION] reduces latency

Implementers send [COORDINATION] directly to Penrose — no need for team-lead to route.
Avoid duplicate review requests when implementer already contacted reviewer.

## [GOTCHA] Inbox read status

Restored inboxes have `read=True` on all messages — fresh agents don't receive old messages.
Context must be embedded in spawn prompts, not relied on from inbox history.

## [GOTCHA] Scratchpad paths

Agents need absolute paths for scratchpads. Relative `memory/<name>.md` is ambiguous.
Always broadcast absolute path at session start.
