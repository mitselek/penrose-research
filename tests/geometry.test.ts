// (*PD:Shechtman*)
// Geometry module tests — Vec2 ops, constants, trig values
// Spec ref: Design spec → Types (Vec2), Testing Strategy → geometry.test.ts
// Domain gotcha: TAU = 1/PHI ≈ 0.618, NOT 2π. See docs/tau-disambiguation.md

import { describe, it, expect } from 'vitest'
import {
  vadd,
  vsub,
  vscale,
  PHI,
  TAU,
  sin36,
  cos36,
  sin18,
  cos18,
} from '../src/geometry'

// ---------- Constants ----------

describe('constants', () => {
  it('PHI equals the golden ratio (1 + sqrt(5)) / 2', () => {
    expect(PHI).toBe((1 + Math.sqrt(5)) / 2)
  })

  it('PHI is approximately 1.618033988749895', () => {
    expect(PHI).toBeCloseTo(1.618033988749895, 15)
  })

  it('TAU equals 1/PHI (NOT 2π)', () => {
    expect(TAU).toBe(1 / PHI)
  })

  it('TAU is approximately 0.6180339887498949', () => {
    expect(TAU).toBeCloseTo(0.6180339887498949, 15)
  })

  it('TAU is NOT 2π', () => {
    expect(Math.abs(TAU - 2 * Math.PI)).toBeGreaterThan(5)
  })

  it('PHI * TAU === 1 (golden ratio identity)', () => {
    // IEEE 754: (1+sqrt(5))/2 * 2/(1+sqrt(5)) yields 0.9999999999999999
    expect(PHI * TAU).toBeCloseTo(1, 15)
  })

  it('PHI - TAU === 1 (golden ratio identity)', () => {
    expect(PHI - TAU).toBeCloseTo(1, 14)
  })

  it('PHI² === PHI + 1 (golden ratio identity)', () => {
    expect(PHI * PHI).toBeCloseTo(PHI + 1, 14)
  })
})

// ---------- Trigonometric constants ----------

describe('trigonometric constants', () => {
  it('sin36 matches Math.sin(π/5)', () => {
    expect(sin36).toBe(Math.sin(Math.PI / 5))
  })

  it('cos36 matches Math.cos(π/5)', () => {
    expect(cos36).toBe(Math.cos(Math.PI / 5))
  })

  it('sin18 matches Math.sin(π/10)', () => {
    expect(sin18).toBe(Math.sin(Math.PI / 10))
  })

  it('cos18 matches Math.cos(π/10)', () => {
    expect(cos18).toBe(Math.cos(Math.PI / 10))
  })

  it('sin36 is approximately 0.5878', () => {
    expect(sin36).toBeCloseTo(0.5878, 4)
  })

  it('cos36 is approximately 0.8090', () => {
    expect(cos36).toBeCloseTo(0.8090, 4)
  })

  it('sin²36 + cos²36 === 1', () => {
    expect(sin36 * sin36 + cos36 * cos36).toBeCloseTo(1, 14)
  })

  it('sin²18 + cos²18 === 1', () => {
    expect(sin18 * sin18 + cos18 * cos18).toBeCloseTo(1, 14)
  })
})

// ---------- Vector operations ----------

describe('vadd', () => {
  it('adds two vectors', () => {
    expect(vadd([1, 2], [3, 4])).toEqual([4, 6])
  })

  it('is commutative', () => {
    expect(vadd([1, 2], [3, 4])).toEqual(vadd([3, 4], [1, 2]))
  })

  it('adding zero vector returns original', () => {
    expect(vadd([5, -3], [0, 0])).toEqual([5, -3])
  })

  it('works with negative values', () => {
    expect(vadd([-1, -2], [-3, -4])).toEqual([-4, -6])
  })

  it('works with floating point values', () => {
    const result = vadd([0.1, 0.2], [0.3, 0.4])
    expect(result[0]).toBeCloseTo(0.4, 14)
    expect(result[1]).toBeCloseTo(0.6, 14)
  })
})

describe('vsub', () => {
  it('subtracts two vectors', () => {
    expect(vsub([5, 3], [2, 1])).toEqual([3, 2])
  })

  it('subtracting zero vector returns original', () => {
    expect(vsub([5, -3], [0, 0])).toEqual([5, -3])
  })

  it('subtracting self returns zero vector', () => {
    expect(vsub([7, 11], [7, 11])).toEqual([0, 0])
  })

  it('works with negative values', () => {
    expect(vsub([-1, -2], [-3, -4])).toEqual([2, 2])
  })

  it('is inverse of vadd: vsub(vadd(a,b), b) === a', () => {
    const a: [number, number] = [3.7, -2.1]
    const b: [number, number] = [1.5, 4.8]
    const result = vsub(vadd(a, b), b)
    expect(result[0]).toBeCloseTo(a[0], 14)
    expect(result[1]).toBeCloseTo(a[1], 14)
  })
})

describe('vscale', () => {
  it('scales a vector by a scalar', () => {
    expect(vscale([2, 3], 0.5)).toEqual([1, 1.5])
  })

  it('scaling by 1 returns same vector', () => {
    expect(vscale([4, -7], 1)).toEqual([4, -7])
  })

  it('scaling by 0 returns zero vector', () => {
    const result = vscale([4, -7], 0)
    // IEEE 754: -7 * 0 = -0, which is mathematically zero
    expect(result[0]).toBe(0)
    expect(result[1] + 0).toBe(0) // -0 + 0 === 0
  })

  it('scaling by -1 negates vector', () => {
    expect(vscale([3, -5], -1)).toEqual([-3, 5])
  })

  it('scaling zero vector returns zero vector', () => {
    expect(vscale([0, 0], 42)).toEqual([0, 0])
  })

  it('works with PHI and TAU scalars', () => {
    const v: [number, number] = [1, 0]
    const scaled = vscale(v, PHI)
    expect(scaled[0]).toBeCloseTo(PHI, 14)
    expect(scaled[1]).toBe(0)
  })
})

// ---------- Vec2 type contract ----------

describe('Vec2 type contract', () => {
  it('vadd returns a 2-element array', () => {
    const result = vadd([1, 2], [3, 4])
    expect(result).toHaveLength(2)
  })

  it('vsub returns a 2-element array', () => {
    const result = vsub([1, 2], [3, 4])
    expect(result).toHaveLength(2)
  })

  it('vscale returns a 2-element array', () => {
    const result = vscale([1, 2], 3)
    expect(result).toHaveLength(2)
  })
})
