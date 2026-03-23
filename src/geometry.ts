// (*PD:Ammann*)
// Penrose P3 Rhomb Tiling — Vec2 operations and constants
// Spec ref: Design spec → Module Structure → geometry.ts
// Domain gotcha: TAU = 1/PHI ≈ 0.618, NOT 2π. See docs/tau-disambiguation.md

import type { Vec2 } from './types'

// ================================================================
// Constants
// ================================================================

export const PHI: number = (1 + Math.sqrt(5)) / 2
export const TAU: number = 1 / PHI // ≈ 0.618 — subdivision scaling factor, NOT 2π

const PI: number = Math.PI
export const sin36: number = Math.sin(PI / 5)
export const cos36: number = Math.cos(PI / 5)
export const sin18: number = Math.sin(PI / 10)
export const cos18: number = Math.cos(PI / 10)

// ================================================================
// Vec2 operations
// ================================================================

export function vadd(a: Vec2, b: Vec2): Vec2 {
  return [a[0] + b[0], a[1] + b[1]]
}

export function vsub(a: Vec2, b: Vec2): Vec2 {
  return [a[0] - b[0], a[1] - b[1]]
}

export function vscale(v: Vec2, s: number): Vec2 {
  return [v[0] * s, v[1] * s]
}
