// (*PD:Ammann*)
// Penrose P3 Rhomb Tiling — Shared Type Definitions
// See: docs/superpowers/specs/2026-03-23-penrose-modularization-design.md

// ================================================================
// Geometry primitives
// ================================================================

export type Vec2 = [number, number]
export type RhombType = 0 | 1 // 0 = thin, 1 = thick

// ================================================================
// Tiling structures
// ================================================================

export interface Rhomb {
  type: RhombType
  v0: Vec2
  v1: Vec2
  v2: Vec2
  v3: Vec2
  healed: boolean
  edges: [Vec2, Vec2][] // [[v0,v1],[v1,v2],[v2,v3],[v3,v0]] — computed once
}

// ================================================================
// Conduit system
// ================================================================

/**
 * Pluggable path geometry. Arc is the current case; bezier is the future case.
 */
export type ConduitPath =
  | { kind: 'arc'; center: Vec2; radius: number; startAngle: number; endAngle: number }
  | { kind: 'bezier'; controls: Vec2[] } // future: [P1, CP1, CP2, P2] cubic bezier

/**
 * A conduit is a path connecting two points on rhomb edges.
 * Current implementation: circular arcs at acute vertices (P3 de Bruijn wiring).
 * Future: arbitrary bezier curves between any edge points.
 */
export interface Conduit {
  rhombIdx: number
  conduitIdx: number // index within parent rhomb
  P1: Vec2           // tiling-space endpoint
  P2: Vec2           // tiling-space endpoint
  length: number     // path length in tiling space
  type: RhombType    // from parent rhomb
  path: ConduitPath  // geometry definition (how to draw/measure)
}

/**
 * Wiring strategy: defines how conduits are placed on a rhomb type.
 * Current: P3 arc wiring (arcs at acute vertices with template radii).
 * Future: any function that takes a rhomb and returns conduit definitions.
 */
export interface WiringStrategy {
  name: string
  createConduits(rhomb: Rhomb, rhombIdx: number, sideLength: number): Conduit[]
}

// ================================================================
// Signals
// ================================================================

export interface Signal {
  conduitIdx: number
  pos: number      // 0..1 along conduit
  dir: 1 | -1
  speed: number    // fraction of conduit per ms (level-independent)
  charge: number   // for future interaction rules
  color: string    // for rendering
  message: string  // payload
}

// ================================================================
// Simulation events & configuration
// ================================================================

/** Input events — the only way to affect simulation from outside */
export type SimEvent =
  | { kind: 'spawn'; rhombIdx: number; speed: number; charge: number; color: string; message: string }
  | { kind: 'clear' }

export interface SimConfig {
  defaultSpeed: number   // default signal speed for spawns
  spawnInterval: number  // ms between auto-spawns from hover
  dashWidth: number      // signal dash width as fraction of conduit length
  wiring: WiringStrategy // how conduits are placed on rhombs
}

// ================================================================
// Simulation state
// ================================================================

export interface SimState {
  config: SimConfig
  rhombs: Rhomb[]
  conduits: Conduit[]
  signals: Signal[]
  wireOf: Int32Array                                              // conduit index -> wire ID
  wires: number[][]                                               // wire ID -> conduit indices
  rhombWires: Map<number, Set<number>>                            // rhomb -> wire IDs
  rhombNeighbors: Map<number, number[]>                           // rhomb -> edge-adjacent rhomb indices
  endpointMap: Map<string, { conduitIdx: number; end: 'P1' | 'P2' }[]>
  tick: number                                                    // monotonic tick counter
}

// ================================================================
// Analysis hooks
// ================================================================

export interface SimCallbacks {
  onSignalSpawn?: (signal: Signal) => void
  onSignalAnnihilate?: (a: Signal, b: Signal) => void
  onSignalPropagate?: (from: Signal, to: Signal) => void
  onTick?: (state: SimState) => void
}

// ================================================================
// Tile query (simulation -> renderer bridge)
// ================================================================

export interface TileInfo {
  index: number
  type: RhombType
  healed: boolean
  neighbors: number[] // edge-adjacent rhomb indices
  conduits: {
    wireId: number
    length: number
    signalsFwd: number
    signalsRev: number
    connP1: number | null // connected rhomb index, or null (edge)
    connP2: number | null
  }[]
}

// ================================================================
// Renderer types (not imported by simulation)
// ================================================================

export interface ScreenTransform {
  cx: number    // center x
  cy: number    // center y
  scale: number
}

export interface View {
  svg: SVGSVGElement
  transform: ScreenTransform
  rhombGroups: SVGGElement[]
  conduitBaseEls: SVGPathElement[]
  conduitBrightEls: SVGPathElement[]
  rhombBrightness: Float32Array // eased brightness (renderer-owned)
  statsEl: HTMLDivElement
  hoveredWires: Set<number>    // transient hover state
  selectedRhomb: number        // -1 = none
}
