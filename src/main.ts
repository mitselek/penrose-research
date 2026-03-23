// (*PD:Escher*)
// Penrose P3 Rhomb Tiling — Bootstrap and animation loop
// Spec ref: Design spec → Animation Loop, Data Flow
// Source ref: index.html lines 37–56 (init), 345–515 (animate)

import { cos36, sin36 } from './geometry'
import { createState, tick } from './simulation'
import { createView, render } from './renderer'
import { initControls } from './controls'

// ================================================================
// Configuration
// ================================================================

const LEVEL = 7

// ================================================================
// Bootstrap
// ================================================================

const svg = document.getElementById('svg') as unknown as SVGSVGElement
const W = window.innerWidth
const H = window.innerHeight

// Scale so the initial thick rhomb fills the viewport
// Thick rhomb spans: x = ±cos36 (~±0.809), y = ±sin36 (~±0.588)
const scaleX = W / (2 * cos36)
const scaleY = H / (2 * sin36)
const scale = Math.min(scaleX, scaleY)

const state = createState(LEVEL, {
  defaultSpeed: 0.001,
  spawnInterval: 1000,
})

const view = createView(state, svg, { cx: W / 2, cy: H / 2, scale }, LEVEL)
const controls = initControls(state, view)

// ================================================================
// Animation loop
// ================================================================

let lastFrameTime = 0

function onFrame(time: number): void {
  const dt = lastFrameTime ? time - lastFrameTime : 0
  lastFrameTime = time

  controls.update(time)
  tick(state, dt, controls.eventQueue.flush())
  render(state, view, dt)
  requestAnimationFrame(onFrame)
}

requestAnimationFrame(onFrame)
