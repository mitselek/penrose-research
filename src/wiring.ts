// (*PD:Bruijn*)
// Penrose P3 Rhomb Tiling — Wiring strategy implementations
// Spec ref: Design spec → Types → WiringStrategy, Conduit, ConduitPath
// Source ref: index.html lines 84–97 (arc placement at acute vertices)

import type { Vec2, Rhomb, Conduit, WiringStrategy } from './types'
import { TAU, vadd, vsub, vscale } from './geometry'
import { THICK_TEMPLATE, THIN_TEMPLATE } from './subdivision'

// ================================================================
// P3 Arc Wiring Strategy
// ================================================================
// Places circular arcs at the two acute vertices (v0 and v2) of each rhomb.
// Thick rhomb: arcRadii = [TAU², TAU] (small at v0, large at v2)
// Thin  rhomb: arcRadii = [TAU², TAU²] (both small)
// All coordinates and lengths are in tiling space.

/**
 * Compute the length of a Vec2.
 */
function vlength(v: Vec2): number {
  return Math.hypot(v[0], v[1])
}

/**
 * P3 arc wiring: arcs at acute vertices of Penrose P3 rhombs.
 *
 * For each acute vertex (v0, v2), an arc connects the two adjacent edges.
 * The arc center is at the vertex, with radius = templateRadius * sideLength.
 * P1 is on the edge toward the previous vertex, P2 toward the next vertex.
 */
export const p3ArcWiring: WiringStrategy = {
  name: 'p3ArcWiring',

  createConduits(rhomb: Rhomb, rhombIdx: number, sideLength: number): Conduit[] {
    const tmpl = rhomb.type === 1 ? THICK_TEMPLATE : THIN_TEMPLATE
    const verts: Vec2[] = [rhomb.v0, rhomb.v1, rhomb.v2, rhomb.v3]
    const conduits: Conduit[] = []

    for (let ai = 0; ai < 2; ai++) {
      const vi = ai * 2 // v0 (index 0) for conduit 0, v2 (index 2) for conduit 1
      const V = verts[vi]
      const prev = verts[(vi + 3) % 4]
      const next = verts[(vi + 1) % 4]

      const radius = tmpl.arcRadii[ai] * sideLength

      // Direction vectors from vertex to prev/next neighbors
      const dP = vsub(prev, V)
      const dN = vsub(next, V)
      const lP = vlength(dP)
      const lN = vlength(dN)

      // P1 on edge toward prev, P2 on edge toward next
      const P1: Vec2 = vadd(V, vscale(dP, radius / lP))
      const P2: Vec2 = vadd(V, vscale(dN, radius / lN))

      // Compute angles for ConduitPath
      // startAngle/endAngle are stored so |endAngle - startAngle| = sweep angle
      const rawStart = Math.atan2(P1[1] - V[1], P1[0] - V[0])
      const rawEnd = Math.atan2(P2[1] - V[1], P2[0] - V[0])

      // Compute shortest sweep from start to end
      let sweep = rawEnd - rawStart
      while (sweep > Math.PI) sweep -= 2 * Math.PI
      while (sweep <= -Math.PI) sweep += 2 * Math.PI

      // Store endAngle = startAngle + sweep so the difference is exact
      const startAngle = rawStart
      const endAngle = rawStart + sweep

      const length = radius * Math.abs(sweep)

      conduits.push({
        rhombIdx,
        conduitIdx: ai,
        P1,
        P2,
        length,
        type: rhomb.type,
        path: {
          kind: 'arc',
          center: V,
          radius,
          startAngle,
          endAngle,
        },
      })
    }

    return conduits
  },
}
