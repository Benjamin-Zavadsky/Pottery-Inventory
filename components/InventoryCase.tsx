'use client';

import { useState, useMemo } from 'react';
import { CASES } from '@/lib/constants';
import type { PotteryItem } from '@/lib/types';

interface Props {
  items: PotteryItem[];
  onEditPiece: (item: PotteryItem) => void;
}

export default function InventoryCase({ items, onEditPiece }: Props) {
  const [expandedCases, setExpandedCases] = useState<Set<string>>(new Set(CASES.map((c) => c.id)));

  const caseGroups = useMemo(() => {
    const groups = CASES.map((c) => ({
      ...c,
      pieces: items.filter((item) => item.case_id === c.id),
    }));
    const unassigned = items.filter((item) => !item.case_id);
    return { groups, unassigned };
  }, [items]);

  function toggleCase(id: string) {
    setExpandedCases((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div
      className="w-full rounded-2xl border border-[#e4e4e7] overflow-y-auto flex flex-col"
      style={{ height: 'calc(100vh - 260px)', minHeight: 400, background: '#f8f8f9' }}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 px-5 py-3 border-b border-[#e4e4e7] bg-white flex items-center justify-between">
        <span className="text-xs font-semibold text-[#111] uppercase tracking-widest">
          Collection by Case
        </span>
        <span className="text-xs text-[#999]">{items.length} pieces</span>
      </div>

      <div className="flex flex-col divide-y divide-[#e4e4e7]">
        {caseGroups.groups.map(({ id, name, description, pieces }) => {
          const isOpen = expandedCases.has(id);
          return (
            <div key={id}>
              {/* Case row */}
              <button
                onClick={() => toggleCase(id)}
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/70 transition-colors text-left"
              >
                <div className="w-1 h-7 rounded-full shrink-0 bg-[#111]" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-[#111]">{name}</span>
                  {description && <p className="text-xs text-[#999] mt-0.5">{description}</p>}
                </div>
                <span className="text-xs text-[#999] mr-2 shrink-0">
                  {pieces.length} {pieces.length === 1 ? 'piece' : 'pieces'}
                </span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#aaa"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  className="shrink-0 transition-transform duration-200"
                  style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {/* Pieces */}
              {isOpen && (
                <div className="bg-white border-t border-[#f0f0f0]">
                  {pieces.length === 0 ? (
                    <p className="pl-9 pr-5 py-4 text-sm text-[#bbb]">
                      No pieces assigned to this case.
                    </p>
                  ) : (
                    <div className="pl-9 pr-5 pb-4 pt-3 overflow-x-auto">
                      <div className="flex gap-3" style={{ width: 'max-content' }}>
                        {pieces.map((piece) => (
                          <button
                            key={piece.id}
                            onClick={() => onEditPiece(piece)}
                            className="flex flex-col items-start w-[100px] shrink-0 group"
                          >
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
                                  <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="#ccc"
                                    strokeWidth="1.5"
                                  >
                                    <rect x="3" y="3" width="18" height="18" rx="2" />
                                    <circle cx="8.5" cy="8.5" r="1.5" />
                                    <polyline points="21 15 16 10 5 21" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <p className="text-[11px] font-medium text-[#111] leading-tight line-clamp-2 w-full text-left">
                              {piece.name}
                            </p>
                            <p className="text-[10px] text-[#bbb] font-mono mt-0.5">{piece.sku}</p>
                            {piece.condition && (
                              <p className="text-[10px] text-[#999] mt-0.5">{piece.condition}</p>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Unassigned */}
        {(() => {
          const id = '__unassigned__';
          const isOpen = expandedCases.has(id);
          const pieces = caseGroups.unassigned;
          return (
            <div key={id}>
              <button
                onClick={() => toggleCase(id)}
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/70 transition-colors text-left"
              >
                <div className="w-1 h-7 rounded-full shrink-0 bg-[#ccc]" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-[#999]">Unassigned</span>
                  <p className="text-xs text-[#bbb] mt-0.5">Pieces not yet placed in a case</p>
                </div>
                <span className="text-xs text-[#999] mr-2 shrink-0">
                  {pieces.length} {pieces.length === 1 ? 'piece' : 'pieces'}
                </span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#aaa"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  className="shrink-0 transition-transform duration-200"
                  style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {isOpen && (
                <div className="bg-white border-t border-[#f0f0f0]">
                  {pieces.length === 0 ? (
                    <p className="pl-9 pr-5 py-4 text-sm text-[#bbb]">
                      All pieces are assigned to a case.
                    </p>
                  ) : (
                    <div className="pl-9 pr-5 pb-4 pt-3 overflow-x-auto">
                      <div className="flex gap-3" style={{ width: 'max-content' }}>
                        {pieces.map((piece) => (
                          <button
                            key={piece.id}
                            onClick={() => onEditPiece(piece)}
                            className="flex flex-col items-start w-[100px] shrink-0 group"
                          >
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
                                  <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="#ccc"
                                    strokeWidth="1.5"
                                  >
                                    <rect x="3" y="3" width="18" height="18" rx="2" />
                                    <circle cx="8.5" cy="8.5" r="1.5" />
                                    <polyline points="21 15 16 10 5 21" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <p className="text-[11px] font-medium text-[#111] leading-tight line-clamp-2 w-full text-left">
                              {piece.name}
                            </p>
                            <p className="text-[10px] text-[#bbb] font-mono mt-0.5">{piece.sku}</p>
                            {piece.condition && (
                              <p className="text-[10px] text-[#999] mt-0.5">{piece.condition}</p>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
