// (*PD:Bruijn*)
// Penrose P3 Rhomb Tiling — Signal lifecycle: spawn, move, propagate, annihilate
// Spec ref: Design spec → Signal Lifecycle
// Source ref: index.html lines 349–404 (animate function signal logic)

import type { SimState, SimEvent, Signal } from './types'
import { vkey } from './subdivision'

// ================================================================
// spawnSignals — create 2 signals per conduit on target rhomb
// ================================================================

export function spawnSignals(state: SimState, event: SimEvent): void {
  if (event.kind !== 'spawn') return

  for (const conduit of state.conduits) {
    if (conduit.rhombIdx !== event.rhombIdx) continue
    state.signals.push(
      {
        conduitIdx: conduit.conduitIdx,
        pos: 0.5,
        dir: 1,
        speed: event.speed,
        charge: event.charge,
        color: event.color,
        message: event.message,
      },
      {
        conduitIdx: conduit.conduitIdx,
        pos: 0.5,
        dir: -1,
        speed: event.speed,
        charge: event.charge,
        color: event.color,
        message: event.message,
      },
    )
  }
}

// ================================================================
// moveSignals — advance position along conduit
// ================================================================

export function moveSignals(state: SimState, dt: number): void {
  for (const s of state.signals) {
    const conduit = state.conduits[s.conduitIdx]
    s.pos += s.dir * s.speed * dt / conduit.length
  }
}

// ================================================================
// propagate — handle signals that crossed conduit endpoints
// ================================================================

export function propagate(state: SimState): void {
  for (let i = state.signals.length - 1; i >= 0; i--) {
    const s = state.signals[i]

    if (s.pos >= 0 && s.pos <= 1) continue

    // Determine which endpoint was crossed
    const conduit = state.conduits[s.conduitIdx]
    const crossedEnd: 'P1' | 'P2' = s.pos > 1 ? 'P2' : 'P1'
    const k = vkey(conduit[crossedEnd])
    const matches = state.endpointMap.get(k)

    // Remove the original signal
    state.signals.splice(i, 1)

    if (!matches) continue

    // Find connected conduit (not self)
    for (const m of matches) {
      if (m.conduitIdx === conduit.conduitIdx) continue
      // Signal enters neighbor from the matching endpoint
      const enterPos = m.end === 'P1' ? 0 : 1
      const enterDir: 1 | -1 = m.end === 'P1' ? 1 : -1
      state.signals.push({
        conduitIdx: m.conduitIdx,
        pos: enterPos,
        dir: enterDir,
        speed: s.speed,
        charge: s.charge,
        color: s.color,
        message: s.message,
      })
    }
  }
}

// ================================================================
// annihilate — remove converging signal pairs within dashWidth
// ================================================================

export function annihilate(state: SimState): void {
  for (let i = 0; i < state.signals.length; i++) {
    for (let j = i + 1; j < state.signals.length; j++) {
      const a = state.signals[i]
      const b = state.signals[j]
      if (a.conduitIdx !== b.conduitIdx) continue
      if (a.dir === b.dir) continue

      // Only annihilate if converging: rightward is LEFT of leftward
      const rightward = a.dir > 0 ? a : b
      const leftward = a.dir > 0 ? b : a
      if (rightward.pos < leftward.pos && leftward.pos - rightward.pos < state.config.dashWidth) {
        state.signals.splice(j, 1)
        state.signals.splice(i, 1)
        i--
        break
      }
    }
  }
}
