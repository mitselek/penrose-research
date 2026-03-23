// (*PD:Ammann*)
// Penrose P3 Rhomb Tiling — Tiling construction and connectivity
// Spec ref: Design spec → Module Structure → tiling.ts
// Source ref: index.html lines 137–230 (build tiling, signal system connectivity)

import type { Vec2, Rhomb, Conduit, WiringStrategy } from './types'
import { THICK_TEMPLATE, makeRhomb, subdivideRhombs, vkey, edgeKey } from './subdivision'

// ================================================================
// buildTiling — subdivide seed thick rhomb to desired level
// ================================================================

export function buildTiling(level: number): Rhomb[] {
  // L0: single thick rhomb from template, canonical vertex order
  // From monolith: makeRhomb(1, L0_verts[1], L0_verts[0], L0_verts[3], L0_verts[2], false)
  const v = THICK_TEMPLATE.verts
  let rhombs: Rhomb[] = [
    makeRhomb(1, v[1] as Vec2, v[0] as Vec2, v[3] as Vec2, v[2] as Vec2, false),
  ]
  for (let i = 0; i < level; i++) {
    rhombs = subdivideRhombs(rhombs)
  }
  return rhombs
}

// ================================================================
// buildConnectivity — conduits, wires, endpoints, neighbors
// ================================================================

export function buildConnectivity(
  rhombs: Rhomb[],
  wiring: WiringStrategy,
): {
  conduits: Conduit[]
  wireOf: Int32Array
  wires: number[][]
  rhombWires: Map<number, Set<number>>
  rhombNeighbors: Map<number, number[]>
  endpointMap: Map<string, { conduitIdx: number; end: 'P1' | 'P2' }[]>
} {
  // Compute side length from first rhomb (v0→v1 distance)
  const r0 = rhombs[0]
  const sideLength = Math.hypot(r0.v1[0] - r0.v0[0], r0.v1[1] - r0.v0[1])

  // 1. Create all conduits using the wiring strategy
  const conduits: Conduit[] = []
  for (let ri = 0; ri < rhombs.length; ri++) {
    const rhombConduits = wiring.createConduits(rhombs[ri], ri, sideLength)
    // Fix conduitIdx to be global index
    for (const c of rhombConduits) {
      c.conduitIdx = conduits.length
      conduits.push(c)
    }
  }

  // 2. Build endpoint map: vkey(point) → [{conduitIdx, end}]
  const endpointMap = new Map<string, { conduitIdx: number; end: 'P1' | 'P2' }[]>()
  for (let ci = 0; ci < conduits.length; ci++) {
    const c = conduits[ci]
    for (const end of ['P1', 'P2'] as const) {
      const k = vkey(c[end])
      if (!endpointMap.has(k)) endpointMap.set(k, [])
      endpointMap.get(k)!.push({ conduitIdx: ci, end })
    }
  }

  // 3. Build wire components via BFS
  const wireOf = new Int32Array(conduits.length).fill(-1)
  let wireCount = 0

  for (let ci = 0; ci < conduits.length; ci++) {
    if (wireOf[ci] >= 0) continue
    const wid = wireCount++
    const queue = [ci]
    wireOf[ci] = wid
    while (queue.length > 0) {
      const cur = queue.shift()!
      for (const end of ['P1', 'P2'] as const) {
        const k = vkey(conduits[cur][end])
        const matches = endpointMap.get(k)
        if (!matches) continue
        for (const m of matches) {
          if (m.conduitIdx !== cur && wireOf[m.conduitIdx] < 0) {
            wireOf[m.conduitIdx] = wid
            queue.push(m.conduitIdx)
          }
        }
      }
    }
  }

  // 4. Build wire → conduit indices lookup
  const wires: number[][] = Array.from({ length: wireCount }, () => [])
  for (let ci = 0; ci < conduits.length; ci++) {
    wires[wireOf[ci]].push(ci)
  }

  // 5. Build rhomb → wire IDs
  const rhombWires = new Map<number, Set<number>>()
  for (let ci = 0; ci < conduits.length; ci++) {
    const ri = conduits[ci].rhombIdx
    if (!rhombWires.has(ri)) rhombWires.set(ri, new Set())
    rhombWires.get(ri)!.add(wireOf[ci])
  }

  // 6. Build rhomb neighbor adjacency (rhombs sharing a full edge)
  const edgeToRhomb = new Map<string, number[]>()
  for (let ri = 0; ri < rhombs.length; ri++) {
    const r = rhombs[ri]
    for (const [a, b] of r.edges) {
      const ek = edgeKey(a, b)
      if (!edgeToRhomb.has(ek)) edgeToRhomb.set(ek, [])
      edgeToRhomb.get(ek)!.push(ri)
    }
  }

  const rhombNeighbors = new Map<number, number[]>()
  for (let ri = 0; ri < rhombs.length; ri++) {
    rhombNeighbors.set(ri, [])
  }
  for (const [, indices] of edgeToRhomb) {
    if (indices.length === 2) {
      const [a, b] = indices
      rhombNeighbors.get(a)!.push(b)
      rhombNeighbors.get(b)!.push(a)
    }
  }

  // Deduplicate neighbors (a rhomb could share multiple edges with the same neighbor)
  for (const [ri, neighbors] of rhombNeighbors) {
    rhombNeighbors.set(ri, [...new Set(neighbors)])
  }

  return { conduits, wireOf, wires, rhombWires, rhombNeighbors, endpointMap }
}
