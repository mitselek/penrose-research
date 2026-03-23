// (*PD:Bruijn*)
// Penrose P3 Rhomb Tiling — Simulation orchestration: createState, tick, EventQueue, queryTile
// Spec ref: Design spec → Animation Loop, Event Queue, Stats Panel
// Source ref: index.html lines 345–515 (animate function, stats panel)

import type { SimState, SimConfig, SimEvent, TileInfo } from './types'
import { buildTiling, buildConnectivity } from './tiling'
import { spawnSignals, moveSignals, propagate, annihilate } from './signals'
import { p3ArcWiring } from './wiring'
import { vkey } from './subdivision'

// ================================================================
// Default config
// ================================================================

const DEFAULT_CONFIG: SimConfig = {
  defaultSpeed: 0.001,
  spawnInterval: 1000,
  dashWidth: 0.15,
  wiring: p3ArcWiring,
}

// ================================================================
// createState — build tiling, connectivity, and initial SimState
// ================================================================

export function createState(level: number, config: Partial<SimConfig> = {}): SimState {
  const fullConfig: SimConfig = { ...DEFAULT_CONFIG, ...config }
  const rhombs = buildTiling(level)
  const conn = buildConnectivity(rhombs, fullConfig.wiring)

  return {
    config: fullConfig,
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

// ================================================================
// tick — one simulation step: consume events, move, propagate, annihilate
// ================================================================

export function tick(state: SimState, dt: number, events: SimEvent[]): void {
  // 1. Consume events
  for (const event of events) {
    if (event.kind === 'spawn') {
      spawnSignals(state, event)
    } else if (event.kind === 'clear') {
      state.signals.length = 0
    }
  }

  // 2. Move signals
  moveSignals(state, dt)

  // 3. Propagate (handle endpoint crossings)
  propagate(state)

  // 4. Annihilate converging pairs
  annihilate(state)

  // 5. Increment tick counter
  state.tick++
}

// ================================================================
// EventQueue — buffered event input for the animation loop
// ================================================================

export class EventQueue {
  private queue: SimEvent[] = []

  push(event: SimEvent): void {
    this.queue.push(event)
  }

  flush(): SimEvent[] {
    const events = this.queue
    this.queue = []
    return events
  }
}

// ================================================================
// queryTile — assemble TileInfo for renderer stats panel
// ================================================================

export function queryTile(state: SimState, rhombIdx: number): TileInfo {
  const rhomb = state.rhombs[rhombIdx]
  const neighbors = state.rhombNeighbors.get(rhombIdx) || []

  // Find conduits belonging to this rhomb
  const rhombConduits = state.conduits.filter(c => c.rhombIdx === rhombIdx)

  const conduitInfos = rhombConduits.map(c => {
    const ci = c.conduitIdx

    // Count signals by direction
    let signalsFwd = 0
    let signalsRev = 0
    for (const s of state.signals) {
      if (s.conduitIdx === ci) {
        if (s.dir > 0) signalsFwd++
        else signalsRev++
      }
    }

    // Find connected rhomb at each endpoint
    const connP1 = findConnectedRhomb(state, ci, 'P1')
    const connP2 = findConnectedRhomb(state, ci, 'P2')

    return {
      wireId: state.wireOf[ci],
      length: c.length,
      signalsFwd,
      signalsRev,
      connP1,
      connP2,
    }
  })

  return {
    index: rhombIdx,
    type: rhomb.type,
    healed: rhomb.healed,
    neighbors: [...neighbors],
    conduits: conduitInfos,
  }
}

// ================================================================
// Internal helper: find connected rhomb index at a conduit endpoint
// ================================================================

function findConnectedRhomb(
  state: SimState,
  conduitIdx: number,
  end: 'P1' | 'P2',
): number | null {
  const conduit = state.conduits[conduitIdx]
  const k = vkey(conduit[end])
  const matches = state.endpointMap.get(k)
  if (!matches) return null

  for (const m of matches) {
    if (m.conduitIdx !== conduitIdx) {
      return state.conduits[m.conduitIdx].rhombIdx
    }
  }
  return null
}
