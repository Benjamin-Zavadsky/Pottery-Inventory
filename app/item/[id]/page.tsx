'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { CASES, CASE_IDS } from '@/lib/constants'
import type { PotteryItem } from '@/lib/types'
import type { User } from '@supabase/supabase-js'

const CONDITIONS = ['Mint', 'Excellent', 'Good', 'Fair', 'Poor']
const RARITIES = ['Common', 'Uncommon', 'Rare', 'Museum-Grade']
const ORIGINALITIES = ['Authenticated Original', 'Suspected Original', 'Reproduction', 'Unknown']

const SUGGESTION_LABELS: Record<string, string> = {
  description: 'Description', name: 'Name', place_of_origin: 'Place of Origin',
  age: 'Age / Period', color: 'Color', use_function: 'Use / Function',
  tribe_culture: 'Tribe / Culture', condition: 'Condition', rarity: 'Rarity',
  originality: 'Originality', dimensions: 'Dimensions', research_notes: 'Research Notes',
}

export default function ItemPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [item, setItem] = useState<PotteryItem | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Partial<PotteryItem>>({})
  const [saving, setSaving] = useState(false)
  const [activePhoto, setActivePhoto] = useState(0)
  const [newPhotos, setNewPhotos] = useState<File[]>([])
  const [newPreviews, setNewPreviews] = useState<string[]>([])
  const [removedPhotoUrls, setRemovedPhotoUrls] = useState<Set<string>>(new Set())
  const [generating, setGenerating] = useState(false)
  const [suggestions, setSuggestions] = useState<Record<string, string> | null>(null)
  const [appliedKeys, setAppliedKeys] = useState<Set<string>>(new Set())
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const [userContext, setUserContext] = useState('')
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUser(data.user)) }, [supabase])

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('pottery').select('*').eq('id', id).single()
      if (data) { setItem(data); setForm(data) }
    }
    load()
  }, [id, supabase])

  function set(field: string, value: unknown) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function handleNewPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    setNewPhotos(prev => [...prev, ...files])
    setNewPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))])
  }

  function removeExistingPhoto(url: string) {
    setRemovedPhotoUrls(prev => new Set([...prev, url]))
    setActivePhoto(0)
  }

  function removeNewPhoto(index: number) {
    setNewPhotos(prev => prev.filter((_, i) => i !== index))
    setNewPreviews(prev => prev.filter((_, i) => i !== index))
    setActivePhoto(0)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const photoUrls = (form.photos ?? []).filter(url => !removedPhotoUrls.has(url))
      for (const file of newPhotos) {
        const ext = file.name.split('.').pop()
        const path = `${item!.sku}/${Date.now()}.${ext}`
        const { error } = await supabase.storage.from('pottery-photos').upload(path, file)
        if (error) throw error
        const { data } = supabase.storage.from('pottery-photos').getPublicUrl(path)
        photoUrls.push(data.publicUrl)
      }

      const validCaseId = CASE_IDS.includes(form.case_id as typeof CASE_IDS[number])
        ? form.case_id
        : null

      const { error } = await supabase
        .from('pottery')
        .update({ ...form, case_id: validCaseId, photos: photoUrls })
        .eq('id', id)
      if (error) throw error

      // Log movement if case changed
      const prevCaseId = item?.case_id ?? null
      if (validCaseId && validCaseId !== prevCaseId) {
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        await supabase.from('location_history').insert({
          pottery_id: id,
          from_case: prevCaseId,
          to_case: validCaseId,
          moved_by: currentUser?.id ?? null,
        })
      }

      const { data } = await supabase.from('pottery').select('*').eq('id', id).single()
      setItem(data); setForm(data)
      setNewPhotos([]); setNewPreviews([]); setRemovedPhotoUrls(new Set())
      setEditing(false)
    } catch (err) {
      console.error(err)
    }
    setSaving(false)
  }

  async function resizeUrl(url: string): Promise<{ imageBase64: string; mediaType: string }> {
    const MAX_DIM = 1200
    // Fetch as blob so the canvas is never cross-origin tainted
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Failed to fetch photo (${res.status})`)
    const blob = await res.blob()
    const objectUrl = URL.createObjectURL(blob)
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        URL.revokeObjectURL(objectUrl)
        let { width, height } = img
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width >= height) { height = Math.round((height / width) * MAX_DIM); width = MAX_DIM }
          else { width = Math.round((width / height) * MAX_DIM); height = MAX_DIM }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width; canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) { reject(new Error('Canvas unavailable')); return }
        ctx.drawImage(img, 0, 0, width, height)
        resolve({ imageBase64: canvas.toDataURL('image/jpeg', 0.85).split(',')[1], mediaType: 'image/jpeg' })
      }
      img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Image load failed')) }
      img.src = objectUrl
    })
  }

  async function resizeFile(file: File): Promise<{ imageBase64: string; mediaType: string }> {
    const MAX_DIM = 1200
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        let { width, height } = img
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width >= height) { height = Math.round((height / width) * MAX_DIM); width = MAX_DIM }
          else { width = Math.round((width / height) * MAX_DIM); height = MAX_DIM }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width; canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) { reject(new Error('Canvas unavailable')); return }
        ctx.drawImage(img, 0, 0, width, height)
        resolve({ imageBase64: canvas.toDataURL('image/jpeg', 0.85).split(',')[1], mediaType: 'image/jpeg' })
      }
      img.onerror = reject
      img.src = url
    })
  }

  async function handleGenerateDescription() {
    setGenerating(true)
    setSuggestions(null)
    setAnalyzeError(null)
    setAppliedKeys(new Set())
    try {
      const existingUrls = (item?.photos ?? []).filter(url => !removedPhotoUrls.has(url))
      console.log('[analyze] photo count:', existingUrls.length + newPhotos.length)
      const [existingImages, newImages] = await Promise.all([
        Promise.all(existingUrls.map(resizeUrl)),
        Promise.all(newPhotos.map(resizeFile)),
      ])
      const images = [...existingImages, ...newImages]
      console.log('[analyze] images ready:', images.length)
      if (!images.length) { setAnalyzeError('No photos found to analyze'); return }
      const body = JSON.stringify({ images, userContext: userContext.trim() || undefined })
      console.log('[analyze] payload size (bytes):', body.length)
      const apiRes = await fetch('/api/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      })
      console.log('[analyze] API status:', apiRes.status)
      const text = await apiRes.text()
      console.log('[analyze] API response (first 300 chars):', text.slice(0, 300))
      let data: Record<string, string>
      try {
        data = JSON.parse(text)
      } catch {
        setAnalyzeError(`Server returned unexpected response (status ${apiRes.status})`)
        return
      }
      if (data?.error) {
        setAnalyzeError(data.error)
      } else if (data) {
        setSuggestions(data)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message ?? 'Analysis failed'
      console.error('[analyze] caught error:', err)
      setAnalyzeError(msg)
    }
    setGenerating(false)
  }

  async function applySuggestion(key: string, value: string) {
    if (editing) {
      setForm(f => ({ ...f, [key]: value }))
    } else {
      await supabase.from('pottery').update({ [key]: value }).eq('id', id)
      setItem(prev => prev ? { ...prev, [key]: value } : prev)
    }
    setAppliedKeys(prev => new Set([...prev, key]))
  }

  async function applyAllSuggestions() {
    if (!suggestions) return
    const updates: Record<string, string> = {}
    for (const [key, value] of Object.entries(suggestions)) { if (value) updates[key] = value }
    if (editing) {
      setForm(f => ({ ...f, ...updates }))
    } else {
      await supabase.from('pottery').update(updates).eq('id', id)
      setItem(prev => prev ? { ...prev, ...updates } : prev)
    }
    setAppliedKeys(new Set(Object.keys(updates)))
  }

  async function handleArchive() {
    if (!confirm('Archive this piece? It will be hidden from the main inventory.')) return
    await supabase.from('pottery').update({ status: 'Archived' }).eq('id', id)
    router.push('/')
  }

  if (!item) return (
    <div className="min-h-screen flex items-center justify-center text-sm text-[#6b6b6b]">Loading...</div>
  )

  const existingPhotos = (item.photos ?? []).filter(url => !removedPhotoUrls.has(url))
  const allPhotos = [...existingPhotos, ...newPreviews]

  return (
      <div className="min-h-screen flex flex-col bg-[#f9f9f9]">

        {/* Header */}
        <header className="bg-white border-b border-[#e5e5e5] px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3 sticky top-0 z-10">
          <Link href="/" className="text-[#6b6b6b] hover:text-[#111] transition-colors p-1 -ml-1 shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <span className="text-xs sm:text-sm font-mono text-[#6b6b6b] flex-1 truncate">{item.sku}</span>
          {user && (
            <div className="flex items-center gap-2 shrink-0">
              {editing ? (
                <>
                  <button
                    onClick={() => { setEditing(false); setForm(item); setNewPhotos([]); setNewPreviews([]); setRemovedPhotoUrls(new Set()) }}
                    className="text-sm text-[#6b6b6b] hover:text-[#111] transition-colors px-2 py-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-[#111] text-white text-sm px-4 py-2 rounded-xl hover:bg-[#333] transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </>
              ) : (
                <>
                  <button onClick={handleArchive} className="text-sm text-[#6b6b6b] hover:text-red-500 transition-colors hidden sm:block">
                    Archive
                  </button>
                  <button
                    onClick={() => setEditing(true)}
                    className="bg-[#111] text-white text-sm px-4 py-2 rounded-xl hover:bg-[#333] transition-colors"
                  >
                    Edit
                  </button>
                </>
              )}
            </div>
          )}
        </header>

        <main className="flex-1 max-w-4xl mx-auto w-full">

          {/* AI error banner */}
          {analyzeError && (
            <div className="mx-4 sm:mx-6 mt-4 bg-red-50 border border-red-200 rounded-2xl p-4 sm:p-5">
              <p className="text-xs text-red-600 uppercase tracking-wider mb-1">Analysis failed</p>
              <p className="text-sm text-red-700">{analyzeError}</p>
            </div>
          )}

          {/* AI Suggestions banner */}
          {suggestions && (
            <div className="mx-4 sm:mx-6 mt-4 bg-[#f9f9f9] border border-[#e5e5e5] rounded-2xl p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-[#6b6b6b] uppercase tracking-wider">AI Suggestions</p>
                <button onClick={applyAllSuggestions} className="text-xs bg-[#111] text-white px-3 py-1.5 rounded-lg hover:bg-[#333] transition-colors">
                  Apply All
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {Object.entries(suggestions).filter(([, v]) => v).map(([key, value]) => (
                  <div key={key} className="flex items-start gap-3 bg-white border border-[#e5e5e5] rounded-xl p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-[#aaa] uppercase tracking-wider mb-0.5">{SUGGESTION_LABELS[key] ?? key}</p>
                      <p className="text-sm text-[#333] leading-snug">{value}</p>
                    </div>
                    <button
                      onClick={() => applySuggestion(key, value)}
                      disabled={appliedKeys.has(key)}
                      className="shrink-0 text-xs border border-[#e5e5e5] rounded-lg px-2.5 py-1 hover:border-[#111] transition-colors disabled:opacity-40 disabled:cursor-default"
                    >
                      {appliedKeys.has(key) ? '✓' : 'Apply'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:gap-8 lg:px-6 lg:py-8">

            {/* ── Photo column ── */}
            <div className="flex flex-col">
              {/* Main photo */}
              <div className="aspect-square bg-[#f3f3f3] lg:rounded-2xl lg:border lg:border-[#e5e5e5] overflow-hidden">
                {allPhotos.length > 0 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={allPhotos[activePhoto]} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#ccc] text-sm">No photos</div>
                )}
              </div>

              {/* Thumbnail strip */}
              {(allPhotos.length > 1 || editing) && (
                <div className="flex gap-2 overflow-x-auto px-4 sm:px-0 py-3 lg:flex-wrap lg:overflow-x-visible">
                  {existingPhotos.map((src, i) => (
                    <div key={src} className="relative shrink-0">
                      <button
                        onClick={() => setActivePhoto(i)}
                        className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 transition-colors ${activePhoto === i ? 'border-[#111]' : 'border-[#e5e5e5]'}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="" className="w-full h-full object-cover" />
                      </button>
                      {editing && (
                        <button
                          onClick={() => removeExistingPhoto(src)}
                          className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 z-10"
                        >×</button>
                      )}
                    </div>
                  ))}
                  {newPreviews.map((src, i) => (
                    <div key={src} className="relative shrink-0">
                      <button
                        onClick={() => setActivePhoto(existingPhotos.length + i)}
                        className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 transition-colors ${activePhoto === existingPhotos.length + i ? 'border-[#111]' : 'border-[#e5e5e5]'}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="" className="w-full h-full object-cover" />
                      </button>
                      {editing && (
                        <button
                          onClick={() => removeNewPhoto(i)}
                          className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 z-10"
                        >×</button>
                      )}
                    </div>
                  ))}
                  {editing && (
                    <label className="shrink-0 w-14 h-14 sm:w-16 sm:h-16 border-2 border-dashed border-[#e5e5e5] rounded-xl flex items-center justify-center cursor-pointer hover:border-[#aaa] transition-colors">
                      <span className="text-[#ccc] text-xl">+</span>
                      <input type="file" accept="image/*" multiple capture="environment" onChange={handleNewPhotos} className="hidden" />
                    </label>
                  )}
                </div>
              )}

              {/* AI analyze / re-analyze section */}
              {(item.photos ?? []).length > 0 && (
                <div className="px-4 sm:px-0 pb-2 lg:pb-0 flex flex-col gap-2">
                  {editing && (
                    <textarea
                      value={userContext}
                      onChange={e => setUserContext(e.target.value)}
                      placeholder="Share your thoughts, observations, or context about this piece — Claude will factor them into the re-analysis..."
                      rows={3}
                      className="w-full border border-[#e5e5e5] rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#111] transition-colors resize-none placeholder:text-[#bbb]"
                    />
                  )}
                  <button
                    onClick={handleGenerateDescription}
                    disabled={generating}
                    className="w-full flex items-center justify-center gap-2 border border-[#e5e5e5] bg-white rounded-xl py-2.5 text-sm text-[#6b6b6b] hover:border-[#111] hover:text-[#111] transition-colors disabled:opacity-40"
                  >
                    {generating ? (
                      <>
                        <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <circle cx="12" cy="12" r="3" /><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
                        </svg>
                        {editing ? 'Re-analyze with AI' : 'Analyze with AI'}
                      </>
                    )}
                  </button>
                  {analyzeError && (
                    <p className="text-xs text-red-500 text-center px-2">{analyzeError}</p>
                  )}
                </div>
              )}

              {/* Mobile archive button */}
              {user && !editing && (
                <div className="px-4 sm:px-0 pb-4 mt-2 sm:hidden">
                  <button onClick={handleArchive} className="w-full border border-[#e5e5e5] bg-white rounded-xl py-2.5 text-sm text-[#6b6b6b] hover:border-red-300 hover:text-red-500 transition-colors">
                    Archive this piece
                  </button>
                </div>
              )}
            </div>

            {/* ── Info / Edit column ── */}
            <div className="px-4 sm:px-6 lg:px-0 py-4 lg:py-0 flex flex-col gap-4">
              {editing ? (
                <EditForm form={form} set={set} />
              ) : (
                <ViewInfo item={item} />
              )}
            </div>
          </div>
        </main>
      </div>
  )
}

function ViewInfo({ item }: { item: PotteryItem }) {
  const entered = new Date(item.created_at).toLocaleDateString()
  return (
    <>
      <div>
        <h1 className="text-xl sm:text-2xl font-light mb-1">{item.name}</h1>
        <p className="text-xs text-[#6b6b6b]">Entered {entered}</p>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        <InfoField label="Origin" value={item.place_of_origin} />
        <InfoField label="Age" value={item.age} />
        <InfoField label="Color" value={item.color} />
        {item.use_function && <InfoField label="Use / Function" value={item.use_function} />}
        {item.tribe_culture && <InfoField label="Culture" value={item.tribe_culture} />}
        {item.dimensions && <InfoField label="Dimensions" value={item.dimensions} />}
        {item.condition && <InfoField label="Condition" value={item.condition} />}
        {item.rarity && <InfoField label="Rarity" value={item.rarity} />}
        {item.originality && <InfoField label="Originality" value={item.originality} />}
        {item.case_id && <InfoField label="Display Case" value={CASES.find(c => c.id === item.case_id)?.name ?? item.case_id} />}
        {item.date_acquired && <InfoField label="Date Acquired" value={new Date(item.date_acquired).toLocaleDateString()} />}
        {item.location_acquired && <InfoField label="Acquired From" value={item.location_acquired} />}
        {item.seller_donator && <InfoField label="Seller / Donator" value={item.seller_donator} />}
        {item.provenance && <InfoField label="Provenance" value={item.provenance} />}
        {item.appraised_value != null && <InfoField label="Appraised Value" value={`$${item.appraised_value.toLocaleString()}`} />}
        {item.acquisition_cost != null && <InfoField label="Acquisition Cost" value={`$${item.acquisition_cost.toLocaleString()}`} />}
        {item.museums_comparable && <InfoField label="Comparable Museums" value={item.museums_comparable} />}
      </div>

      {item.description && (
        <div className="border-t border-[#e5e5e5] pt-4">
          <p className="text-xs text-[#6b6b6b] uppercase tracking-wider mb-2">Description</p>
          <p className="text-sm text-[#333] leading-relaxed whitespace-pre-wrap">{item.description}</p>
        </div>
      )}
      {item.research_notes && (
        <div className="border-t border-[#e5e5e5] pt-4">
          <p className="text-xs text-[#6b6b6b] uppercase tracking-wider mb-2">Research Notes</p>
          <p className="text-sm text-[#333] leading-relaxed whitespace-pre-wrap">{item.research_notes}</p>
        </div>
      )}
    </>
  )
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-[#aaa] uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  )
}

function EditForm({ form, set }: { form: Partial<PotteryItem>; set: (f: string, v: unknown) => void }) {
  const inp = 'w-full border border-[#e5e5e5] rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#111] transition-colors'
  return (
    <div className="flex flex-col gap-4">
      <EF label="Name"><input value={form.name ?? ''} onChange={e => set('name', e.target.value)} className={inp} /></EF>
      <EF label="Place of Origin"><input value={form.place_of_origin ?? ''} onChange={e => set('place_of_origin', e.target.value)} className={inp} /></EF>
      <div className="grid grid-cols-2 gap-3">
        <EF label="Age / Period"><input value={form.age ?? ''} onChange={e => set('age', e.target.value)} className={inp} /></EF>
        <EF label="Color"><input value={form.color ?? ''} onChange={e => set('color', e.target.value)} className={inp} /></EF>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <EF label="Use / Function"><input value={form.use_function ?? ''} onChange={e => set('use_function', e.target.value)} className={inp} /></EF>
        <EF label="Tribe / Culture"><input value={form.tribe_culture ?? ''} onChange={e => set('tribe_culture', e.target.value)} className={inp} /></EF>
        <EF label="Dimensions"><input value={form.dimensions ?? ''} onChange={e => set('dimensions', e.target.value)} className={inp} /></EF>
        <EF label="Display Case">
          <select value={form.case_id ?? ''} onChange={e => set('case_id', e.target.value)} className={inp}>
            <option value="">— Unassigned —</option>
            {CASES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </EF>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <EF label="Condition">
          <select value={form.condition ?? ''} onChange={e => set('condition', e.target.value)} className={inp}>
            <option value="">—</option>
            {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </EF>
        <EF label="Rarity">
          <select value={form.rarity ?? ''} onChange={e => set('rarity', e.target.value)} className={inp}>
            <option value="">—</option>
            {RARITIES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </EF>
        <EF label="Originality">
          <select value={form.originality ?? ''} onChange={e => set('originality', e.target.value)} className={inp}>
            <option value="">—</option>
            {ORIGINALITIES.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </EF>
      </div>
      <EF label="Date Acquired"><input type="date" value={form.date_acquired ?? ''} onChange={e => set('date_acquired', e.target.value)} className={inp} /></EF>
      <div className="grid grid-cols-2 gap-3">
        <EF label="Location Acquired"><input value={form.location_acquired ?? ''} onChange={e => set('location_acquired', e.target.value)} className={inp} /></EF>
        <EF label="Seller / Donator"><input value={form.seller_donator ?? ''} onChange={e => set('seller_donator', e.target.value)} className={inp} /></EF>
        <EF label="Appraised Value ($)"><input type="number" value={form.appraised_value ?? ''} onChange={e => set('appraised_value', e.target.value ? parseFloat(e.target.value) : null)} className={inp} /></EF>
        <EF label="Acquisition Cost ($)"><input type="number" value={form.acquisition_cost ?? ''} onChange={e => set('acquisition_cost', e.target.value ? parseFloat(e.target.value) : null)} className={inp} /></EF>
      </div>
      <EF label="Provenance"><input value={form.provenance ?? ''} onChange={e => set('provenance', e.target.value)} className={inp} /></EF>
      <EF label="Comparable Museums"><input value={form.museums_comparable ?? ''} onChange={e => set('museums_comparable', e.target.value)} className={inp} /></EF>
      <EF label="Research Notes"><textarea value={form.research_notes ?? ''} onChange={e => set('research_notes', e.target.value)} rows={4} className={inp + ' resize-none'} /></EF>
      <EF label="Description"><textarea value={form.description ?? ''} onChange={e => set('description', e.target.value)} rows={4} className={inp + ' resize-none'} /></EF>
    </div>
  )
}

function EF({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-[#6b6b6b] uppercase tracking-wider">{label}</label>
      {children}
    </div>
  )
}
