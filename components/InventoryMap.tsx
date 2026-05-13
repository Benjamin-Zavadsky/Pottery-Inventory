'use client'

import { useState, useCallback } from 'react'
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps'
import { CULTURES, REGION_COLORS } from '@/lib/constants'
import type { PotteryItem } from '@/lib/types'

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

interface Props {
  items: PotteryItem[]
  onEditPiece: (item: PotteryItem) => void
}

interface Tooltip {
  culture: string
  count: number
  x: number
  y: number
}

function piecesForCulture(items: PotteryItem[], cultureName: string): PotteryItem[] {
  const needle = cultureName.toLowerCase()
  return items.filter(item => {
    if (!item.tribe_culture) return false
    const hay = item.tribe_culture.toLowerCase()
    return hay.includes(needle) || needle.includes(hay)
  })
}

export default function InventoryMap({ items, onEditPiece }: Props) {
  const [position, setPosition] = useState<{ coordinates: [number, number]; zoom: number }>({
    coordinates: [-80, 10],
    zoom: 1,
  })
  const [tooltip, setTooltip] = useState<Tooltip | null>(null)
  const [drawer, setDrawer] = useState<{ culture: string; pieces: PotteryItem[] } | null>(null)

  const handleMarkerClick = useCallback((cultureName: string) => {
    const pieces = piecesForCulture(items, cultureName)
    setDrawer({ culture: cultureName, pieces })
  }, [items])

  function zoomIn() {
    setPosition(p => ({ ...p, zoom: Math.min(p.zoom * 1.5, 12) }))
  }
  function zoomOut() {
    setPosition(p => ({ ...p, zoom: Math.max(p.zoom / 1.5, 1) }))
  }

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden"
      style={{ height: 'calc(100vh - 260px)', minHeight: 400, background: '#eef2f7' }}
    >
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ center: [-80, 10], scale: 300 }}
        style={{ width: '100%', height: '100%' }}
      >
        <ZoomableGroup
          zoom={position.zoom}
          center={position.coordinates}
          onMoveEnd={({ zoom, coordinates }) => setPosition({ zoom, coordinates: coordinates as [number, number] })}
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
                  r={8 / position.zoom}
                  fill={color}
                  fillOpacity={count > 0 ? 1 : 0.2}
                  stroke="white"
                  strokeWidth={1.5 / position.zoom}
                  style={{ cursor: 'pointer', filter: count > 0 ? `drop-shadow(0 1px 3px ${color}88)` : 'none' }}
                  onMouseEnter={e => setTooltip({ culture: c.culture, count, x: e.clientX, y: e.clientY })}
                  onMouseLeave={() => setTooltip(null)}
                  onClick={() => handleMarkerClick(c.culture)}
                />
                {count > 0 && (
                  <text
                    textAnchor="middle"
                    dy={3.5 / position.zoom}
                    fontSize={7 / position.zoom}
                    fontWeight="700"
                    fill="white"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {count}
                  </text>
                )}
              </Marker>
            )
          })}
        </ZoomableGroup>
      </ComposableMap>

      {/* Zoom controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-1">
        <button
          onClick={zoomIn}
          className="w-9 h-9 bg-white rounded-xl shadow-sm border border-[#e5e5e5] flex items-center justify-center text-[#333] hover:border-[#aaa] transition-colors text-lg font-light"
        >
          +
        </button>
        <button
          onClick={zoomOut}
          className="w-9 h-9 bg-white rounded-xl shadow-sm border border-[#e5e5e5] flex items-center justify-center text-[#333] hover:border-[#aaa] transition-colors text-lg font-light"
        >
          −
        </button>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-[#18181b] text-white text-xs rounded-lg px-3 py-1.5 pointer-events-none whitespace-nowrap shadow-lg font-medium"
          style={{ left: tooltip.x + 14, top: tooltip.y - 10 }}
        >
          {tooltip.culture}
          <span className="text-[#888] font-normal ml-1.5">· {tooltip.count} {tooltip.count === 1 ? 'piece' : 'pieces'}</span>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur rounded-xl px-3.5 py-3 flex flex-col gap-2 shadow-sm border border-[#e5e5e5]">
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
          <div className="fixed inset-0 z-30" onClick={() => setDrawer(null)} />
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
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><circle cx="12" cy="12" r="9" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                <p className="text-sm">No pieces catalogued</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto py-3 px-4 flex flex-col gap-2.5">
                {drawer.pieces.map(piece => (
                  <div key={piece.id} className="flex items-center gap-3 bg-[#fafafa] border border-[#f0f0f0] rounded-xl p-3 hover:border-[#e0e0e0] transition-colors">
                    <div className="w-11 h-11 rounded-lg bg-[#f0f0f0] overflow-hidden shrink-0">
                      {piece.photos?.[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={piece.photos[0]} alt={piece.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[#111] truncate">{piece.name}</p>
                      <p className="text-[11px] text-[#bbb] font-mono mt-0.5">{piece.sku}</p>
                      {piece.age && <p className="text-[11px] text-[#999] truncate mt-0.5">{piece.age}</p>}
                    </div>
                    <button
                      onClick={() => { setDrawer(null); onEditPiece(piece) }}
                      className="text-[11px] font-medium text-[#111] border border-[#e5e5e5] rounded-lg px-2.5 py-1.5 hover:bg-[#111] hover:text-white hover:border-[#111] transition-all shrink-0"
                    >
                      Edit
                    </button>
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
