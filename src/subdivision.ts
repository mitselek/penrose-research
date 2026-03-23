// (*PD:Ammann*)
// Penrose P3 Rhomb Tiling — Robinson triangle subdivision, heal mechanics, templates
// Spec ref: Design spec → subdivision.ts in Module Structure
// Source ref: penrose.js lines 19–176

import type { Vec2, RhombType, Rhomb } from './types'
import { PHI, TAU, sin36, cos36, sin18, cos18, vadd, vsub, vscale } from './geometry'

// ================================================================
// Canonical template rhombs (unit side, centered at origin)
// ================================================================
// Vertex order (CCW): v0(+x), v1(+y), v2(-x), v3(-y)
//
// Thick (A): v0(72°), v1(108°), v2(72°), v3(108°)
// Thin  (B): v0(36°), v1(144°), v2(36°), v3(144°)
//
// Arcs at acute vertices (v0 and v2) for both types.
// Thick: small(TAU²) at v0, large(TAU) at v2
// Thin:  small(TAU²) at both v0 and v2

export const THICK_TEMPLATE = {
  verts: [[cos36, 0], [0, sin36], [-cos36, 0], [0, -sin36]] as Vec2[],
  angles: [72, 108, 72, 108],
  arcVerts: [0, 2],
  arcRadii: [TAU * TAU, TAU],
  fill: 'rgba(55,48,30,0.7)',
  arcColor: 'rgba(240,200,80,0.55)',
}

export const THIN_TEMPLATE = {
  verts: [[cos18, 0], [0, sin18], [-cos18, 0], [0, -sin18]] as Vec2[],
  angles: [36, 144, 36, 144],
  arcVerts: [0, 2],
  arcRadii: [TAU * TAU, TAU * TAU],
  fill: 'rgba(25,38,60,0.7)',
  arcColor: 'rgba(100,180,255,0.55)',
}

// ================================================================
// Robinson triangle type
// ================================================================

interface RobinsonTriangle {
  type: 0 | 1  // 0 = acute (36-72-72), 1 = obtuse (108-36-36)
  A: Vec2       // apex
  B: Vec2       // base vertex
  C: Vec2       // base vertex
}

// ================================================================
// Robinson triangle subdivision
// ================================================================
// Type 0 (acute, 36-72-72): A=apex(36°), B,C=base(72°)
// Type 1 (obtuse, 108-36-36): A=apex(108°), B,C=base(36°)

export function subdivide(tris: RobinsonTriangle[]): RobinsonTriangle[] {
  const out: RobinsonTriangle[] = []
  for (const { type, A, B, C } of tris) {
    if (type === 0) {
      const P = vadd(A, vscale(vsub(B, A), TAU))
      out.push({ type: 0, A: C, B: P, C: B })
      out.push({ type: 1, A: P, B: C, C: A })
    } else {
      const Q = vadd(B, vscale(vsub(A, B), TAU))
      const R = vadd(B, vscale(vsub(C, B), TAU))
      out.push({ type: 1, A: R, B: C, C: A })
      out.push({ type: 1, A: Q, B: R, C: B })
      out.push({ type: 0, A: R, B: Q, C: A })
    }
  }
  return out
}

// ================================================================
// Rhomb-level subdivision
// ================================================================

// Thick rhomb (A) → 6 child triangles (4 type-1 + 2 type-0)
// Split along long diagonal v0↔v2, both halves subdivide from v0
export function subdivide_A(v0: Vec2, v1: Vec2, v2: Vec2, v3: Vec2): RobinsonTriangle[] {
  return subdivide([
    { type: 1, A: v1, B: v0, C: v2 },  // upper
    { type: 1, A: v3, B: v0, C: v2 },  // lower (mirror)
  ])
}

// Thin rhomb (B) → 4 child triangles (2 type-0 + 2 type-1)
// Split along short diagonal v1↔v3, both halves subdivide from v1
export function subdivide_B(v0: Vec2, v1: Vec2, v2: Vec2, v3: Vec2): RobinsonTriangle[] {
  return subdivide([
    { type: 0, A: v0, B: v1, C: v3 },  // right
    { type: 0, A: v2, B: v1, C: v3 },  // left (mirror)
  ])
}

// ================================================================
// Vertex and edge key helpers
// ================================================================

export function vkey(v: Vec2): string {
  return (Math.round(v[0] * 1e4) * 1e-4).toFixed(4) + ',' +
         (Math.round(v[1] * 1e4) * 1e-4).toFixed(4)
}

export function edgeKey(a: Vec2, b: Vec2): string {
  const ka = vkey(a), kb = vkey(b)
  return ka < kb ? ka + '|' + kb : kb + '|' + ka
}

// ================================================================
// Reflection
// ================================================================

// Reflect point A across line B-C
export function reflect(A: Vec2, B: Vec2, C: Vec2): Vec2 {
  const dx = C[0] - B[0], dy = C[1] - B[1]
  const t = ((A[0] - B[0]) * dx + (A[1] - B[1]) * dy) / (dx * dx + dy * dy)
  return [2 * (B[0] + t * dx) - A[0], 2 * (B[1] + t * dy) - A[1]]
}

// ================================================================
// Rhomb construction
// ================================================================

// Build canonical rhomb from triangle vertices
// Canonical vertex order:
//   Thick (A): v0(72°), v1(108°), v2(72°), v3(108°)
//   Thin  (B): v0(36°), v1(144°), v2(36°), v3(144°)
//
// From Robinson triangle {type, A(apex), B(base), C(base)}:
//   Type 1 (thick): A=108°, B→72°, C→72°
//     canonical: v0=B, v1=A', v2=C, v3=A
//   Type 0 (thin):  A=36°, B→144°, C→144°
//     canonical: v0=A, v1=B, v2=A', v3=C
export function makeRhomb(
  type: RhombType,
  apex1: Vec2,
  base1: Vec2,
  apex2: Vec2,
  base2: Vec2,
  healed: boolean,
): Rhomb {
  let v0: Vec2, v1: Vec2, v2: Vec2, v3: Vec2
  if (type === 1) {
    v0 = base1; v1 = apex2; v2 = base2; v3 = apex1
  } else {
    v0 = apex1; v1 = base1; v2 = apex2; v3 = base2
  }
  return {
    type,
    v0, v1, v2, v3,
    healed,
    edges: [[v0, v1], [v1, v2], [v2, v3], [v3, v0]],
  }
}

// ================================================================
// Pairing & healing
// ================================================================

// Pair triangles by shared base edge, heal unpaired by reflection
export function healToRhombs(tris: RobinsonTriangle[]): Rhomb[] {
  const pm = new Map<string, number[]>()
  for (let i = 0; i < tris.length; i++) {
    const t = tris[i]
    const key = t.type + '_' + edgeKey(t.B, t.C)
    if (!pm.has(key)) pm.set(key, [])
    pm.get(key)!.push(i)
  }

  const rhombs: Rhomb[] = []
  const used = new Set<number>()

  // Pair where possible
  for (const [, indices] of pm) {
    if (indices.length !== 2) continue
    const [i, j] = indices
    const t1 = tris[i], t2 = tris[j]
    if (t1.type !== t2.type) continue
    rhombs.push(makeRhomb(t1.type, t1.A, t1.B, t2.A, t1.C, false))
    used.add(i)
    used.add(j)
  }

  // Heal unpaired
  for (let i = 0; i < tris.length; i++) {
    if (used.has(i)) continue
    const t = tris[i]
    const Ap = reflect(t.A, t.B, t.C)
    rhombs.push(makeRhomb(t.type, t.A, t.B, Ap, t.C, true))
  }

  return rhombs
}

// ================================================================
// Full subdivision pipeline
// ================================================================

// Subdivide all rhombs → next level
export function subdivideRhombs(rhombs: Rhomb[]): Rhomb[] {
  const tris: RobinsonTriangle[] = []
  for (const r of rhombs) {
    const children = r.type === 1
      ? subdivide_A(r.v0, r.v1, r.v2, r.v3)
      : subdivide_B(r.v0, r.v1, r.v2, r.v3)
    tris.push(...children)
  }
  return healToRhombs(tris)
}
