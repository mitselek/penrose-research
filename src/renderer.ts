// (*PD:Escher*)
// Penrose P3 Rhomb Tiling — SVG rendering layer
// Spec ref: Design spec → Renderer Responsibilities, View interface
// Source ref: index.html lines 37–131 (drawRhomb, glow filter),
//             232–267 (hover), 342–515 (animate render), 517–530 (labels)

import type { SimState, View, ScreenTransform, Conduit, ConduitPath, Vec2 } from './types'
import { queryTile } from './simulation'
import { THICK_TEMPLATE, THIN_TEMPLATE } from './subdivision'

const NS = 'http://www.w3.org/2000/svg'

// ================================================================
// Tiling-space → screen-space transform
// ================================================================

function toScreen(p: Vec2, t: ScreenTransform): [number, number] {
  return [t.cx + p[0] * t.scale, t.cy + p[1] * t.scale]
}

// ================================================================
// SVG path builders from ConduitPath
// ================================================================

function conduitPathD(conduit: Conduit, t: ScreenTransform): string {
  const path = conduit.path
  const [sx1, sy1] = toScreen(conduit.P1, t)
  const [sx2, sy2] = toScreen(conduit.P2, t)

  if (path.kind === 'arc') {
    const screenRadius = path.radius * t.scale
    // Determine sweep direction via cross product (same logic as monolith)
    const [cx, cy] = toScreen(path.center, t)
    const cr = (sx1 - cx) * (sy2 - cy) - (sy1 - cy) * (sx2 - cx)
    return `M${sx1.toFixed(1)},${sy1.toFixed(1)} A${screenRadius.toFixed(1)},${screenRadius.toFixed(1)} 0 0 ${cr > 0 ? 1 : 0} ${sx2.toFixed(1)},${sy2.toFixed(1)}`
  }

  if (path.kind === 'bezier') {
    // Future: cubic bezier with controls
    const controls = path.controls
    if (controls.length === 4) {
      const [, cp1, cp2] = controls
      const [scx1, scy1] = toScreen(cp1, t)
      const [scx2, scy2] = toScreen(cp2, t)
      return `M${sx1.toFixed(1)},${sy1.toFixed(1)} C${scx1.toFixed(1)},${scy1.toFixed(1)} ${scx2.toFixed(1)},${scy2.toFixed(1)} ${sx2.toFixed(1)},${sy2.toFixed(1)}`
    }
    // Fallback: straight line
    return `M${sx1.toFixed(1)},${sy1.toFixed(1)} L${sx2.toFixed(1)},${sy2.toFixed(1)}`
  }

  return ''
}

// ================================================================
// Rhomb fill/stroke colors (matching monolith)
// ================================================================

const RHOMB_COLORS = {
  1: { fill: 'rgba(55,48,30,0.4)', stroke: 'rgba(240,200,80,0.1)' },
  0: { fill: 'rgba(25,38,60,0.4)', stroke: 'rgba(100,180,255,0.1)' },
} as const

const BRIGHT_COLORS = {
  1: '#ffd060',
  0: '#60c0ff',
} as const

// ================================================================
// createView — build all SVG elements, return View
// ================================================================

export function createView(
  state: SimState,
  svg: SVGSVGElement,
  transform: ScreenTransform,
  level: number,
): View {
  // Clear SVG
  while (svg.firstChild) svg.removeChild(svg.firstChild)

  const W = transform.cx * 2
  const H = transform.cy * 2
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`)

  // Glow filter
  const defs = document.createElementNS(NS, 'defs')
  defs.innerHTML = `
    <filter id="glow">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>`
  svg.appendChild(defs)

  const strokeWidth = 0.8
  const rhombGroups: SVGGElement[] = []
  const conduitBaseEls: SVGPathElement[] = []
  const conduitBrightEls: SVGPathElement[] = []

  // Build rhomb groups with polygons and conduit paths
  for (let ri = 0; ri < state.rhombs.length; ri++) {
    const rhomb = state.rhombs[ri]
    const colors = RHOMB_COLORS[rhomb.type]
    const q = [rhomb.v0, rhomb.v1, rhomb.v2, rhomb.v3].map(p => toScreen(p, transform))

    const g = document.createElementNS(NS, 'g')
    g.style.cursor = 'pointer'
    g.dataset.idx = String(ri)

    // Polygon
    const poly = document.createElementNS(NS, 'polygon')
    poly.setAttribute('points', q.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' '))
    poly.setAttribute('fill', colors.fill)
    poly.setAttribute('stroke', colors.stroke)
    poly.setAttribute('stroke-width', String(strokeWidth))
    poly.setAttribute('stroke-linejoin', 'round')
    poly.dataset.baseFill = colors.fill
    g.appendChild(poly)
    ;(g as SVGGElement & { _poly: SVGPolygonElement })._poly = poly

    svg.appendChild(g)
    rhombGroups.push(g)
  }

  // Build conduit paths (indexed by global conduitIdx)
  // Create a temporary array sized to conduits.length
  const baseEls: SVGPathElement[] = new Array(state.conduits.length)
  const brightEls: SVGPathElement[] = new Array(state.conduits.length)

  for (let ci = 0; ci < state.conduits.length; ci++) {
    const conduit = state.conduits[ci]
    const ri = conduit.rhombIdx
    const g = rhombGroups[ri]
    const tmpl = conduit.type === 1 ? THICK_TEMPLATE : THIN_TEMPLATE
    const d = conduitPathD(conduit, transform)

    // Base arc (dim)
    const base = document.createElementNS(NS, 'path')
    base.setAttribute('d', d)
    base.setAttribute('fill', 'none')
    base.setAttribute('stroke', tmpl.arcColor)
    base.setAttribute('stroke-width', String(Math.max(strokeWidth * 0.8, 0.5)))
    base.setAttribute('stroke-linecap', 'round')
    base.style.pointerEvents = 'none'
    g.appendChild(base)
    baseEls[ci] = base

    // Bright arc (signal overlay)
    const bright = document.createElementNS(NS, 'path')
    bright.setAttribute('d', d)
    bright.setAttribute('fill', 'none')
    bright.setAttribute('stroke', BRIGHT_COLORS[conduit.type])
    bright.setAttribute('stroke-width', String(Math.max(strokeWidth * 1.5, 1)))
    bright.setAttribute('stroke-linecap', 'round')
    bright.setAttribute('filter', 'url(#glow)')
    bright.setAttribute('opacity', '0')
    bright.style.pointerEvents = 'none'
    g.appendChild(bright)
    brightEls[ci] = bright
  }

  // Copy to output arrays
  conduitBaseEls.push(...baseEls)
  conduitBrightEls.push(...brightEls)

  // Labels
  const labelG = document.createElementNS(NS, 'g')
  const t = document.createElementNS(NS, 'text')
  t.setAttribute('x', '20')
  t.setAttribute('y', String(H - 20))
  t.setAttribute('fill', 'rgba(200,210,230,0.5)')
  t.setAttribute('font-size', '12')
  t.setAttribute('font-family', 'Courier New')
  t.textContent = 'L' + level + ' \u2014 Penrose P3'
  labelG.appendChild(t)
  svg.appendChild(labelG)

  // Stats element (exists in DOM already)
  const statsEl = document.getElementById('stats') as HTMLDivElement

  return {
    svg,
    transform,
    rhombGroups,
    conduitBaseEls,
    conduitBrightEls,
    rhombBrightness: new Float32Array(state.rhombs.length),
    statsEl,
    hoveredWires: new Set(),
    selectedRhomb: -1,
  }
}

// ================================================================
// Hover: highlight all conduits in hovered wire components
// ================================================================

export function setHoveredWires(state: SimState, view: View, rhombIdx: number): void {
  const rw = state.rhombWires.get(rhombIdx)
  if (!rw || setsEqual(rw, view.hoveredWires)) return

  clearHover(state, view)
  view.hoveredWires = rw

  for (const wid of rw) {
    for (const ci of state.wires[wid]) {
      const hoverColor = state.conduits[ci].type === 1
        ? 'rgba(255,208,96,0.6)'
        : 'rgba(96,192,255,0.6)'
      view.conduitBaseEls[ci].setAttribute('stroke', hoverColor)
      view.conduitBaseEls[ci].setAttribute('stroke-width', '1')
    }
  }
}

export function clearHover(state: SimState, view: View): void {
  for (const wid of view.hoveredWires) {
    for (const ci of state.wires[wid]) {
      const tmpl = state.conduits[ci].type === 1 ? THICK_TEMPLATE : THIN_TEMPLATE
      view.conduitBaseEls[ci].setAttribute('stroke', tmpl.arcColor)
      view.conduitBaseEls[ci].setAttribute('stroke-width', '0.5')
      view.conduitBaseEls[ci].removeAttribute('filter')
    }
  }
  view.hoveredWires = new Set()
}

function setsEqual(a: Set<number>, b: Set<number>): boolean {
  if (a.size !== b.size) return false
  for (const v of a) if (!b.has(v)) return false
  return true
}

// ================================================================
// Selection: toggle selected rhomb for stats panel
// ================================================================

export function selectRhomb(view: View, rhombIdx: number): void {
  // Deselect previous
  if (view.selectedRhomb >= 0 && view.rhombGroups[view.selectedRhomb]) {
    view.rhombGroups[view.selectedRhomb].classList.remove('selected')
  }

  if (rhombIdx === view.selectedRhomb) {
    // Toggle off
    view.selectedRhomb = -1
    view.statsEl.style.display = 'none'
  } else {
    view.selectedRhomb = rhombIdx
    if (rhombIdx >= 0) {
      view.rhombGroups[rhombIdx].classList.add('selected')
      view.statsEl.style.display = 'block'
    }
  }
}

// ================================================================
// render — per-frame visual updates
// ================================================================

export function render(state: SimState, view: View, dt: number): void {
  const { conduits, signals } = state
  const { rhombGroups, conduitBrightEls, rhombBrightness } = view
  const dashWidth = state.config.dashWidth

  // 1. Compute per-rhomb target brightness from signals
  const rhombTarget = new Float32Array(state.rhombs.length)
  for (const s of signals) {
    const ri = conduits[s.conduitIdx].rhombIdx
    rhombTarget[ri] = Math.min(rhombTarget[ri] + 0.5, 1)
  }

  // 2. Ease rhomb brightness toward target
  const easeUp = 1 - Math.exp(-dt * 0.008)   // fast ease in
  const easeDown = 1 - Math.exp(-dt * 0.002)  // slow ease out

  for (let i = 0; i < rhombGroups.length; i++) {
    const target = rhombTarget[i]
    const ease = target > rhombBrightness[i] ? easeUp : easeDown
    rhombBrightness[i] += (target - rhombBrightness[i]) * ease

    const poly = (rhombGroups[i] as SVGGElement & { _poly: SVGPolygonElement })._poly
    const p = rhombBrightness[i]
    if (p > 0.005) {
      const bright = state.rhombs[i].type === 1
        ? `rgba(120,100,50,${(0.4 + p * 0.3).toFixed(3)})`
        : `rgba(50,80,120,${(0.4 + p * 0.3).toFixed(3)})`
      poly.setAttribute('fill', bright)
    } else {
      poly.setAttribute('fill', poly.dataset.baseFill!)
    }
  }

  // 3. Render signals as dashes on conduit paths
  // Pre-compute conduit screen lengths (arc length in screen space)
  for (let ci = 0; ci < conduits.length; ci++) {
    const conduit = conduits[ci]
    const brightEl = conduitBrightEls[ci]

    // Find signals on this conduit
    const sigs: typeof signals = []
    for (const s of signals) {
      if (s.conduitIdx === ci) sigs.push(s)
    }

    if (sigs.length === 0) {
      brightEl.setAttribute('opacity', '0')
      brightEl.removeAttribute('stroke-dasharray')
      continue
    }

    // Screen-space arc length for dasharray
    const screenLen = conduit.length * view.transform.scale
    const hw = dashWidth / 2 * screenLen // half-width in screen px

    // Build segments: sorted non-overlapping dash ranges
    const ranges: [number, number][] = []
    for (const s of sigs) {
      const center = s.pos * screenLen
      ranges.push([Math.max(0, center - hw), Math.min(screenLen, center + hw)])
    }
    ranges.sort((a, b) => a[0] - b[0])

    // Build SVG dasharray: gap dash gap dash ...
    const parts: number[] = []
    let cursor = 0
    for (const [start, end] of ranges) {
      if (start > cursor) parts.push(0, start - cursor) // gap
      parts.push(end - start, 0) // dash
      cursor = end
    }
    if (cursor < screenLen) parts.push(0, screenLen - cursor) // final gap

    brightEl.setAttribute('stroke-dasharray', parts.map(v => v.toFixed(1)).join(' '))
    brightEl.setAttribute('opacity', '0.9')
  }

  // 4. Update stats panel for selected tile
  if (view.selectedRhomb >= 0) {
    updateStats(state, view)
  }
}

// ================================================================
// Stats panel HTML update (via queryTile)
// ================================================================

function updateStats(state: SimState, view: View): void {
  const ri = view.selectedRhomb
  const info = queryTile(state, ri)

  let arcHtml = ''
  for (let a = 0; a < info.conduits.length; a++) {
    const c = info.conduits[a]
    arcHtml +=
      `<div class="label" style="margin-top:6px">arc ${a} \u00b7 wire #${c.wireId}</div>` +
      `<div>length: <span class="val">${c.length.toFixed(4)}</span></div>` +
      `<div>\u2192 fwd: <span class="val">${c.signalsFwd}</span>` +
      ` \u00b7 rev: <span class="val">${c.signalsRev}</span></div>` +
      `<div>P1\u2192 <span class="val">${c.connP1 !== null ? 'tile #' + c.connP1 : 'edge'}</span>` +
      ` P2\u2192 <span class="val">${c.connP2 !== null ? 'tile #' + c.connP2 : 'edge'}</span></div>`
  }

  view.statsEl.innerHTML =
    `<div class="label">tile #${ri}</div>` +
    `<div>type: <span class="val">${info.type === 1 ? 'thick (A)' : 'thin (B)'}</span>` +
    ` \u00b7 healed: <span class="val">${info.healed ? 'yes' : 'no'}</span></div>` +
    `<div>brightness: <span class="val">${view.rhombBrightness[ri].toFixed(3)}</span></div>` +
    arcHtml
}
