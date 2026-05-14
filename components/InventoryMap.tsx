'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps'
import { CULTURES, REGION_COLORS } from '@/lib/constants'
import type { PotteryItem } from '@/lib/types'

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'
const BASE_SCALE = 140
const K = Math.PI / 180          // degrees → radians
const DEG_PER_RAD = 180 / Math.PI // radians → degrees

interface Props {
  items: PotteryItem[]
  onEditPiece: (item: PotteryItem) => void
}

interface Tooltip { culture: string; count: number; x: number; y: number }
interface ViewState { projScale: number; center: [number, number] }
interface CssTransform { scale: number; tx: number; ty: number }

function piecesForCulture(items: PotteryItem[], cultureName: string): PotteryItem[] {
  const needle = cultureName.toLowerCase()
  return items.filter(item => {
    if (!item.tribe_culture) return false
    const hay = item.tribe_culture.toLowerCase()
    return hay.includes(needle) || needle.includes(hay)
  })
}

// CSS transform that makes an SVG rendered at `snap` look like `work`
function computeCss(snap: ViewState, work: ViewState, W: number, H: number): CssTransform {
  const scale = work.projScale / snap.projScale
  const tx = W / 2 * (1 - scale) - (work.center[0] - snap.center[0]) * work.projScale * K
  const ty = H / 2 * (1 - scale) + (work.center[1] - snap.center[1]) * work.projScale * K
  return { scale, tx, ty }
}

export default function InventoryMap({ items, onEditPiece }: Props) {
  // What the SVG is actually rendered at — only updated when interaction settles
  const [rendered, setRendered] = useState<ViewState>({ projScale: BASE_SCALE, center: [10, 15] })
  // CSS transform layered on top for smooth live feedback
  const [css, setCss] = useState<CssTransform | null>(null)

  const [dragging, setDragging] = useState(false)
  const [tooltip, setTooltip] = useState<Tooltip | null>(null)
  const [drawer, setDrawer] = useState<{ culture: string; pieces: PotteryItem[] } | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  // Refs hold the authoritative live state without triggering renders
  const snapRef = useRef<ViewState>({ projScale: BASE_SCALE, center: [10, 15] })
  const workRef = useRef<ViewState>({ projScale: BASE_SCALE, center: [10, 15] })
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rafRef = useRef<number | null>(null)
  const dragStart = useRef<{ mx: number; my: number; lng0: number; lat0: number; dpp: number } | null>(null)
  const didDrag = useRef(false)

  // Commit working state → re-render SVG at full cartographic quality, drop CSS transform
  const commit = useCallback(() => {
    const snap: ViewState = { projScale: workRef.current.projScale, center: [...workRef.current.center] as [number, number] }
    snapRef.current = snap
    setRendered(snap)
    setCss(null)
  }, [])

  // Schedule a CSS update on the next animation frame (throttles React renders to ≤60fps)
  function scheduleCss() {
    if (rafRef.current !== null) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      const el = containerRef.current
      if (!el) return
      setCss(computeCss(snapRef.current, workRef.current, el.clientWidth, el.clientHeight))
    })
  }

  function scheduleSettle() {
    if (settleTimer.current) clearTimeout(settleTimer.current)
    settleTimer.current = setTimeout(commit, 200)
  }

  // Wheel / trackpad pinch → zoom toward cursor
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const dx = e.clientX - rect.left - rect.width / 2
      const dy = e.clientY - rect.top - rect.height / 2
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
      const prev = workRef.current.projScale
      const newScale = Math.min(Math.max(prev * factor, 80), 8000)
      const dpp = DEG_PER_RAD / prev
      workRef.current = {
        projScale: newScale,
        center: [
          workRef.current.center[0] + dx * dpp * (1 - 1 / factor),
          Math.max(-80, Math.min(80, workRef.current.center[1] - dy * dpp * (1 - 1 / factor))),
        ],
      }
      scheduleCss()
      scheduleSettle()
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // +/- buttons → commit immediately (no interaction in progress)
  function zoomBy(factor: number) {
    workRef.current = { ...workRef.current, projScale: Math.min(Math.max(workRef.current.projScale * factor, 80), 8000) }
    commit()
  }

  // Drag to pan
  function onMouseDown(e: React.MouseEvent) {
    dragStart.current = {
      mx: e.clientX, my: e.clientY,
      lng0: workRef.current.center[0], lat0: workRef.current.center[1],
      dpp: DEG_PER_RAD / workRef.current.projScale,
    }
    didDrag.current = false
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!dragStart.current) return
    const dx = e.clientX - dragStart.current.mx
    const dy = e.clientY - dragStart.current.my
    if (Math.abs(dx) + Math.abs(dy) > 4) { didDrag.current = true; setDragging(true) }
    workRef.current = {
      ...workRef.current,
      center: [
        dragStart.current.lng0 - dx * dragStart.current.dpp,
        Math.max(-80, Math.min(80, dragStart.current.lat0 + dy * dragStart.current.dpp)),
      ],
    }
    scheduleCss()
    scheduleSettle()
  }

  function onMouseUp() { dragStart.current = null; setDragging(false) }

  const handleMarkerClick = useCallback((cultureName: string) => {
    if (didDrag.current) return
    setDrawer({ culture: cultureName, pieces: piecesForCulture(items, cultureName) })
  }, [items])

  const cssStyle = css
    ? { transform: `translate(${css.tx}px,${css.ty}px) scale(${css.scale})`, transformOrigin: '0 0' }
    : undefined

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-2xl overflow-hidden select-none"
      style={{ height: 'calc(100vh - 260px)', minHeight: 400, background: '#eef2f7', cursor: dragging ? 'grabbing' : 'grab' }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      {/* Map layer — only re-renders when interaction settles */}
      <div style={{ position: 'absolute', inset: 0, ...cssStyle }}>
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ center: rendered.center, scale: rendered.projScale }}
          style={{ width: '100%', height: '100%' }}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map(geo => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#f5f1ea"
                  stroke="#ddd5c8"
                  strokeWidth={0.4}
                  style={{ default: { outline: 'none' }, hover: { outline: 'none' }, pressed: { outline: 'none' } }}
                />
              ))
            }
          </Geographies>

          {CULTURES.map(c => {
            const pieces = piecesForCulture(items, c.culture)
            const count = pieces.length
            const color = REGION_COLORS[c.region]
            return (
              <Marker key={c.culture} coordinates={[c.lng, c.lat]}>
                <circle
                  r={8}
                  fill={color}
                  fillOpacity={count > 0 ? 1 : 0.2}
                  stroke="white"
                  strokeWidth={1.5}
                  style={{ cursor: dragging ? 'grabbing' : 'pointer' }}
                  onMouseEnter={e => setTooltip({ culture: c.culture, count, x: e.clientX, y: e.clientY })}
                  onMouseLeave={() => setTooltip(null)}
                  onClick={() => handleMarkerClick(c.culture)}
                />
                {count > 0 && (
                  <text textAnchor="middle" dy="0.35em" fontSize={8} fontWeight="700" fill="white" style={{ pointerEvents: 'none', userSelect: 'none' }}>
                    {count}
                  </text>
                )}
              </Marker>
            )
          })}
        </ComposableMap>
      </div>

      {/* Zoom controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-1 z-10">
        <button onMouseDown={e => e.stopPropagation()} onClick={() => zoomBy(1.5)} className="w-9 h-9 bg-white rounded-xl shadow-sm border border-[#e5e5e5] flex items-center justify-center text-[#333] hover:border-[#aaa] transition-colors text-lg font-light">+</button>
        <button onMouseDown={e => e.stopPropagation()} onClick={() => zoomBy(1 / 1.5)} className="w-9 h-9 bg-white rounded-xl shadow-sm border border-[#e5e5e5] flex items-center justify-center text-[#333] hover:border-[#aaa] transition-colors text-lg font-light">−</button>
      </div>

      {/* Tooltip */}
      {tooltip && !dragging && (
        <div className="fixed z-50 bg-[#18181b] text-white text-xs rounded-lg px-3 py-1.5 pointer-events-none whitespace-nowrap shadow-lg font-medium" style={{ left: tooltip.x + 14, top: tooltip.y - 10 }}>
          {tooltip.culture}
          <span className="text-[#888] font-normal ml-1.5">· {tooltip.count} {tooltip.count === 1 ? 'piece' : 'pieces'}</span>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur rounded-xl px-3.5 py-3 flex flex-col gap-2 shadow-sm border border-[#e5e5e5] z-10" onMouseDown={e => e.stopPropagation()}>
        {(Object.entries(REGION_COLORS) as [string, string][]).map(([region, color]) => (
          <div key={region} className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <span className="text-[11px] text-[#444] leading-none">{region}</span>
          </div>
        ))}
      </div>

      {/* Right drawer */}
      {drawer && (
        <>
          <div className="fixed inset-0 z-30" onMouseDown={e => e.stopPropagation()} onClick={() => setDrawer(null)} />
          <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-2xl z-40 flex flex-col border-l border-[#f0f0f0]">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#f0f0f0]">
              <div>
                <h3 className="text-sm font-semibold text-[#111]">{drawer.culture}</h3>
                <p className="text-xs text-[#999] mt-0.5">{drawer.pieces.length} {drawer.pieces.length === 1 ? 'piece' : 'pieces'}</p>
              </div>
              <button onClick={() => setDrawer(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#f5f5f5] text-[#666] hover:bg-[#ebebeb] transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            {drawer.pieces.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 text-[#bbb]">
                <p className="text-sm">No pieces catalogued</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto py-3 px-4 flex flex-col gap-2.5">
                {drawer.pieces.map(piece => (
                  <div key={piece.id} className="flex items-center gap-3 bg-[#fafafa] border border-[#f0f0f0] rounded-xl p-3 hover:border-[#e0e0e0] transition-colors">
                    <div className="w-11 h-11 rounded-lg bg-[#f0f0f0] overflow-hidden shrink-0">
                      {piece.photos?.[0]
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={piece.photos[0]} alt={piece.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg></div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[#111] truncate">{piece.name}</p>
                      <p className="text-[11px] text-[#bbb] font-mono mt-0.5">{piece.sku}</p>
                      {piece.age && <p className="text-[11px] text-[#999] truncate mt-0.5">{piece.age}</p>}
                    </div>
                    <button onClick={() => { setDrawer(null); onEditPiece(piece) }} className="text-[11px] font-medium text-[#111] border border-[#e5e5e5] rounded-lg px-2.5 py-1.5 hover:bg-[#111] hover:text-white hover:border-[#111] transition-all shrink-0">Edit</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
