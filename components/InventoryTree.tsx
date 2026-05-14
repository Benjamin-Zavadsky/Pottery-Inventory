'use client'

import { useState, useMemo } from 'react'
import { CULTURES, REGION_COLORS } from '@/lib/constants'
import type { PotteryItem } from '@/lib/types'
import type { Region } from '@/lib/constants'

interface Props {
  items: PotteryItem[]
  onEditPiece: (item: PotteryItem) => void
}

const REGION_ORDER: Region[] = [
  'North America', 'Mesoamerica', 'South America', 'Caribbean / Amazonia',
  'Europe', 'Africa', 'Middle East', 'South Asia', 'East Asia', 'Southeast Asia', 'Oceania',
]

function piecesForCulture(items: PotteryItem[], cultureName: string): PotteryItem[] {
  const needle = cultureName.toLowerCase()
  return items.filter(item => {
    if (!item.tribe_culture) return false
    const hay = item.tribe_culture.toLowerCase()
    return hay.includes(needle) || needle.includes(hay)
  })
}

export default function InventoryTree({ items, onEditPiece }: Props) {
  const [expandedRegions, setExpandedRegions] = useState<Set<Region>>(new Set(REGION_ORDER))
  const [expandedCultures, setExpandedCultures] = useState<Set<string>>(new Set())

  const tree = useMemo(() =>
    REGION_ORDER.map(region => {
      const cultures = CULTURES.filter(c => c.region === region).map(c => ({
        ...c,
        pieces: piecesForCulture(items, c.culture),
      }))
      return { region, color: REGION_COLORS[region], cultures, total: cultures.reduce((s, c) => s + c.pieces.length, 0) }
    }),
  [items])

  function toggleRegion(region: Region) {
    setExpandedRegions(prev => {
      const next = new Set(prev)
      next.has(region) ? next.delete(region) : next.add(region)
      return next
    })
  }

  function toggleCulture(culture: string) {
    setExpandedCultures(prev => {
      const next = new Set(prev)
      next.has(culture) ? next.delete(culture) : next.add(culture)
      return next
    })
  }

  return (
    <div
      className="w-full rounded-2xl border border-[#e4e4e7] overflow-y-auto flex flex-col"
      style={{ height: 'calc(100vh - 260px)', minHeight: 400, background: '#f8f8f9' }}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 px-5 py-3 border-b border-[#e4e4e7] bg-white flex items-center justify-between">
        <span className="text-xs font-semibold text-[#111] uppercase tracking-widest">Collection by Culture</span>
        <span className="text-xs text-[#999]">{items.length} pieces</span>
      </div>

      <div className="flex flex-col divide-y divide-[#e4e4e7]">
        {tree.map(({ region, color, cultures, total }) => {
          const isRegionOpen = expandedRegions.has(region)
          return (
            <div key={region}>
              {/* Region row */}
              <button
                onClick={() => toggleRegion(region)}
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/70 transition-colors text-left"
              >
                <div className="w-1 h-7 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="flex-1 text-sm font-semibold text-[#111]">{region}</span>
                <span className="text-xs text-[#999] mr-2">{total} {total === 1 ? 'piece' : 'pieces'}</span>
                <svg
                  width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2.5" strokeLinecap="round"
                  className="shrink-0 transition-transform duration-200"
                  style={{ transform: isRegionOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {/* Cultures */}
              {isRegionOpen && (
                <div className="bg-white border-t border-[#f0f0f0]">
                  {cultures.map(({ culture, pieces }) => {
                    const hasPieces = pieces.length > 0
                    const isCultureOpen = expandedCultures.has(culture)
                    return (
                      <div key={culture} className="border-b border-[#f5f5f5] last:border-0">
                        {/* Culture row */}
                        <button
                          onClick={() => hasPieces && toggleCulture(culture)}
                          disabled={!hasPieces}
                          className={`w-full flex items-center gap-3 pl-9 pr-5 py-3 text-left transition-colors ${hasPieces ? 'hover:bg-[#fafafa] cursor-pointer' : 'cursor-default opacity-40'}`}
                        >
                          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color, opacity: 0.6 }} />
                          <span className="flex-1 text-sm text-[#333]">{culture}</span>
                          <span className="text-xs text-[#bbb] mr-2">{pieces.length} {pieces.length === 1 ? 'piece' : 'pieces'}</span>
                          {hasPieces && (
                            <svg
                              width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2.5" strokeLinecap="round"
                              className="shrink-0 transition-transform duration-200"
                              style={{ transform: isCultureOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                            >
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          )}
                        </button>

                        {/* Piece cards */}
                        {isCultureOpen && hasPieces && (
                          <div className="pl-9 pr-5 pb-4 pt-1 overflow-x-auto">
                            <div className="flex gap-3" style={{ width: 'max-content' }}>
                              {pieces.map(piece => (
                                <button
                                  key={piece.id}
                                  onClick={() => onEditPiece(piece)}
                                  className="flex flex-col items-start w-[100px] shrink-0 group"
                                >
                                  {/* Photo */}
                                  <div className="w-[100px] h-[100px] rounded-xl overflow-hidden bg-[#f0f0f0] border border-[#e4e4e7] group-hover:border-[#bbb] transition-colors mb-2">
                                    {piece.photos?.[0] ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        src={piece.photos[0]}
                                        alt={piece.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5">
                                          <rect x="3" y="3" width="18" height="18" rx="2" />
                                          <circle cx="8.5" cy="8.5" r="1.5" />
                                          <polyline points="21 15 16 10 5 21" />
                                        </svg>
                                      </div>
                                    )}
                                  </div>
                                  {/* Name */}
                                  <p className="text-[11px] font-medium text-[#111] leading-tight line-clamp-2 w-full text-left">
                                    {piece.name}
                                  </p>
                                  {/* SKU */}
                                  <p className="text-[10px] text-[#bbb] font-mono mt-0.5">{piece.sku}</p>
                                  {/* Condition dot */}
                                  {piece.condition && (
                                    <p className="text-[10px] text-[#999] mt-0.5">{piece.condition}</p>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
