'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { CASES } from '@/lib/constants'
import type { PotteryItem, Case } from '@/lib/types'
import type { User } from '@supabase/supabase-js'

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const supabase = useMemo(() => createClient(), [])

  const [caseData, setCaseData] = useState<Case | null>(null)
  const [pieces, setPieces] = useState<PotteryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState(false)
  const [user, setUser] = useState<User | null>(null)

  const caseMeta = CASES.find((c) => c.id === id)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [supabase])

  useEffect(() => {
    async function load() {
      const [{ data: caseRow }, { data: potteryRows }] = await Promise.all([
        supabase.from('cases').select('*').eq('id', id).single(),
        supabase
          .from('pottery')
          .select('*')
          .eq('case_id', id)
          .eq('status', 'Active')
          .order('created_at', { ascending: false }),
      ])
      setCaseData(caseRow)
      setPieces(potteryRows ?? [])
      setLoading(false)
    }
    load()
  }, [id, supabase])

  async function markInventoried() {
    setMarking(true)
    const now = new Date().toISOString()
    await supabase.from('cases').update({ last_inventoried_at: now }).eq('id', id)
    setCaseData((prev) => prev ? { ...prev, last_inventoried_at: now } : prev)
    setMarking(false)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-sm text-[#6b6b6b]">Loading...</div>
  )

  return (
    <div className="min-h-screen flex flex-col bg-[#f9f9f9]">
      <header className="bg-white border-b border-[#e5e5e5] px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/cases" className="text-[#6b6b6b] hover:text-[#111] transition-colors p-1 -ml-1 shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm sm:text-base font-light tracking-widest uppercase truncate">
            {caseMeta?.name ?? id}
          </h1>
          {caseData?.last_inventoried_at && (
            <p className="text-[10px] text-[#aaa]">
              Last inventoried {new Date(caseData.last_inventoried_at).toLocaleDateString()}
            </p>
          )}
        </div>
        {user && (
          <button
            onClick={markInventoried}
            disabled={marking}
            className="shrink-0 text-xs bg-[#111] text-white px-3 py-2 rounded-xl hover:bg-[#333] transition-colors disabled:opacity-50"
          >
            {marking ? 'Saving...' : 'Mark Inventoried'}
          </button>
        )}
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-4 sm:py-8">
        {pieces.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <p className="text-sm text-[#6b6b6b]">No pieces assigned to this case yet.</p>
            <Link href="/add" className="text-xs bg-[#111] text-white px-4 py-2 rounded-xl hover:bg-[#333] transition-colors">
              Add a piece
            </Link>
          </div>
        ) : (
          <>
            <p className="text-xs text-[#aaa] uppercase tracking-wider mb-4">
              {pieces.length} {pieces.length === 1 ? 'piece' : 'pieces'}
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {pieces.map((piece) => (
                <Link
                  key={piece.id}
                  href={`/item/${piece.id}`}
                  className="bg-white border border-[#e5e5e5] rounded-2xl overflow-hidden hover:border-[#111] transition-colors group"
                >
                  {/* Photo */}
                  <div className="aspect-square bg-[#f3f3f3] overflow-hidden">
                    {piece.photos?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={piece.photos[0]}
                        alt={piece.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#ccc] text-xs">No photo</div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <p className="text-xs font-mono text-[#aaa]">{piece.sku}</p>
                    <p className="text-sm font-medium text-[#111] mt-0.5 leading-snug line-clamp-2">{piece.name}</p>
                    {piece.condition && (
                      <p className="text-[10px] text-[#6b6b6b] mt-1">{piece.condition}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
