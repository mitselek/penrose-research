// (*PD:Escher*)
// Penrose P3 Rhomb Tiling — User input → SimEvent[]
// Spec ref: Design spec → Controls & UI, Event Queue
// Source ref: index.html lines 281–339 (sliders, keyboard, hover, click)

import type { SimState, SimEvent, View } from './types'
import { EventQueue } from './simulation'
import { setHoveredWires, clearHover, selectRhomb } from './renderer'

// ================================================================
// Controls state
// ================================================================

export interface Controls {
  eventQueue: EventQueue
  update(time: number): void
  destroy(): void
}

// ================================================================
// initControls — wire up all DOM event listeners, return Controls
// ================================================================

export function initControls(
  state: SimState,
  view: View,
): Controls {
  const eventQueue = new EventQueue()
  const svg = view.svg

  let hoveredRhomb = -1
  let lastSpawn = 0

  // ── Seed rate slider ──────────────────────────────────
  const spawnSlider = document.getElementById('spawn-slider') as HTMLInputElement
  const spawnVal = document.getElementById('spawn-val') as HTMLSpanElement

  // Sync slider to current config
  spawnSlider.value = String(state.config.spawnInterval)
  spawnVal.textContent = (state.config.spawnInterval / 1000).toFixed(1) + 's'

  const onSpawnInput = (): void => {
    state.config.spawnInterval = parseInt(spawnSlider.value)
    spawnVal.textContent = (state.config.spawnInterval / 1000).toFixed(1) + 's'
  }
  spawnSlider.addEventListener('input', onSpawnInput)

  // ── Speed slider ──────────────────────────────────────
  const speedSlider = document.getElementById('speed-slider') as HTMLInputElement
  const speedVal = document.getElementById('speed-val') as HTMLSpanElement

  // Sync slider to current config
  speedSlider.value = String(state.config.defaultSpeed)
  speedVal.textContent = state.config.defaultSpeed.toFixed(2)

  const onSpeedInput = (): void => {
    state.config.defaultSpeed = parseFloat(speedSlider.value)
    speedVal.textContent = state.config.defaultSpeed.toFixed(2)
  }
  speedSlider.addEventListener('input', onSpeedInput)

  // ── Keyboard shortcuts ────────────────────────────────
  const onKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      state.config.spawnInterval = Math.min(5000, state.config.spawnInterval + 100)
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      state.config.spawnInterval = Math.max(200, state.config.spawnInterval - 100)
    } else {
      return
    }
    spawnSlider.value = String(state.config.spawnInterval)
    spawnVal.textContent = (state.config.spawnInterval / 1000).toFixed(1) + 's'
  }
  document.addEventListener('keydown', onKeydown)

  // ── Hover: wire highlighting + track hovered rhomb ────
  const onMouseover = (e: MouseEvent): void => {
    const g = (e.target as Element).closest('g[data-idx]') as SVGGElement | null
    if (!g) return
    const ri = parseInt(g.dataset.idx!)
    setHoveredWires(state, view, ri)
  }

  const onMouseout = (e: MouseEvent): void => {
    const g = (e.target as Element).closest('g[data-idx]') as SVGGElement | null
    if (g) return // still inside a rhomb
    clearHover(state, view)
  }

  const onMousemove = (e: MouseEvent): void => {
    const g = (e.target as Element).closest('g[data-idx]') as SVGGElement | null
    hoveredRhomb = g ? parseInt(g.dataset.idx!) : -1
  }

  const onMouseleave = (): void => {
    hoveredRhomb = -1
    clearHover(state, view)
  }

  svg.addEventListener('mouseover', onMouseover)
  svg.addEventListener('mouseout', onMouseout)
  svg.addEventListener('mousemove', onMousemove)
  svg.addEventListener('mouseleave', onMouseleave)

  // ── Click-to-select ───────────────────────────────────
  const onClick = (e: MouseEvent): void => {
    const g = (e.target as Element).closest('g[data-idx]') as SVGGElement | null
    const ri = g ? parseInt(g.dataset.idx!) : -1
    selectRhomb(view, ri)
  }
  svg.addEventListener('click', onClick)

  // ── Hover-spawn timer (called per frame) ──────────────
  function update(time: number): void {
    if (hoveredRhomb >= 0 && time - lastSpawn > state.config.spawnInterval) {
      lastSpawn = time
      eventQueue.push({
        kind: 'spawn',
        rhombIdx: hoveredRhomb,
        speed: state.config.defaultSpeed,
        charge: 0,
        color: '',
        message: '',
      })
    }
  }

  // ── Cleanup ───────────────────────────────────────────
  function destroy(): void {
    spawnSlider.removeEventListener('input', onSpawnInput)
    speedSlider.removeEventListener('input', onSpeedInput)
    document.removeEventListener('keydown', onKeydown)
    svg.removeEventListener('mouseover', onMouseover)
    svg.removeEventListener('mouseout', onMouseout)
    svg.removeEventListener('mousemove', onMousemove)
    svg.removeEventListener('mouseleave', onMouseleave)
    svg.removeEventListener('click', onClick)
  }

  return { eventQueue, update, destroy }
}
