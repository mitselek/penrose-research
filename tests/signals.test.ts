// (*PD:Shechtman*)
// Signals module tests — spawn, move, propagate, annihilate
// Spec ref: Design spec → Signal Lifecycle, Testing Strategy → signals.test.ts

import { describe, it, expect } from 'vitest'
import type { Vec2, Rhomb, Conduit, Signal, SimState, SimConfig, SimEvent } from '../src/types'
import { spawnSignals, moveSignals, propagate, annihilate } from '../src/signals'
import { buildTiling, buildConnectivity } from '../src/tiling'
import { p3ArcWiring } from '../src/wiring'

// ---------- Helpers ----------

/** Build a minimal SimState at a given tiling level */
function makeState(level: number, overrides?: Partial<SimConfig>): SimState {
  const rhombs = buildTiling(level)
  const conn = buildConnectivity(rhombs, p3ArcWiring)
  return {
    config: {
      defaultSpeed: 0.001,
      spawnInterval: 200,
      dashWidth: 0.15,
      wiring: p3ArcWiring,
      ...overrides,
    },
    rhombs,
    conduits: conn.conduits,
    signals: [],
    wireOf: conn.wireOf,
    wires: conn.wires,
    rhombWires: conn.rhombWires,
    rhombNeighbors: conn.rhombNeighbors,
    endpointMap: conn.endpointMap,
    tick: 0,
  }
}

/** Create a spawn event for a given rhomb */
function spawnEvent(rhombIdx: number): SimEvent {
  return {
    kind: 'spawn',
    rhombIdx,
    speed: 0.001,
    charge: 0,
    color: '#fff',
    message: '',
  }
}

// ---------- spawnSignals ----------

describe('spawnSignals', () => {
  it('creates 2 signals per conduit on target rhomb', () => {
    const state = makeState(0)
    const event = spawnEvent(0)
    spawnSignals(state, event)
    // L0 has 1 rhomb with 2 conduits → 4 signals
    expect(state.signals).toHaveLength(4)
  })

  it('spawned signals have pos = 0.5', () => {
    const state = makeState(0)
    spawnSignals(state, spawnEvent(0))
    for (const s of state.signals) {
      expect(s.pos).toBe(0.5)
    }
  })

  it('spawned signals have dir +1 and -1 for each conduit', () => {
    const state = makeState(0)
    spawnSignals(state, spawnEvent(0))
    // Group by conduitIdx
    const byConduit = new Map<number, Signal[]>()
    for (const s of state.signals) {
      if (!byConduit.has(s.conduitIdx)) byConduit.set(s.conduitIdx, [])
      byConduit.get(s.conduitIdx)!.push(s)
    }
    for (const [_ci, sigs] of byConduit) {
      expect(sigs).toHaveLength(2)
      const dirs = sigs.map(s => s.dir).sort()
      expect(dirs).toEqual([-1, 1])
    }
  })

  it('spawned signals inherit speed from event', () => {
    const state = makeState(0)
    const event: SimEvent = { kind: 'spawn', rhombIdx: 0, speed: 0.005, charge: 0, color: '#fff', message: '' }
    spawnSignals(state, event)
    for (const s of state.signals) {
      expect(s.speed).toBe(0.005)
    }
  })

  it('spawned signals inherit charge from event', () => {
    const state = makeState(0)
    const event: SimEvent = { kind: 'spawn', rhombIdx: 0, speed: 0.001, charge: 42, color: '#fff', message: '' }
    spawnSignals(state, event)
    for (const s of state.signals) {
      expect(s.charge).toBe(42)
    }
  })

  it('spawned signals inherit color from event', () => {
    const state = makeState(0)
    const event: SimEvent = { kind: 'spawn', rhombIdx: 0, speed: 0.001, charge: 0, color: '#ff0000', message: '' }
    spawnSignals(state, event)
    for (const s of state.signals) {
      expect(s.color).toBe('#ff0000')
    }
  })

  it('spawned signals inherit message from event', () => {
    const state = makeState(0)
    const event: SimEvent = { kind: 'spawn', rhombIdx: 0, speed: 0.001, charge: 0, color: '#fff', message: 'hello' }
    spawnSignals(state, event)
    for (const s of state.signals) {
      expect(s.message).toBe('hello')
    }
  })

  it('only spawns on conduits belonging to the target rhomb', () => {
    const state = makeState(2) // multiple rhombs
    spawnSignals(state, spawnEvent(0))
    for (const s of state.signals) {
      const conduit = state.conduits[s.conduitIdx]
      expect(conduit.rhombIdx).toBe(0)
    }
  })

  it('does not remove existing signals', () => {
    const state = makeState(0)
    spawnSignals(state, spawnEvent(0))
    const countAfterFirst = state.signals.length
    spawnSignals(state, spawnEvent(0))
    expect(state.signals.length).toBe(countAfterFirst * 2)
  })
})

// ---------- moveSignals ----------

describe('moveSignals', () => {
  it('advances position by dir * speed * dt / length', () => {
    const state = makeState(0)
    spawnSignals(state, spawnEvent(0))
    // Take only the +1 direction signal on conduit 0
    const sig = state.signals.find(s => s.dir === 1)!
    const conduit = state.conduits[sig.conduitIdx]
    const startPos = sig.pos
    const dt = 100
    moveSignals(state, dt)
    const expectedPos = startPos + 1 * sig.speed * dt / conduit.length
    expect(sig.pos).toBeCloseTo(expectedPos, 10)
  })

  it('signal with dir=-1 moves toward 0', () => {
    const state = makeState(0)
    spawnSignals(state, spawnEvent(0))
    const sig = state.signals.find(s => s.dir === -1)!
    const startPos = sig.pos
    moveSignals(state, 100)
    expect(sig.pos).toBeLessThan(startPos)
  })

  it('signal with dir=+1 moves toward 1', () => {
    const state = makeState(0)
    spawnSignals(state, spawnEvent(0))
    const sig = state.signals.find(s => s.dir === 1)!
    const startPos = sig.pos
    moveSignals(state, 100)
    expect(sig.pos).toBeGreaterThan(startPos)
  })

  it('zero dt causes no movement', () => {
    const state = makeState(0)
    spawnSignals(state, spawnEvent(0))
    const positions = state.signals.map(s => s.pos)
    moveSignals(state, 0)
    state.signals.forEach((s, i) => {
      expect(s.pos).toBe(positions[i])
    })
  })

  it('empty signals array is a no-op', () => {
    const state = makeState(0)
    expect(state.signals).toHaveLength(0)
    moveSignals(state, 100) // should not throw
    expect(state.signals).toHaveLength(0)
  })
})

// ---------- propagate ----------

describe('propagate', () => {
  it('signal crossing pos > 1 is removed from current conduit', () => {
    const state = makeState(0)
    // Manually place a signal near the end
    state.signals.push({
      conduitIdx: 0,
      pos: 1.1, // already past endpoint
      dir: 1,
      speed: 0.001,
      charge: 0,
      color: '#fff',
      message: '',
    })
    propagate(state)
    // Original signal should be removed
    const remaining = state.signals.filter(s => s.conduitIdx === 0 && s.pos > 1)
    expect(remaining).toHaveLength(0)
  })

  it('signal crossing pos < 0 is removed from current conduit', () => {
    const state = makeState(0)
    state.signals.push({
      conduitIdx: 0,
      pos: -0.1,
      dir: -1,
      speed: 0.001,
      charge: 0,
      color: '#fff',
      message: '',
    })
    propagate(state)
    const remaining = state.signals.filter(s => s.conduitIdx === 0 && s.pos < 0)
    expect(remaining).toHaveLength(0)
  })

  it('signal at boundary with no neighbor is simply removed', () => {
    // L0 has no connected neighbors — all endpoints are boundary
    const state = makeState(0)
    state.signals.push({
      conduitIdx: 0,
      pos: 1.1,
      dir: 1,
      speed: 0.001,
      charge: 0,
      color: '#fff',
      message: '',
    })
    propagate(state)
    expect(state.signals).toHaveLength(0)
  })

  it('propagated signal enters connected conduit at correct end', () => {
    // Use L3 to ensure some conduits are connected
    const state = makeState(3)
    // Find a conduit that has a connection at P2
    let sourceIdx = -1
    for (let ci = 0; ci < state.conduits.length; ci++) {
      const c = state.conduits[ci]
      const key = vkeyFromVec2(c.P2)
      const entries = state.endpointMap.get(key)
      if (entries && entries.length === 2) {
        sourceIdx = ci
        break
      }
    }
    if (sourceIdx < 0) return // skip if no connections found (unlikely at L3)

    state.signals.push({
      conduitIdx: sourceIdx,
      pos: 1.1,
      dir: 1,
      speed: 0.001,
      charge: 0,
      color: '#fff',
      message: '',
    })
    propagate(state)
    // Should have a new signal on a different conduit
    const newSignals = state.signals.filter(s => s.conduitIdx !== sourceIdx)
    expect(newSignals.length).toBeGreaterThan(0)
    // New signal pos should be 0 or 1 (entering from an end)
    for (const s of newSignals) {
      expect([0, 1]).toContain(s.pos)
    }
  })

  it('propagated signal inherits speed', () => {
    const state = makeState(3)
    let sourceIdx = -1
    for (let ci = 0; ci < state.conduits.length; ci++) {
      const c = state.conduits[ci]
      const key = vkeyFromVec2(c.P2)
      const entries = state.endpointMap.get(key)
      if (entries && entries.length === 2) {
        sourceIdx = ci
        break
      }
    }
    if (sourceIdx < 0) return

    state.signals.push({
      conduitIdx: sourceIdx,
      pos: 1.1,
      dir: 1,
      speed: 0.0042,
      charge: 7,
      color: '#abc',
      message: 'test',
    })
    propagate(state)
    const newSignals = state.signals.filter(s => s.conduitIdx !== sourceIdx)
    for (const s of newSignals) {
      expect(s.speed).toBe(0.0042)
      expect(s.charge).toBe(7)
      expect(s.color).toBe('#abc')
      expect(s.message).toBe('test')
    }
  })

  it('signal within 0..1 range is not affected by propagate', () => {
    const state = makeState(0)
    state.signals.push({
      conduitIdx: 0,
      pos: 0.5,
      dir: 1,
      speed: 0.001,
      charge: 0,
      color: '#fff',
      message: '',
    })
    propagate(state)
    expect(state.signals).toHaveLength(1)
    expect(state.signals[0].pos).toBe(0.5)
  })
})

// ---------- annihilate ----------

describe('annihilate', () => {
  it('removes two converging signals within dashWidth', () => {
    const state = makeState(0)
    // Two signals on same conduit, converging, close together
    state.signals.push(
      { conduitIdx: 0, pos: 0.45, dir: 1, speed: 0.001, charge: 0, color: '#fff', message: '' },
      { conduitIdx: 0, pos: 0.55, dir: -1, speed: 0.001, charge: 0, color: '#fff', message: '' },
    )
    // pos difference = 0.10, dashWidth = 0.15, so they overlap
    annihilate(state)
    expect(state.signals).toHaveLength(0)
  })

  it('does not annihilate same-direction signals', () => {
    const state = makeState(0)
    state.signals.push(
      { conduitIdx: 0, pos: 0.45, dir: 1, speed: 0.001, charge: 0, color: '#fff', message: '' },
      { conduitIdx: 0, pos: 0.55, dir: 1, speed: 0.001, charge: 0, color: '#fff', message: '' },
    )
    annihilate(state)
    expect(state.signals).toHaveLength(2)
  })

  it('does not annihilate diverging signals', () => {
    const state = makeState(0)
    // Diverging: rightward signal is RIGHT of leftward signal
    state.signals.push(
      { conduitIdx: 0, pos: 0.55, dir: 1, speed: 0.001, charge: 0, color: '#fff', message: '' },
      { conduitIdx: 0, pos: 0.45, dir: -1, speed: 0.001, charge: 0, color: '#fff', message: '' },
    )
    annihilate(state)
    expect(state.signals).toHaveLength(2)
  })

  it('does not annihilate signals on different conduits', () => {
    const state = makeState(0)
    state.signals.push(
      { conduitIdx: 0, pos: 0.45, dir: 1, speed: 0.001, charge: 0, color: '#fff', message: '' },
      { conduitIdx: 1, pos: 0.55, dir: -1, speed: 0.001, charge: 0, color: '#fff', message: '' },
    )
    annihilate(state)
    expect(state.signals).toHaveLength(2)
  })

  it('does not annihilate converging signals too far apart', () => {
    const state = makeState(0)
    // pos difference = 0.5 > dashWidth = 0.15
    state.signals.push(
      { conduitIdx: 0, pos: 0.2, dir: 1, speed: 0.001, charge: 0, color: '#fff', message: '' },
      { conduitIdx: 0, pos: 0.7, dir: -1, speed: 0.001, charge: 0, color: '#fff', message: '' },
    )
    annihilate(state)
    expect(state.signals).toHaveLength(2)
  })

  it('empty signals array is a no-op', () => {
    const state = makeState(0)
    annihilate(state)
    expect(state.signals).toHaveLength(0)
  })

  it('single signal is never annihilated', () => {
    const state = makeState(0)
    state.signals.push(
      { conduitIdx: 0, pos: 0.5, dir: 1, speed: 0.001, charge: 0, color: '#fff', message: '' },
    )
    annihilate(state)
    expect(state.signals).toHaveLength(1)
  })

  it('multiple annihilation pairs are all removed', () => {
    const state = makeState(0)
    // Two pairs on two different conduits
    state.signals.push(
      { conduitIdx: 0, pos: 0.45, dir: 1, speed: 0.001, charge: 0, color: '#fff', message: '' },
      { conduitIdx: 0, pos: 0.55, dir: -1, speed: 0.001, charge: 0, color: '#fff', message: '' },
      { conduitIdx: 1, pos: 0.45, dir: 1, speed: 0.001, charge: 0, color: '#fff', message: '' },
      { conduitIdx: 1, pos: 0.55, dir: -1, speed: 0.001, charge: 0, color: '#fff', message: '' },
    )
    annihilate(state)
    expect(state.signals).toHaveLength(0)
  })
})

// ---------- Helper: vkey for endpoint lookup ----------

/** Reproduce vkey logic for endpoint map lookups in tests */
function vkeyFromVec2(v: Vec2): string {
  return (Math.round(v[0] * 1e4) * 1e-4).toFixed(4) + ',' +
         (Math.round(v[1] * 1e4) * 1e-4).toFixed(4)
}
