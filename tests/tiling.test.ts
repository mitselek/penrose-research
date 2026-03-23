// (*PD:Shechtman*)
// Tiling module tests — buildTiling, buildConnectivity, adjacency invariants
// Spec ref: Design spec → Testing Strategy → tiling.test.ts
// Spec ref: Design spec → Module Structure → tiling.ts

import { describe, it, expect } from 'vitest'
import type { Rhomb, Conduit, WiringStrategy } from '../src/types'
import { buildTiling, buildConnectivity } from '../src/tiling'
import { p3ArcWiring } from '../src/wiring'

// ---------- buildTiling — rhomb generation per level ----------

describe('buildTiling', () => {
  it('L0 produces exactly 1 rhomb (the seed)', () => {
    const rhombs = buildTiling(0)
    expect(rhombs).toHaveLength(1)
  })

  it('L0 seed is a thick rhomb (type 1)', () => {
    const rhombs = buildTiling(0)
    expect(rhombs[0].type).toBe(1)
  })

  it('L0 seed is not healed', () => {
    const rhombs = buildTiling(0)
    expect(rhombs[0].healed).toBe(false)
  })

  it('L1 produces more than 1 rhomb', () => {
    const rhombs = buildTiling(1)
    expect(rhombs.length).toBeGreaterThan(1)
  })

  it('L2 produces more rhombs than L1', () => {
    const L1 = buildTiling(1)
    const L2 = buildTiling(2)
    expect(L2.length).toBeGreaterThan(L1.length)
  })

  it('tile counts grow with each level', () => {
    const counts: number[] = []
    for (let level = 0; level <= 4; level++) {
      counts.push(buildTiling(level).length)
    }
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i]).toBeGreaterThan(counts[i - 1])
    }
  })

  it('all rhombs have type 0 or 1', () => {
    const rhombs = buildTiling(3)
    for (const r of rhombs) {
      expect([0, 1]).toContain(r.type)
    }
  })

  it('all rhombs have 4 vertices', () => {
    const rhombs = buildTiling(2)
    for (const r of rhombs) {
      expect(r.v0).toHaveLength(2)
      expect(r.v1).toHaveLength(2)
      expect(r.v2).toHaveLength(2)
      expect(r.v3).toHaveLength(2)
    }
  })

  it('all rhombs have edges array with 4 edge pairs', () => {
    const rhombs = buildTiling(2)
    for (const r of rhombs) {
      expect(r.edges).toHaveLength(4)
      for (const edge of r.edges) {
        expect(edge).toHaveLength(2)
        expect(edge[0]).toHaveLength(2)
        expect(edge[1]).toHaveLength(2)
      }
    }
  })

  it('contains both thick and thin rhombs at L2+', () => {
    const rhombs = buildTiling(2)
    const types = new Set(rhombs.map(r => r.type))
    expect(types.has(0)).toBe(true)
    expect(types.has(1)).toBe(true)
  })

  it('is deterministic — two calls with same level produce same count', () => {
    const a = buildTiling(3)
    const b = buildTiling(3)
    expect(a.length).toBe(b.length)
  })
})

// ---------- buildConnectivity ----------

describe('buildConnectivity', () => {
  it('returns conduits array', () => {
    const rhombs = buildTiling(1)
    const conn = buildConnectivity(rhombs, p3ArcWiring)
    expect(Array.isArray(conn.conduits)).toBe(true)
  })

  it('produces 2 conduits per rhomb', () => {
    const rhombs = buildTiling(2)
    const conn = buildConnectivity(rhombs, p3ArcWiring)
    expect(conn.conduits.length).toBe(rhombs.length * 2)
  })

  it('returns wireOf as Int32Array', () => {
    const rhombs = buildTiling(1)
    const conn = buildConnectivity(rhombs, p3ArcWiring)
    expect(conn.wireOf).toBeInstanceOf(Int32Array)
    expect(conn.wireOf.length).toBe(conn.conduits.length)
  })

  it('all wireOf values are >= 0 (every conduit assigned to a wire)', () => {
    const rhombs = buildTiling(2)
    const conn = buildConnectivity(rhombs, p3ArcWiring)
    for (let i = 0; i < conn.wireOf.length; i++) {
      expect(conn.wireOf[i]).toBeGreaterThanOrEqual(0)
    }
  })

  it('wires array maps wire ID to conduit indices', () => {
    const rhombs = buildTiling(2)
    const conn = buildConnectivity(rhombs, p3ArcWiring)
    expect(Array.isArray(conn.wires)).toBe(true)
    // Every conduit should appear in exactly one wire
    const seen = new Set<number>()
    for (const wire of conn.wires) {
      for (const ci of wire) {
        expect(seen.has(ci)).toBe(false) // no duplicates
        seen.add(ci)
      }
    }
    expect(seen.size).toBe(conn.conduits.length)
  })

  it('wireOf and wires are consistent', () => {
    const rhombs = buildTiling(2)
    const conn = buildConnectivity(rhombs, p3ArcWiring)
    for (let ci = 0; ci < conn.conduits.length; ci++) {
      const wid = conn.wireOf[ci]
      expect(conn.wires[wid]).toContain(ci)
    }
  })

  it('returns rhombWires map', () => {
    const rhombs = buildTiling(1)
    const conn = buildConnectivity(rhombs, p3ArcWiring)
    expect(conn.rhombWires).toBeInstanceOf(Map)
  })

  it('every rhomb has wire IDs in rhombWires', () => {
    const rhombs = buildTiling(2)
    const conn = buildConnectivity(rhombs, p3ArcWiring)
    for (let ri = 0; ri < rhombs.length; ri++) {
      expect(conn.rhombWires.has(ri)).toBe(true)
      const wireIds = conn.rhombWires.get(ri)!
      expect(wireIds.size).toBeGreaterThan(0)
    }
  })

  it('returns endpointMap', () => {
    const rhombs = buildTiling(1)
    const conn = buildConnectivity(rhombs, p3ArcWiring)
    expect(conn.endpointMap).toBeInstanceOf(Map)
  })

  it('returns rhombNeighbors map', () => {
    const rhombs = buildTiling(1)
    const conn = buildConnectivity(rhombs, p3ArcWiring)
    expect(conn.rhombNeighbors).toBeInstanceOf(Map)
  })
})

// ---------- Endpoint connectivity invariant ----------

describe('buildConnectivity — endpoint invariants', () => {
  it('every conduit endpoint connects to 0 or 1 neighbor', () => {
    const rhombs = buildTiling(3)
    const conn = buildConnectivity(rhombs, p3ArcWiring)
    // For each endpoint key, at most 2 conduits should share it
    // (the conduit itself + at most 1 neighbor)
    for (const [_key, entries] of conn.endpointMap) {
      expect(entries.length).toBeLessThanOrEqual(2)
    }
  })

  it('boundary conduit endpoints have exactly 1 entry (no neighbor)', () => {
    // L0 single rhomb: all endpoints are at the boundary
    const rhombs = buildTiling(0)
    const conn = buildConnectivity(rhombs, p3ArcWiring)
    let hasBoundary = false
    for (const [_key, entries] of conn.endpointMap) {
      if (entries.length === 1) hasBoundary = true
    }
    expect(hasBoundary).toBe(true)
  })

  it('at L3+ some endpoints connect to exactly 1 neighbor (2 entries)', () => {
    const rhombs = buildTiling(3)
    const conn = buildConnectivity(rhombs, p3ArcWiring)
    let hasConnection = false
    for (const [_key, entries] of conn.endpointMap) {
      if (entries.length === 2) hasConnection = true
    }
    expect(hasConnection).toBe(true)
  })
})

// ---------- Wire components ----------

describe('buildConnectivity — wire components', () => {
  it('L0 has exactly 2 wires (2 isolated conduits)', () => {
    const rhombs = buildTiling(0)
    const conn = buildConnectivity(rhombs, p3ArcWiring)
    expect(conn.wires.length).toBe(2)
  })

  it('at L2+ wire count is less than conduit count (some conduits connect)', () => {
    const rhombs = buildTiling(2)
    const conn = buildConnectivity(rhombs, p3ArcWiring)
    expect(conn.wires.length).toBeLessThan(conn.conduits.length)
  })

  it('each wire has at least 1 conduit', () => {
    const rhombs = buildTiling(2)
    const conn = buildConnectivity(rhombs, p3ArcWiring)
    for (const wire of conn.wires) {
      expect(wire.length).toBeGreaterThan(0)
    }
  })
})

// ---------- Neighbor adjacency ----------

describe('buildConnectivity — rhombNeighbors', () => {
  it('adjacency is symmetric: if A neighbors B then B neighbors A', () => {
    const rhombs = buildTiling(3)
    const conn = buildConnectivity(rhombs, p3ArcWiring)
    for (const [ri, neighbors] of conn.rhombNeighbors) {
      for (const ni of neighbors) {
        const nNeighbors = conn.rhombNeighbors.get(ni)
        expect(nNeighbors).toBeDefined()
        expect(nNeighbors!).toContain(ri)
      }
    }
  })

  it('each rhomb has between 0 and 4 neighbors', () => {
    const rhombs = buildTiling(3)
    const conn = buildConnectivity(rhombs, p3ArcWiring)
    for (const [_ri, neighbors] of conn.rhombNeighbors) {
      expect(neighbors.length).toBeGreaterThanOrEqual(0)
      expect(neighbors.length).toBeLessThanOrEqual(4)
    }
  })

  it('L0 single rhomb has 0 neighbors', () => {
    const rhombs = buildTiling(0)
    const conn = buildConnectivity(rhombs, p3ArcWiring)
    const neighbors = conn.rhombNeighbors.get(0)
    expect(neighbors).toBeDefined()
    expect(neighbors!.length).toBe(0)
  })

  it('at L2+ some rhombs have neighbors', () => {
    const rhombs = buildTiling(2)
    const conn = buildConnectivity(rhombs, p3ArcWiring)
    let hasNeighbors = false
    for (const [_ri, neighbors] of conn.rhombNeighbors) {
      if (neighbors.length > 0) hasNeighbors = true
    }
    expect(hasNeighbors).toBe(true)
  })

  it('neighbor indices are valid rhomb indices', () => {
    const rhombs = buildTiling(3)
    const conn = buildConnectivity(rhombs, p3ArcWiring)
    for (const [_ri, neighbors] of conn.rhombNeighbors) {
      for (const ni of neighbors) {
        expect(ni).toBeGreaterThanOrEqual(0)
        expect(ni).toBeLessThan(rhombs.length)
      }
    }
  })

  it('no rhomb is its own neighbor', () => {
    const rhombs = buildTiling(3)
    const conn = buildConnectivity(rhombs, p3ArcWiring)
    for (const [ri, neighbors] of conn.rhombNeighbors) {
      expect(neighbors).not.toContain(ri)
    }
  })

  it('no duplicate neighbors for any rhomb', () => {
    const rhombs = buildTiling(3)
    const conn = buildConnectivity(rhombs, p3ArcWiring)
    for (const [_ri, neighbors] of conn.rhombNeighbors) {
      const unique = new Set(neighbors)
      expect(unique.size).toBe(neighbors.length)
    }
  })
})

// ---------- Tiling-space coordinates ----------

describe('buildConnectivity — tiling space', () => {
  it('all conduit coordinates are in tiling space (small values)', () => {
    const rhombs = buildTiling(2)
    const conn = buildConnectivity(rhombs, p3ArcWiring)
    for (const c of conn.conduits) {
      // Tiling-space coordinates for L2 should be bounded
      expect(Math.abs(c.P1[0])).toBeLessThan(10)
      expect(Math.abs(c.P1[1])).toBeLessThan(10)
      expect(Math.abs(c.P2[0])).toBeLessThan(10)
      expect(Math.abs(c.P2[1])).toBeLessThan(10)
    }
  })

  it('all conduit lengths are positive', () => {
    const rhombs = buildTiling(2)
    const conn = buildConnectivity(rhombs, p3ArcWiring)
    for (const c of conn.conduits) {
      expect(c.length).toBeGreaterThan(0)
    }
  })
})
