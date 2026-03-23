// (*PD:Shechtman*)
// Wiring module tests — P3 arc wiring strategy, conduit placement
// Spec ref: Design spec → Testing Strategy → wiring.test.ts
// Spec ref: Design spec → Types → WiringStrategy, Conduit, ConduitPath

import { describe, it, expect } from 'vitest'
import type { Vec2, Rhomb, Conduit } from '../src/types'
import { TAU, cos36, sin36, cos18, sin18 } from '../src/geometry'
import { p3ArcWiring } from '../src/wiring'

// ---------- Helpers ----------

/** Build a canonical thick rhomb (type 1) with unit side length */
function makeThickRhomb(): Rhomb {
  const v0: Vec2 = [cos36, 0]
  const v1: Vec2 = [0, sin36]
  const v2: Vec2 = [-cos36, 0]
  const v3: Vec2 = [0, -sin36]
  return {
    type: 1,
    v0, v1, v2, v3,
    healed: false,
    edges: [[v0, v1], [v1, v2], [v2, v3], [v3, v0]],
  }
}

/** Build a canonical thin rhomb (type 0) with unit side length */
function makeThinRhomb(): Rhomb {
  const v0: Vec2 = [cos18, 0]
  const v1: Vec2 = [0, sin18]
  const v2: Vec2 = [-cos18, 0]
  const v3: Vec2 = [0, -sin18]
  return {
    type: 0,
    v0, v1, v2, v3,
    healed: false,
    edges: [[v0, v1], [v1, v2], [v2, v3], [v3, v0]],
  }
}

/** Compute side length of a rhomb (distance v0→v1) */
function sideLength(r: Rhomb): number {
  return Math.hypot(r.v1[0] - r.v0[0], r.v1[1] - r.v0[1])
}

/** Check if a point lies on any edge of the rhomb within tolerance */
function pointOnRhombEdge(p: Vec2, r: Rhomb, tol = 1e-8): boolean {
  for (const [a, b] of r.edges) {
    // Check if p is on segment a→b
    const ab = [b[0] - a[0], b[1] - a[1]]
    const ap = [p[0] - a[0], p[1] - a[1]]
    const abLen2 = ab[0] * ab[0] + ab[1] * ab[1]
    if (abLen2 < 1e-20) continue
    const t = (ap[0] * ab[0] + ap[1] * ab[1]) / abLen2
    if (t < -tol || t > 1 + tol) continue
    // Distance from p to line through a,b
    const cross = Math.abs(ap[0] * ab[1] - ap[1] * ab[0])
    const dist = cross / Math.sqrt(abLen2)
    if (dist < tol) return true
  }
  return false
}

// ---------- p3ArcWiring strategy ----------

describe('p3ArcWiring', () => {
  it('has name "p3ArcWiring"', () => {
    expect(p3ArcWiring.name).toBe('p3ArcWiring')
  })

  it('has a createConduits method', () => {
    expect(typeof p3ArcWiring.createConduits).toBe('function')
  })
})

// ---------- Thick rhomb conduits ----------

describe('p3ArcWiring — thick rhomb', () => {
  const rhomb = makeThickRhomb()
  const side = sideLength(rhomb)
  let conduits: Conduit[]

  // Run once for all tests in this block
  it('produces exactly 2 conduits', () => {
    conduits = p3ArcWiring.createConduits(rhomb, 0, side)
    expect(conduits).toHaveLength(2)
  })

  it('conduit 0 has positive length', () => {
    conduits = p3ArcWiring.createConduits(rhomb, 0, side)
    expect(conduits[0].length).toBeGreaterThan(0)
  })

  it('conduit 1 has positive length', () => {
    conduits = p3ArcWiring.createConduits(rhomb, 0, side)
    expect(conduits[1].length).toBeGreaterThan(0)
  })

  it('conduit rhombIdx matches input', () => {
    conduits = p3ArcWiring.createConduits(rhomb, 42, side)
    expect(conduits[0].rhombIdx).toBe(42)
    expect(conduits[1].rhombIdx).toBe(42)
  })

  it('conduit indices are 0 and 1', () => {
    conduits = p3ArcWiring.createConduits(rhomb, 0, side)
    expect(conduits[0].conduitIdx).toBe(0)
    expect(conduits[1].conduitIdx).toBe(1)
  })

  it('conduit type matches rhomb type (1 = thick)', () => {
    conduits = p3ArcWiring.createConduits(rhomb, 0, side)
    expect(conduits[0].type).toBe(1)
    expect(conduits[1].type).toBe(1)
  })

  it('P1 endpoints lie on rhomb edges', () => {
    conduits = p3ArcWiring.createConduits(rhomb, 0, side)
    for (const c of conduits) {
      expect(pointOnRhombEdge(c.P1, rhomb)).toBe(true)
    }
  })

  it('P2 endpoints lie on rhomb edges', () => {
    conduits = p3ArcWiring.createConduits(rhomb, 0, side)
    for (const c of conduits) {
      expect(pointOnRhombEdge(c.P2, rhomb)).toBe(true)
    }
  })

  it('all conduit paths are arc type', () => {
    conduits = p3ArcWiring.createConduits(rhomb, 0, side)
    for (const c of conduits) {
      expect(c.path.kind).toBe('arc')
    }
  })

  it('arc radii match template: conduit 0 uses TAU², conduit 1 uses TAU', () => {
    conduits = p3ArcWiring.createConduits(rhomb, 0, side)
    // Thick: arcRadii = [TAU*TAU, TAU], scaled by side length
    const expectedR0 = TAU * TAU * side
    const expectedR1 = TAU * side
    if (conduits[0].path.kind === 'arc') {
      expect(conduits[0].path.radius).toBeCloseTo(expectedR0, 10)
    }
    if (conduits[1].path.kind === 'arc') {
      expect(conduits[1].path.radius).toBeCloseTo(expectedR1, 10)
    }
  })

  it('analytical length matches radius * sweep angle', () => {
    conduits = p3ArcWiring.createConduits(rhomb, 0, side)
    for (const c of conduits) {
      if (c.path.kind === 'arc') {
        const sweep = Math.abs(c.path.endAngle - c.path.startAngle)
        const analyticalLength = c.path.radius * sweep
        expect(c.length).toBeCloseTo(analyticalLength, 10)
      }
    }
  })
})

// ---------- Thin rhomb conduits ----------

describe('p3ArcWiring — thin rhomb', () => {
  const rhomb = makeThinRhomb()
  const side = sideLength(rhomb)

  it('produces exactly 2 conduits', () => {
    const conduits = p3ArcWiring.createConduits(rhomb, 0, side)
    expect(conduits).toHaveLength(2)
  })

  it('all conduit lengths are positive', () => {
    const conduits = p3ArcWiring.createConduits(rhomb, 0, side)
    for (const c of conduits) {
      expect(c.length).toBeGreaterThan(0)
    }
  })

  it('conduit type matches rhomb type (0 = thin)', () => {
    const conduits = p3ArcWiring.createConduits(rhomb, 0, side)
    expect(conduits[0].type).toBe(0)
    expect(conduits[1].type).toBe(0)
  })

  it('P1 and P2 endpoints lie on rhomb edges', () => {
    const conduits = p3ArcWiring.createConduits(rhomb, 0, side)
    for (const c of conduits) {
      expect(pointOnRhombEdge(c.P1, rhomb)).toBe(true)
      expect(pointOnRhombEdge(c.P2, rhomb)).toBe(true)
    }
  })

  it('arc radii match template: both conduits use TAU²', () => {
    const conduits = p3ArcWiring.createConduits(rhomb, 0, side)
    // Thin: arcRadii = [TAU*TAU, TAU*TAU], both small
    const expectedR = TAU * TAU * side
    for (const c of conduits) {
      if (c.path.kind === 'arc') {
        expect(c.path.radius).toBeCloseTo(expectedR, 10)
      }
    }
  })

  it('all conduit paths are arc type', () => {
    const conduits = p3ArcWiring.createConduits(rhomb, 0, side)
    for (const c of conduits) {
      expect(c.path.kind).toBe('arc')
    }
  })

  it('analytical length matches radius * sweep angle', () => {
    const conduits = p3ArcWiring.createConduits(rhomb, 0, side)
    for (const c of conduits) {
      if (c.path.kind === 'arc') {
        const sweep = Math.abs(c.path.endAngle - c.path.startAngle)
        const analyticalLength = c.path.radius * sweep
        expect(c.length).toBeCloseTo(analyticalLength, 10)
      }
    }
  })
})

// ---------- Arc geometry consistency ----------

describe('p3ArcWiring — arc geometry', () => {
  it('arc center is at the acute vertex (v0 for conduit 0, v2 for conduit 1)', () => {
    const rhomb = makeThickRhomb()
    const side = sideLength(rhomb)
    const conduits = p3ArcWiring.createConduits(rhomb, 0, side)
    // Conduit 0: arc at v0, conduit 1: arc at v2
    if (conduits[0].path.kind === 'arc') {
      expect(conduits[0].path.center[0]).toBeCloseTo(rhomb.v0[0], 10)
      expect(conduits[0].path.center[1]).toBeCloseTo(rhomb.v0[1], 10)
    }
    if (conduits[1].path.kind === 'arc') {
      expect(conduits[1].path.center[0]).toBeCloseTo(rhomb.v2[0], 10)
      expect(conduits[1].path.center[1]).toBeCloseTo(rhomb.v2[1], 10)
    }
  })

  it('P1 and P2 are equidistant from arc center (radius consistency)', () => {
    const rhomb = makeThickRhomb()
    const side = sideLength(rhomb)
    const conduits = p3ArcWiring.createConduits(rhomb, 0, side)
    for (const c of conduits) {
      if (c.path.kind === 'arc') {
        const distP1 = Math.hypot(c.P1[0] - c.path.center[0], c.P1[1] - c.path.center[1])
        const distP2 = Math.hypot(c.P2[0] - c.path.center[0], c.P2[1] - c.path.center[1])
        expect(distP1).toBeCloseTo(c.path.radius, 10)
        expect(distP2).toBeCloseTo(c.path.radius, 10)
      }
    }
  })

  it('thick rhomb conduit lengths differ (small arc ≠ large arc)', () => {
    const rhomb = makeThickRhomb()
    const side = sideLength(rhomb)
    const conduits = p3ArcWiring.createConduits(rhomb, 0, side)
    // TAU² ≈ 0.382, TAU ≈ 0.618 — different radii → different lengths
    expect(conduits[0].length).not.toBeCloseTo(conduits[1].length, 5)
  })

  it('thin rhomb conduit lengths are equal (both TAU²)', () => {
    const rhomb = makeThinRhomb()
    const side = sideLength(rhomb)
    const conduits = p3ArcWiring.createConduits(rhomb, 0, side)
    // Both conduits use TAU² radius → same sweep angle → same length
    expect(conduits[0].length).toBeCloseTo(conduits[1].length, 10)
  })
})

// ---------- Tiling-space coordinates ----------

describe('p3ArcWiring — tiling space', () => {
  it('conduit values are in tiling space (no large screen-space numbers)', () => {
    const rhomb = makeThickRhomb()
    const side = sideLength(rhomb)
    const conduits = p3ArcWiring.createConduits(rhomb, 0, side)
    for (const c of conduits) {
      // Tiling-space unit rhomb: all coordinates should be within [-2, 2]
      expect(Math.abs(c.P1[0])).toBeLessThan(2)
      expect(Math.abs(c.P1[1])).toBeLessThan(2)
      expect(Math.abs(c.P2[0])).toBeLessThan(2)
      expect(Math.abs(c.P2[1])).toBeLessThan(2)
      // Lengths should be well under 10 for a unit-side rhomb
      expect(c.length).toBeLessThan(10)
    }
  })
})

// ---------- WiringStrategy interface contract ----------

describe('p3ArcWiring — interface contract', () => {
  it('implements WiringStrategy interface (name + createConduits)', () => {
    expect(typeof p3ArcWiring.name).toBe('string')
    expect(typeof p3ArcWiring.createConduits).toBe('function')
  })

  it('conduits have all required Conduit fields', () => {
    const rhomb = makeThickRhomb()
    const side = sideLength(rhomb)
    const conduits = p3ArcWiring.createConduits(rhomb, 0, side)
    for (const c of conduits) {
      expect(c).toHaveProperty('rhombIdx')
      expect(c).toHaveProperty('conduitIdx')
      expect(c).toHaveProperty('P1')
      expect(c).toHaveProperty('P2')
      expect(c).toHaveProperty('length')
      expect(c).toHaveProperty('type')
      expect(c).toHaveProperty('path')
      expect(c.P1).toHaveLength(2)
      expect(c.P2).toHaveLength(2)
    }
  })
})
