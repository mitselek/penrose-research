// (*PD:Shechtman*)
// Subdivision module tests — Robinson triangles, rhomb construction, heal mechanics
// Spec ref: Design spec → Testing Strategy → subdivision.test.ts
// Source ref: penrose.js lines 30–176

import { describe, it, expect } from 'vitest'
import type { Vec2 } from '../src/types'
import { PHI, TAU, sin36, cos36, sin18, cos18 } from '../src/geometry'
import {
  THICK_TEMPLATE,
  THIN_TEMPLATE,
  subdivide,
  subdivide_A,
  subdivide_B,
  makeRhomb,
  healToRhombs,
  subdivideRhombs,
  reflect,
  vkey,
  edgeKey,
} from '../src/subdivision'

// ---------- Helper: approximate Vec2 equality ----------

function vec2Close(actual: Vec2, expected: Vec2, precision = 10): void {
  expect(actual[0]).toBeCloseTo(expected[0], precision)
  expect(actual[1]).toBeCloseTo(expected[1], precision)
}

// ---------- Template constants ----------

describe('THICK_TEMPLATE', () => {
  it('has 4 vertices', () => {
    expect(THICK_TEMPLATE.verts).toHaveLength(4)
  })

  it('has angles [72, 108, 72, 108]', () => {
    expect(THICK_TEMPLATE.angles).toEqual([72, 108, 72, 108])
  })

  it('has arcVerts at acute vertices [0, 2]', () => {
    expect(THICK_TEMPLATE.arcVerts).toEqual([0, 2])
  })

  it('has arcRadii [TAU², TAU]', () => {
    expect(THICK_TEMPLATE.arcRadii[0]).toBeCloseTo(TAU * TAU, 14)
    expect(THICK_TEMPLATE.arcRadii[1]).toBeCloseTo(TAU, 14)
  })

  it('vertices match cos36/sin36 diamond shape', () => {
    const v = THICK_TEMPLATE.verts
    vec2Close(v[0], [cos36, 0])
    vec2Close(v[1], [0, sin36])
    vec2Close(v[2], [-cos36, 0])
    vec2Close(v[3], [0, -sin36])
  })

  it('has unit side length (distance v0→v1 ≈ 1)', () => {
    const [x0, y0] = THICK_TEMPLATE.verts[0]
    const [x1, y1] = THICK_TEMPLATE.verts[1]
    const dist = Math.sqrt((x1 - x0) ** 2 + (y1 - y0) ** 2)
    expect(dist).toBeCloseTo(1, 10)
  })
})

describe('THIN_TEMPLATE', () => {
  it('has 4 vertices', () => {
    expect(THIN_TEMPLATE.verts).toHaveLength(4)
  })

  it('has angles [36, 144, 36, 144]', () => {
    expect(THIN_TEMPLATE.angles).toEqual([36, 144, 36, 144])
  })

  it('has arcVerts at acute vertices [0, 2]', () => {
    expect(THIN_TEMPLATE.arcVerts).toEqual([0, 2])
  })

  it('has arcRadii [TAU², TAU²] (both small)', () => {
    expect(THIN_TEMPLATE.arcRadii[0]).toBeCloseTo(TAU * TAU, 14)
    expect(THIN_TEMPLATE.arcRadii[1]).toBeCloseTo(TAU * TAU, 14)
  })

  it('vertices match cos18/sin18 diamond shape', () => {
    const v = THIN_TEMPLATE.verts
    vec2Close(v[0], [cos18, 0])
    vec2Close(v[1], [0, sin18])
    vec2Close(v[2], [-cos18, 0])
    vec2Close(v[3], [0, -sin18])
  })

  it('has unit side length (distance v0→v1 ≈ 1)', () => {
    const [x0, y0] = THIN_TEMPLATE.verts[0]
    const [x1, y1] = THIN_TEMPLATE.verts[1]
    const dist = Math.sqrt((x1 - x0) ** 2 + (y1 - y0) ** 2)
    expect(dist).toBeCloseTo(1, 10)
  })
})

// ---------- subdivide() — Robinson triangle splitting ----------

describe('subdivide', () => {
  it('type 0 (acute) triangle produces 2 children', () => {
    const tri = { type: 0 as const, A: [0, 0] as Vec2, B: [1, 0] as Vec2, C: [0.5, 0.8] as Vec2 }
    const result = subdivide([tri])
    expect(result).toHaveLength(2)
  })

  it('type 0 triangle produces 1 type-0 and 1 type-1 child', () => {
    const tri = { type: 0 as const, A: [0, 0] as Vec2, B: [1, 0] as Vec2, C: [0.5, 0.8] as Vec2 }
    const result = subdivide([tri])
    const types = result.map(t => t.type).sort()
    expect(types).toEqual([0, 1])
  })

  it('type 1 (obtuse) triangle produces 3 children', () => {
    const tri = { type: 1 as const, A: [0, 0] as Vec2, B: [1, 0] as Vec2, C: [0.5, 0.3] as Vec2 }
    const result = subdivide([tri])
    expect(result).toHaveLength(3)
  })

  it('type 1 triangle produces 2 type-1 and 1 type-0 child', () => {
    const tri = { type: 1 as const, A: [0, 0] as Vec2, B: [1, 0] as Vec2, C: [0.5, 0.3] as Vec2 }
    const result = subdivide([tri])
    const types = result.map(t => t.type).sort()
    expect(types).toEqual([0, 1, 1])
  })

  it('children have valid Vec2 vertices (A, B, C)', () => {
    const tri = { type: 0 as const, A: [0, 0] as Vec2, B: [1, 0] as Vec2, C: [0.5, 0.8] as Vec2 }
    const result = subdivide([tri])
    for (const child of result) {
      expect(child.A).toHaveLength(2)
      expect(child.B).toHaveLength(2)
      expect(child.C).toHaveLength(2)
      expect(typeof child.A[0]).toBe('number')
      expect(typeof child.A[1]).toBe('number')
    }
  })

  it('multiple triangles are all subdivided', () => {
    const tris = [
      { type: 0 as const, A: [0, 0] as Vec2, B: [1, 0] as Vec2, C: [0.5, 0.8] as Vec2 },
      { type: 1 as const, A: [0, 0] as Vec2, B: [1, 0] as Vec2, C: [0.5, 0.3] as Vec2 },
    ]
    const result = subdivide(tris)
    expect(result).toHaveLength(5) // 2 + 3
  })

  it('empty input produces empty output', () => {
    const result = subdivide([])
    expect(result).toHaveLength(0)
  })

  it('type 0 subdivision uses TAU scaling on edge A→B', () => {
    // From penrose.js: P = vadd(A, vscale(vsub(B, A), TAU))
    const A: Vec2 = [0, 0]
    const B: Vec2 = [1, 0]
    const C: Vec2 = [0.5, 0.8]
    const result = subdivide([{ type: 0, A, B, C }])
    // P should be at TAU along A→B = [TAU, 0]
    // Child 0: {type:0, A:C, B:P, C:B}  → P is at child.B
    // Child 1: {type:1, A:P, B:C, C:A}  → P is at child.A
    const P: Vec2 = [TAU, 0]
    vec2Close(result[0].B, P)
    vec2Close(result[1].A, P)
  })
})

// ---------- subdivide_A() — thick rhomb → triangles ----------

describe('subdivide_A', () => {
  it('produces 6 child triangles from a thick rhomb', () => {
    const v = THICK_TEMPLATE.verts
    const result = subdivide_A(v[0] as Vec2, v[1] as Vec2, v[2] as Vec2, v[3] as Vec2)
    expect(result).toHaveLength(6)
  })

  it('produces 4 type-1 and 2 type-0 triangles', () => {
    const v = THICK_TEMPLATE.verts
    const result = subdivide_A(v[0] as Vec2, v[1] as Vec2, v[2] as Vec2, v[3] as Vec2)
    const type0Count = result.filter(t => t.type === 0).length
    const type1Count = result.filter(t => t.type === 1).length
    expect(type0Count).toBe(2)
    expect(type1Count).toBe(4)
  })
})

// ---------- subdivide_B() — thin rhomb → triangles ----------

describe('subdivide_B', () => {
  it('produces 4 child triangles from a thin rhomb', () => {
    const v = THIN_TEMPLATE.verts
    const result = subdivide_B(v[0] as Vec2, v[1] as Vec2, v[2] as Vec2, v[3] as Vec2)
    expect(result).toHaveLength(4)
  })

  it('produces 2 type-0 and 2 type-1 triangles', () => {
    const v = THIN_TEMPLATE.verts
    const result = subdivide_B(v[0] as Vec2, v[1] as Vec2, v[2] as Vec2, v[3] as Vec2)
    const type0Count = result.filter(t => t.type === 0).length
    const type1Count = result.filter(t => t.type === 1).length
    expect(type0Count).toBe(2)
    expect(type1Count).toBe(2)
  })
})

// ---------- vkey() ----------

describe('vkey', () => {
  it('rounds to 4 decimal places', () => {
    const key = vkey([1.23456789, -0.98765432])
    expect(key).toBe('1.2346,-0.9877')
  })

  it('zero vector gives "0.0000,0.0000"', () => {
    const key = vkey([0, 0])
    expect(key).toBe('0.0000,0.0000')
  })

  it('same logical point produces same key', () => {
    const k1 = vkey([1.00001, 2.00001])
    const k2 = vkey([1.00002, 2.00002])
    // Both round to same 4-decimal value
    expect(k1).toBe(k2)
  })

  it('sufficiently different points produce different keys', () => {
    const k1 = vkey([1.0000, 2.0000])
    const k2 = vkey([1.0001, 2.0001])
    expect(k1).not.toBe(k2)
  })

  it('negative values are handled correctly', () => {
    const key = vkey([-3.5, -7.25])
    expect(key).toBe('-3.5000,-7.2500')
  })
})

// ---------- edgeKey() ----------

describe('edgeKey', () => {
  it('is symmetric: edgeKey(a,b) === edgeKey(b,a)', () => {
    const a: Vec2 = [1, 2]
    const b: Vec2 = [3, 4]
    expect(edgeKey(a, b)).toBe(edgeKey(b, a))
  })

  it('different edges produce different keys', () => {
    const a: Vec2 = [0, 0]
    const b: Vec2 = [1, 0]
    const c: Vec2 = [0, 1]
    expect(edgeKey(a, b)).not.toBe(edgeKey(a, c))
  })

  it('uses pipe separator between vertex keys', () => {
    const a: Vec2 = [1, 2]
    const b: Vec2 = [3, 4]
    const key = edgeKey(a, b)
    expect(key).toContain('|')
  })
})

// ---------- reflect() ----------

describe('reflect', () => {
  it('reflects point across horizontal line', () => {
    // A=(0,1) reflected across y=0 line (B=(0,0), C=(1,0)) → (0,-1)
    const result = reflect([0, 1] as Vec2, [0, 0] as Vec2, [1, 0] as Vec2)
    vec2Close(result, [0, -1])
  })

  it('reflects point across vertical line', () => {
    // A=(1,0) reflected across x=0 line (B=(0,0), C=(0,1)) → (-1,0)
    const result = reflect([1, 0] as Vec2, [0, 0] as Vec2, [0, 1] as Vec2)
    vec2Close(result, [-1, 0])
  })

  it('point on the line reflects to itself', () => {
    // A on line BC → reflected to same point
    const result = reflect([0.5, 0] as Vec2, [0, 0] as Vec2, [1, 0] as Vec2)
    vec2Close(result, [0.5, 0])
  })

  it('double reflection returns original point', () => {
    const A: Vec2 = [3, 5]
    const B: Vec2 = [0, 0]
    const C: Vec2 = [1, 1]
    const reflected = reflect(A, B, C)
    const doubleReflected = reflect(reflected, B, C)
    vec2Close(doubleReflected, A)
  })

  it('preserves distance to line', () => {
    const A: Vec2 = [2, 3]
    const B: Vec2 = [0, 0]
    const C: Vec2 = [4, 0]
    const result = reflect(A, B, C)
    // Distance from A to line y=0 is 3, so reflected point should have y=-3
    expect(result[0]).toBeCloseTo(2, 10)
    expect(result[1]).toBeCloseTo(-3, 10)
  })
})

// ---------- makeRhomb() — canonical vertex ordering ----------

describe('makeRhomb', () => {
  it('thick (type 1): canonical order v0=base1, v1=apex2, v2=base2, v3=apex1', () => {
    const apex1: Vec2 = [0, 1]
    const base1: Vec2 = [1, 0]
    const apex2: Vec2 = [0, -1]
    const base2: Vec2 = [-1, 0]
    const r = makeRhomb(1, apex1, base1, apex2, base2, false)
    expect(r.type).toBe(1)
    vec2Close(r.v0, base1)    // v0 = base1 (72° acute)
    vec2Close(r.v1, apex2)    // v1 = apex2 (108° obtuse)
    vec2Close(r.v2, base2)    // v2 = base2 (72° acute)
    vec2Close(r.v3, apex1)    // v3 = apex1 (108° obtuse)
  })

  it('thin (type 0): canonical order v0=apex1, v1=base1, v2=apex2, v3=base2', () => {
    const apex1: Vec2 = [1, 0]
    const base1: Vec2 = [0, 1]
    const apex2: Vec2 = [-1, 0]
    const base2: Vec2 = [0, -1]
    const r = makeRhomb(0, apex1, base1, apex2, base2, false)
    expect(r.type).toBe(0)
    vec2Close(r.v0, apex1)    // v0 = apex1 (36° acute)
    vec2Close(r.v1, base1)    // v1 = base1 (144° obtuse)
    vec2Close(r.v2, apex2)    // v2 = apex2 (36° acute)
    vec2Close(r.v3, base2)    // v3 = base2 (144° obtuse)
  })

  it('preserves healed flag (false)', () => {
    const r = makeRhomb(1, [0, 0] as Vec2, [1, 0] as Vec2, [0, 1] as Vec2, [-1, 0] as Vec2, false)
    expect(r.healed).toBe(false)
  })

  it('preserves healed flag (true)', () => {
    const r = makeRhomb(1, [0, 0] as Vec2, [1, 0] as Vec2, [0, 1] as Vec2, [-1, 0] as Vec2, true)
    expect(r.healed).toBe(true)
  })
})

// ---------- healToRhombs() ----------

describe('healToRhombs', () => {
  it('pairs matching triangles into non-healed rhombs', () => {
    // Two type-1 triangles sharing base edge B-C
    const t1 = { type: 1 as const, A: [0, 1] as Vec2, B: [0, 0] as Vec2, C: [1, 0] as Vec2 }
    const t2 = { type: 1 as const, A: [1, 1] as Vec2, B: [0, 0] as Vec2, C: [1, 0] as Vec2 }
    const rhombs = healToRhombs([t1, t2])
    expect(rhombs).toHaveLength(1)
    expect(rhombs[0].healed).toBe(false)
  })

  it('heals unpaired triangles by reflection', () => {
    // Single triangle with no pair → healed rhomb
    const t1 = { type: 0 as const, A: [0, 1] as Vec2, B: [0, 0] as Vec2, C: [1, 0] as Vec2 }
    const rhombs = healToRhombs([t1])
    expect(rhombs).toHaveLength(1)
    expect(rhombs[0].healed).toBe(true)
  })

  it('healed rhomb has reflected apex', () => {
    const A: Vec2 = [0.5, 1]
    const B: Vec2 = [0, 0]
    const C: Vec2 = [1, 0]
    const t1 = { type: 0 as const, A, B, C }
    const rhombs = healToRhombs([t1])
    // The reflected apex should be across line BC (y=0 line)
    const expectedReflection = reflect(A, B, C)
    // For thin (type 0): v0=apex1, v1=base1, v2=apex2(reflected), v3=base2
    vec2Close(rhombs[0].v2, expectedReflection)
  })

  it('empty input produces empty output', () => {
    const rhombs = healToRhombs([])
    expect(rhombs).toHaveLength(0)
  })

  it('does not pair triangles of different types', () => {
    // Same base edge but different types → no pairing → 2 healed rhombs
    const t1 = { type: 0 as const, A: [0, 1] as Vec2, B: [0, 0] as Vec2, C: [1, 0] as Vec2 }
    const t2 = { type: 1 as const, A: [1, 1] as Vec2, B: [0, 0] as Vec2, C: [1, 0] as Vec2 }
    const rhombs = healToRhombs([t1, t2])
    expect(rhombs).toHaveLength(2)
    expect(rhombs.every(r => r.healed)).toBe(true)
  })
})

// ---------- subdivideRhombs() — full subdivision pipeline ----------

describe('subdivideRhombs', () => {
  // A single thick rhomb as L0 starting point
  function makeL0Thick() {
    const v = THICK_TEMPLATE.verts
    return [{
      type: 1 as const,
      v0: v[0] as Vec2,
      v1: v[1] as Vec2,
      v2: v[2] as Vec2,
      v3: v[3] as Vec2,
      healed: false,
      edges: [
        [v[0] as Vec2, v[1] as Vec2],
        [v[1] as Vec2, v[2] as Vec2],
        [v[2] as Vec2, v[3] as Vec2],
        [v[3] as Vec2, v[0] as Vec2],
      ] as [Vec2, Vec2][],
    }]
  }

  function makeL0Thin() {
    const v = THIN_TEMPLATE.verts
    return [{
      type: 0 as const,
      v0: v[0] as Vec2,
      v1: v[1] as Vec2,
      v2: v[2] as Vec2,
      v3: v[3] as Vec2,
      healed: false,
      edges: [
        [v[0] as Vec2, v[1] as Vec2],
        [v[1] as Vec2, v[2] as Vec2],
        [v[2] as Vec2, v[3] as Vec2],
        [v[3] as Vec2, v[0] as Vec2],
      ] as [Vec2, Vec2][],
    }]
  }

  it('L0 thick (1 rhomb) → L1 produces rhombs', () => {
    const L1 = subdivideRhombs(makeL0Thick())
    expect(L1.length).toBeGreaterThan(0)
  })

  it('L0 thin (1 rhomb) → L1 produces rhombs', () => {
    const L1 = subdivideRhombs(makeL0Thin())
    expect(L1.length).toBeGreaterThan(0)
  })

  it('all output rhombs have type 0 or 1', () => {
    const L1 = subdivideRhombs(makeL0Thick())
    for (const r of L1) {
      expect([0, 1]).toContain(r.type)
    }
  })

  it('all output rhombs have 4 vertices (v0, v1, v2, v3)', () => {
    const L1 = subdivideRhombs(makeL0Thick())
    for (const r of L1) {
      expect(r.v0).toHaveLength(2)
      expect(r.v1).toHaveLength(2)
      expect(r.v2).toHaveLength(2)
      expect(r.v3).toHaveLength(2)
    }
  })

  it('all output rhombs have a boolean healed flag', () => {
    const L1 = subdivideRhombs(makeL0Thick())
    for (const r of L1) {
      expect(typeof r.healed).toBe('boolean')
    }
  })

  it('rhomb count grows with each subdivision level', () => {
    let rhombs = makeL0Thick()
    const counts: number[] = [rhombs.length]
    for (let i = 0; i < 3; i++) {
      rhombs = subdivideRhombs(rhombs)
      counts.push(rhombs.length)
    }
    // Each level should have more rhombs than the previous
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i]).toBeGreaterThan(counts[i - 1])
    }
  })

  it('empty input produces empty output', () => {
    const result = subdivideRhombs([])
    expect(result).toHaveLength(0)
  })

  it('thick rhomb subdivide_A → heal produces both thick and thin rhombs', () => {
    const L1 = subdivideRhombs(makeL0Thick())
    const types = new Set(L1.map(r => r.type))
    expect(types.has(0)).toBe(true) // thin
    expect(types.has(1)).toBe(true) // thick
  })
})
