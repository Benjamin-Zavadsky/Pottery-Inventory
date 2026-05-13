'use client'

import { useState, useCallback } from 'react'
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps'
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
  const [tooltip, setTooltip] = useState<Tooltip | null>(null)
  const [drawer, setDrawer] = useState<{ culture: string; pieces: PotteryItem[] } | null>(null)

  const handleMarkerClick = useCallback((cultureName: string) => {
    const pieces = piecesForCulture(items, cultureName)
    setDrawer({ culture: cultureName, pieces })
  }, [items])

  return (
    <div className="relative w-full bg-[#e8f0f8] rounded-2xl overflow-hidden" style={{ height: 'calc(100vh - 260px)', minHeight: 400 }}>
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ center: [-80, 10], scale: 300 }}
        style={{ width: '100%', height: '100%' }}
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map(geo => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="#f0ebe3"
                stroke="#d8d0c4"
                strokeWidth={0.5}
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
                r={9}
                fill={color}
                fillOpacity={count > 0 ? 0.9 : 0.25}
                stroke="white"
                strokeWidth={1.5}
                style={{ cursor: 'pointer' }}
                onMouseEnter={e => setTooltip({ culture: c.culture, count, x: e.clientX, y: e.clientY })}
                onMouseLeave={() => setTooltip(null)}
                onClick={() => handleMarkerClick(c.culture)}
              />
              {count > 0 && (
                <text
                  textAnchor="middle"
                  dy="0.35em"
                  fontSize={8}
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
      </ComposableMap>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-[#111] text-white text-xs rounded-lg px-3 py-1.5 pointer-events-none whitespace-nowrap shadow-lg"
          style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}
        >
          {tooltip.culture} · {tooltip.count} {tooltip.count === 1 ? 'piece' : 'pieces'}
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur rounded-xl px-3 py-2.5 flex flex-col gap-1.5 shadow-sm">
        {(Object.entries(REGION_COLORS) as [string, string][]).map(([region, color]) => (
          <div key={region} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <span className="text-[11px] text-[#333]">{region}</span>
          </div>
        ))}
      </div>

      {/* Right drawer */}
      {drawer && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setDrawer(null)} />
          <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-2xl z-40 flex flex-col">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#e5e5e5]">
              <div>
                <h3 className="text-sm font-medium">{drawer.culture}</h3>
                <p className="text-xs text-[#aaa] mt-0.5">{drawer.pieces.length} {drawer.pieces.length === 1 ? 'piece' : 'pieces'}</p>
              </div>
              <button onClick={() => setDrawer(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#f3f3f3] text-[#6b6b6b] text-lg">×</button>
            </div>

            {drawer.pieces.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-sm text-[#aaa]">No pieces catalogued</div>
            ) : (
              <div className="flex-1 overflow-y-auto py-3 px-4 flex flex-col gap-3">
                {drawer.pieces.map(piece => (
                  <div key={piece.id} className="flex items-center gap-3 bg-[#f8f8f8] rounded-xl p-3">
                    <div className="w-12 h-12 rounded-lg bg-[#ebebeb] overflow-hidden shrink-0">
                      {piece.photos?.[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={piece.photos[0]} alt={piece.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{piece.name}</p>
                      <p className="text-[11px] text-[#aaa] font-mono">{piece.sku}</p>
                      {piece.age && <p className="text-[11px] text-[#888] truncate">{piece.age}</p>}
                    </div>
                    <button
                      onClick={() => { setDrawer(null); onEditPiece(piece) }}
                      className="text-xs text-[#111] border border-[#e5e5e5] rounded-lg px-2.5 py-1.5 hover:border-[#111] transition-colors shrink-0"
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
