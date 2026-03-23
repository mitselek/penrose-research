// (*PD:Shechtman*)
// Simulation module tests — createState, tick, EventQueue, queryTile, deterministic replay
// Spec ref: Design spec → Animation Loop, Event Queue, Testing Strategy → simulation.test.ts

import { describe, it, expect } from 'vitest'
import type { SimState, SimEvent, SimConfig, TileInfo } from '../src/types'
import { createState, tick, EventQueue, queryTile } from '../src/simulation'
import { p3ArcWiring } from '../src/wiring'

// ---------- Helpers ----------

function defaultConfig(): Partial<SimConfig> {
  return {
    defaultSpeed: 0.001,
    spawnInterval: 200,
    dashWidth: 0.15,
    wiring: p3ArcWiring,
  }
}

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

function clearEvent(): SimEvent {
  return { kind: 'clear' }
}

// ---------- createState ----------

describe('createState', () => {
  it('returns a SimState object', () => {
    const state = createState(0, defaultConfig())
    expect(state).toBeDefined()
  })

  it('has rhombs array matching the tiling level', () => {
    const state = createState(0, defaultConfig())
    expect(state.rhombs).toHaveLength(1) // L0 = 1 thick rhomb
  })

  it('has conduits array (2 per rhomb)', () => {
    const state = createState(0, defaultConfig())
    expect(state.conduits).toHaveLength(2)
  })

  it('starts with empty signals array', () => {
    const state = createState(0, defaultConfig())
    expect(state.signals).toHaveLength(0)
  })

  it('starts with tick = 0', () => {
    const state = createState(0, defaultConfig())
    expect(state.tick).toBe(0)
  })

  it('has wireOf, wires, rhombWires, rhombNeighbors, endpointMap', () => {
    const state = createState(0, defaultConfig())
    expect(state.wireOf).toBeInstanceOf(Int32Array)
    expect(Array.isArray(state.wires)).toBe(true)
    expect(state.rhombWires).toBeInstanceOf(Map)
    expect(state.rhombNeighbors).toBeInstanceOf(Map)
    expect(state.endpointMap).toBeInstanceOf(Map)
  })

  it('has config with wiring strategy', () => {
    const state = createState(0, defaultConfig())
    expect(state.config.wiring.name).toBe('p3ArcWiring')
  })

  it('works at higher levels', () => {
    const state = createState(3, defaultConfig())
    expect(state.rhombs.length).toBeGreaterThan(1)
    expect(state.conduits.length).toBe(state.rhombs.length * 2)
  })
})

// ---------- tick ----------

describe('tick', () => {
  it('increments state.tick', () => {
    const state = createState(0, defaultConfig())
    expect(state.tick).toBe(0)
    tick(state, 16, [])
    expect(state.tick).toBe(1)
  })

  it('increments tick on each call', () => {
    const state = createState(0, defaultConfig())
    tick(state, 16, [])
    tick(state, 16, [])
    tick(state, 16, [])
    expect(state.tick).toBe(3)
  })

  it('with spawn event — signals appear', () => {
    const state = createState(0, defaultConfig())
    tick(state, 16, [spawnEvent(0)])
    expect(state.signals.length).toBeGreaterThan(0)
  })

  it('spawn creates 2 signals per conduit on target rhomb', () => {
    const state = createState(0, defaultConfig())
    tick(state, 0, [spawnEvent(0)]) // dt=0 so no movement
    // L0: 1 rhomb, 2 conduits → 4 signals
    expect(state.signals).toHaveLength(4)
  })

  it('clear event removes all signals', () => {
    const state = createState(0, defaultConfig())
    tick(state, 0, [spawnEvent(0)])
    expect(state.signals.length).toBeGreaterThan(0)
    tick(state, 0, [clearEvent()])
    expect(state.signals).toHaveLength(0)
  })

  it('clear after multiple spawns removes all', () => {
    const state = createState(0, defaultConfig())
    tick(state, 0, [spawnEvent(0)])
    tick(state, 0, [spawnEvent(0)])
    expect(state.signals.length).toBeGreaterThan(0)
    tick(state, 0, [clearEvent()])
    expect(state.signals).toHaveLength(0)
  })

  it('empty events and no signals — state unchanged except tick', () => {
    const state = createState(0, defaultConfig())
    const rhombCount = state.rhombs.length
    const conduitCount = state.conduits.length
    tick(state, 16, [])
    expect(state.rhombs.length).toBe(rhombCount)
    expect(state.conduits.length).toBe(conduitCount)
    expect(state.signals).toHaveLength(0)
  })

  it('dt=0 with spawn — signals created but not moved', () => {
    const state = createState(0, defaultConfig())
    tick(state, 0, [spawnEvent(0)])
    for (const s of state.signals) {
      expect(s.pos).toBe(0.5) // spawned at 0.5, no movement
    }
  })

  it('multiple events in one tick are all processed', () => {
    const state = createState(2, defaultConfig())
    tick(state, 0, [spawnEvent(0), spawnEvent(1)])
    // Signals on rhomb 0 and rhomb 1
    const onRhomb0 = state.signals.filter(s => state.conduits[s.conduitIdx].rhombIdx === 0)
    const onRhomb1 = state.signals.filter(s => state.conduits[s.conduitIdx].rhombIdx === 1)
    expect(onRhomb0.length).toBeGreaterThan(0)
    expect(onRhomb1.length).toBeGreaterThan(0)
  })
})

// ---------- Deterministic replay ----------

describe('deterministic replay', () => {
  it('two runs with same dt sequence and events produce identical signal count', () => {
    const events: [number, SimEvent[]][] = [
      [0, [spawnEvent(0)]],
      [16, []],
      [16, []],
      [16, [spawnEvent(0)]],
      [16, []],
    ]

    const stateA = createState(2, defaultConfig())
    const stateB = createState(2, defaultConfig())

    for (const [dt, evts] of events) {
      tick(stateA, dt, evts)
      tick(stateB, dt, evts)
    }

    expect(stateA.signals.length).toBe(stateB.signals.length)
    expect(stateA.tick).toBe(stateB.tick)
  })

  it('two runs produce identical signal positions', () => {
    const events: [number, SimEvent[]][] = [
      [0, [spawnEvent(0)]],
      [16, []],
      [32, []],
    ]

    const stateA = createState(0, defaultConfig())
    const stateB = createState(0, defaultConfig())

    for (const [dt, evts] of events) {
      tick(stateA, dt, evts)
      tick(stateB, dt, evts)
    }

    expect(stateA.signals.length).toBe(stateB.signals.length)
    for (let i = 0; i < stateA.signals.length; i++) {
      expect(stateA.signals[i].pos).toBe(stateB.signals[i].pos)
      expect(stateA.signals[i].dir).toBe(stateB.signals[i].dir)
      expect(stateA.signals[i].conduitIdx).toBe(stateB.signals[i].conduitIdx)
    }
  })

  it('different dt sequences produce different results', () => {
    const stateA = createState(0, defaultConfig())
    const stateB = createState(0, defaultConfig())

    tick(stateA, 0, [spawnEvent(0)])
    tick(stateA, 100, [])

    tick(stateB, 0, [spawnEvent(0)])
    tick(stateB, 200, [])

    // Signals should be at different positions
    const positionsA = stateA.signals.map(s => s.pos).sort()
    const positionsB = stateB.signals.map(s => s.pos).sort()
    expect(positionsA).not.toEqual(positionsB)
  })
})

// ---------- EventQueue ----------

describe('EventQueue', () => {
  it('starts empty', () => {
    const eq = new EventQueue()
    const events = eq.flush()
    expect(events).toHaveLength(0)
  })

  it('push adds events', () => {
    const eq = new EventQueue()
    eq.push(spawnEvent(0))
    const events = eq.flush()
    expect(events).toHaveLength(1)
    expect(events[0].kind).toBe('spawn')
  })

  it('flush returns all pushed events', () => {
    const eq = new EventQueue()
    eq.push(spawnEvent(0))
    eq.push(spawnEvent(1))
    eq.push(clearEvent())
    const events = eq.flush()
    expect(events).toHaveLength(3)
  })

  it('flush empties the queue', () => {
    const eq = new EventQueue()
    eq.push(spawnEvent(0))
    eq.flush()
    const events = eq.flush()
    expect(events).toHaveLength(0)
  })

  it('events are returned in push order', () => {
    const eq = new EventQueue()
    eq.push(spawnEvent(0))
    eq.push(clearEvent())
    eq.push(spawnEvent(1))
    const events = eq.flush()
    expect(events[0].kind).toBe('spawn')
    expect(events[1].kind).toBe('clear')
    expect(events[2].kind).toBe('spawn')
  })

  it('multiple flush cycles work independently', () => {
    const eq = new EventQueue()
    eq.push(spawnEvent(0))
    const first = eq.flush()
    eq.push(spawnEvent(1))
    eq.push(spawnEvent(2))
    const second = eq.flush()
    expect(first).toHaveLength(1)
    expect(second).toHaveLength(2)
  })
})

// ---------- queryTile ----------

describe('queryTile', () => {
  it('returns TileInfo for a valid rhomb index', () => {
    const state = createState(0, defaultConfig())
    const info = queryTile(state, 0)
    expect(info).toBeDefined()
  })

  it('returns correct rhomb index', () => {
    const state = createState(2, defaultConfig())
    const info = queryTile(state, 3)
    expect(info.index).toBe(3)
  })

  it('returns correct rhomb type', () => {
    const state = createState(0, defaultConfig())
    const info = queryTile(state, 0)
    expect(info.type).toBe(1) // L0 seed is thick
  })

  it('returns correct healed flag', () => {
    const state = createState(0, defaultConfig())
    const info = queryTile(state, 0)
    expect(info.healed).toBe(false)
  })

  it('returns neighbors array', () => {
    const state = createState(0, defaultConfig())
    const info = queryTile(state, 0)
    expect(Array.isArray(info.neighbors)).toBe(true)
    expect(info.neighbors).toHaveLength(0) // L0 has no neighbors
  })

  it('at L3+ some tiles have neighbors', () => {
    const state = createState(3, defaultConfig())
    let hasNeighbors = false
    for (let i = 0; i < state.rhombs.length; i++) {
      const info = queryTile(state, i)
      if (info.neighbors.length > 0) {
        hasNeighbors = true
        break
      }
    }
    expect(hasNeighbors).toBe(true)
  })

  it('returns conduit details with wireId and length', () => {
    const state = createState(0, defaultConfig())
    const info = queryTile(state, 0)
    expect(info.conduits).toHaveLength(2) // 2 conduits per rhomb
    for (const c of info.conduits) {
      expect(typeof c.wireId).toBe('number')
      expect(c.length).toBeGreaterThan(0)
    }
  })

  it('signal counts are 0 when no signals exist', () => {
    const state = createState(0, defaultConfig())
    const info = queryTile(state, 0)
    for (const c of info.conduits) {
      expect(c.signalsFwd).toBe(0)
      expect(c.signalsRev).toBe(0)
    }
  })

  it('signal counts match actual signals after spawn', () => {
    const state = createState(0, defaultConfig())
    tick(state, 0, [spawnEvent(0)])
    const info = queryTile(state, 0)
    let totalFwd = 0
    let totalRev = 0
    for (const c of info.conduits) {
      totalFwd += c.signalsFwd
      totalRev += c.signalsRev
    }
    // Spawn creates 2 signals per conduit (1 fwd, 1 rev) × 2 conduits
    expect(totalFwd).toBe(2)
    expect(totalRev).toBe(2)
  })

  it('connP1/connP2 are null for boundary tile (L0)', () => {
    const state = createState(0, defaultConfig())
    const info = queryTile(state, 0)
    for (const c of info.conduits) {
      expect(c.connP1).toBeNull()
      expect(c.connP2).toBeNull()
    }
  })

  it('connP1/connP2 are number or null', () => {
    const state = createState(3, defaultConfig())
    for (let i = 0; i < Math.min(state.rhombs.length, 10); i++) {
      const info = queryTile(state, i)
      for (const c of info.conduits) {
        expect(c.connP1 === null || typeof c.connP1 === 'number').toBe(true)
        expect(c.connP2 === null || typeof c.connP2 === 'number').toBe(true)
      }
    }
  })

  it('connP1/connP2 reference valid rhomb indices when not null', () => {
    const state = createState(3, defaultConfig())
    for (let i = 0; i < Math.min(state.rhombs.length, 10); i++) {
      const info = queryTile(state, i)
      for (const c of info.conduits) {
        if (c.connP1 !== null) {
          expect(c.connP1).toBeGreaterThanOrEqual(0)
          expect(c.connP1).toBeLessThan(state.rhombs.length)
        }
        if (c.connP2 !== null) {
          expect(c.connP2).toBeGreaterThanOrEqual(0)
          expect(c.connP2).toBeLessThan(state.rhombs.length)
        }
      }
    }
  })
})
