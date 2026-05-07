'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import AuthGuard from '@/components/AuthGuard'
import { CASES, CASE_IDS } from '@/lib/constants'

const CONDITIONS = ['Mint', 'Excellent', 'Good', 'Fair', 'Poor']
const RARITIES = ['Common', 'Uncommon', 'Rare', 'Museum-Grade']
const ORIGINALITIES = ['Authenticated Original', 'Suspected Original', 'Reproduction', 'Unknown']

type PhotoMode = 'single' | 'multi' | null

type AISuggestions = {
  description?: string
  name?: string
  place_of_origin?: string
  age?: string
  color?: string
  use_function?: string
  tribe_culture?: string
  condition?: string
  rarity?: string
  originality?: string
  dimensions?: string
  research_notes?: string
}

const SUGGESTION_LABELS: Record<keyof AISuggestions, string> = {
  description: 'Description', name: 'Name', place_of_origin: 'Place of Origin',
  age: 'Age / Period', color: 'Color', use_function: 'Use / Function',
  tribe_culture: 'Tribe / Culture', condition: 'Condition', rarity: 'Rarity',
  originality: 'Originality', dimensions: 'Dimensions', research_notes: 'Research Notes',
}

export default function AddPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [photoMode, setPhotoMode] = useState<PhotoMode>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [description, setDescription] = useState('')
  const [generating, setGenerating] = useState(false)
  const [suggestions, setSuggestions] = useState<AISuggestions | null>(null)
  const [appliedKeys, setAppliedKeys] = useState<Set<string>>(new Set())

  const [form, setForm] = useState({
    name: '', use_function: '', place_of_origin: '', age: '', color: '',
    tribe_culture: '', condition: '', rarity: '', originality: '', dimensions: '',
    date_acquired: '', location_acquired: '', seller_donator: '', appraised_value: '',
    acquisition_cost: '', case_id: '', museums_comparable: '', provenance: '',
    research_notes: '',
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function fileToBase64(file: File): Promise<{ imageBase64: string; mediaType: string }> {
    const MAX_DIM = 1568
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
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) { reject(new Error('Canvas unavailable')); return }
        ctx.drawImage(img, 0, 0, width, height)
        const data = canvas.toDataURL('image/jpeg', 0.85).split(',')[1]
        resolve({ imageBase64: data, mediaType: 'image/jpeg' })
      }
      img.onerror = reject
      img.src = url
    })
  }

  async function analyzePhotos(files: File[]) {
    setGenerating(true)
    setSuggestions(null)
    setAppliedKeys(new Set())
    try {
      const images = await Promise.all(files.map(fileToBase64))
      const res = await fetch('/api/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images }),
      })
      const data = await res.json()
      if (data && !data.error) setSuggestions(data)
    } catch {
      // silently fail — user can still fill in manually
    }
    setGenerating(false)
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    const isFirst = photos.length === 0
    setPhotos(prev => [...prev, ...files])
    setPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))])
    // Auto-analyze immediately in single mode
    if (photoMode === 'single' && isFirst) analyzePhotos([files[0]])
    e.target.value = ''
  }

  function removePhoto(index: number) {
    setPhotos(prev => prev.filter((_, i) => i !== index))
    setPreviews(prev => prev.filter((_, i) => i !== index))
  }

  function applySuggestion(key: keyof AISuggestions) {
    const value = suggestions?.[key]
    if (!value) return
    if (key === 'description') setDescription(value)
    else set(key, value)
    setAppliedKeys(prev => new Set([...prev, key]))
  }

  function applyAll() {
    if (!suggestions) return
    for (const key of Object.keys(suggestions) as (keyof AISuggestions)[]) {
      if (suggestions[key]) applySuggestion(key)
    }
  }

  async function generateSKU(): Promise<string> {
    const { count } = await supabase.from('pottery').select('*', { count: 'exact', head: true })
    const next = (count ?? 0) + 1
    return `P${String(next).padStart(4, '0')}`
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const sku = await generateSKU()
      const photoUrls: string[] = []
      for (const file of photos) {
        const ext = file.name.split('.').pop()
        const path = `${sku}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage.from('pottery-photos').upload(path, file)
        if (uploadError) throw uploadError
        const { data } = supabase.storage.from('pottery-photos').getPublicUrl(path)
        photoUrls.push(data.publicUrl)
      }
      const { data, error: insertError } = await supabase
        .from('pottery')
        .insert({
          sku, name: form.name,
          use_function: form.use_function || null,
          place_of_origin: form.place_of_origin,
          age: form.age, color: form.color,
          tribe_culture: form.tribe_culture || null,
          condition: CONDITIONS.includes(form.condition) ? form.condition : null,
          rarity: RARITIES.includes(form.rarity) ? form.rarity : null,
          originality: ORIGINALITIES.includes(form.originality) ? form.originality : null,
          dimensions: form.dimensions || null,
          date_acquired: form.date_acquired || null,
          location_acquired: form.location_acquired || null,
          seller_donator: form.seller_donator || null,
          appraised_value: form.appraised_value ? parseFloat(form.appraised_value) : null,
          acquisition_cost: form.acquisition_cost ? parseFloat(form.acquisition_cost) : null,
          case_id: CASE_IDS.includes(form.case_id as typeof CASE_IDS[number]) ? form.case_id : null,
          museums_comparable: form.museums_comparable || null,
          provenance: form.provenance || null,
          research_notes: form.research_notes || description
            ? [description, form.research_notes].filter(Boolean).join('\n\n')
            : null,
          photos: photoUrls,
          status: 'Active',
        })
        .select().single()
      if (insertError) throw insertError
      router.push(`/item/${data.id}`)
    } catch (err: unknown) {
      const msg = err instanceof Error
        ? err.message
        : (err as { message?: string })?.message ?? 'Something went wrong'
      setError(msg)
      setSaving(false)
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col bg-[#f9f9f9]">
        <header className="bg-white border-b border-[#e5e5e5] px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3 sticky top-0 z-10">
          <Link href="/" className="text-[#6b6b6b] hover:text-[#111] transition-colors p-1 -ml-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <h1 className="text-sm sm:text-lg font-light tracking-widest uppercase flex-1">Add New Piece</h1>
        </header>

        <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-4 sm:py-8 pb-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">

            {/* ── Step 1: Mode picker ── */}
            {photoMode === null && (
              <section className="bg-white border border-[#e5e5e5] rounded-2xl overflow-hidden">
                <div className="px-6 pt-6 pb-4 text-center">
                  <p className="text-sm font-medium text-[#111]">How would you like to photograph this piece?</p>
                  <p className="text-xs text-[#6b6b6b] mt-1">Multiple photos give Claude more angles for a more accurate analysis</p>
                </div>
                <div className="grid grid-cols-2 divide-x divide-[#e5e5e5] border-t border-[#e5e5e5]">
                  {/* Single */}
                  <button
                    type="button"
                    onClick={() => setPhotoMode('single')}
                    className="flex flex-col items-center gap-3 p-6 hover:bg-[#f9f9f9] active:bg-[#f3f3f3] transition-colors"
                  >
                    <div className="w-14 h-14 rounded-full bg-[#f3f3f3] flex items-center justify-center">
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#6b6b6b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-[#111]">Single Photo</p>
                      <p className="text-xs text-[#6b6b6b] mt-0.5">AI analyzes immediately</p>
                    </div>
                  </button>

                  {/* Multiple */}
                  <button
                    type="button"
                    onClick={() => setPhotoMode('multi')}
                    className="flex flex-col items-center gap-3 p-6 hover:bg-[#f9f9f9] active:bg-[#f3f3f3] transition-colors"
                  >
                    <div className="w-14 h-14 rounded-full bg-[#111] flex items-center justify-center">
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="6" width="14" height="13" rx="2" />
                        <path d="M16 8h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-3" />
                        <circle cx="9" cy="13" r="2.5" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-[#111]">Multiple Photos</p>
                      <p className="text-xs text-[#6b6b6b] mt-0.5">Add all, then analyze</p>
                    </div>
                  </button>
                </div>
              </section>
            )}

            {/* ── Step 2: Photo capture (after mode selected) ── */}
            {photoMode !== null && (
              <section className="bg-white border border-[#e5e5e5] rounded-2xl overflow-hidden">
                {previews.length === 0 ? (
                  /* Empty: big tap target */
                  <label className="flex flex-col items-center justify-center gap-3 py-12 cursor-pointer group">
                    <div className="w-16 h-16 rounded-full bg-[#f3f3f3] group-active:bg-[#e5e5e5] flex items-center justify-center transition-colors">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6b6b6b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-[#111]">
                        {photoMode === 'single' ? 'Photograph your piece' : 'Add your first photo'}
                      </p>
                      <p className="text-xs text-[#6b6b6b] mt-1">
                        {photoMode === 'single' ? 'AI will analyze it automatically' : 'Add all angles, then run analysis'}
                      </p>
                    </div>
                    <input type="file" accept="image/*" capture="environment" multiple={photoMode === 'multi'} onChange={handlePhotoChange} className="hidden" />
                  </label>
                ) : (
                  <div className="p-4">
                    {/* Analyzing banner */}
                    {generating && (
                      <div className="flex items-center gap-2 mb-3 px-3 py-2.5 bg-[#f9f9f9] border border-[#e5e5e5] rounded-xl">
                        <svg className="animate-spin shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b6b6b" strokeWidth="2">
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                        <p className="text-xs text-[#6b6b6b]">
                          {photos.length > 1
                            ? `Analyzing ${photos.length} photos with AI...`
                            : 'Analyzing your piece with AI...'}
                        </p>
                      </div>
                    )}

                    {/* Thumbnails */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {previews.map((src, i) => (
                        <div key={i} className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border border-[#e5e5e5]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={src} alt="" className="w-full h-full object-cover" />
                          {generating && (
                            <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                              <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                              </svg>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => removePhoto(i)}
                            className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-black transition-colors"
                          >×</button>
                        </div>
                      ))}
                      {/* Add more button */}
                      <label className="w-20 h-20 sm:w-24 sm:h-24 border-2 border-dashed border-[#e5e5e5] rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-[#aaa] transition-colors">
                        <span className="text-xl text-[#ccc]">+</span>
                        <span className="text-[10px] text-[#aaa]">Add</span>
                        <input type="file" accept="image/*" capture="environment" multiple onChange={handlePhotoChange} className="hidden" />
                      </label>
                    </div>

                    {/* Multi mode: Analyze All button */}
                    {photoMode === 'multi' && !generating && photos.length > 0 && (
                      <button
                        type="button"
                        onClick={() => analyzePhotos(photos)}
                        className="w-full bg-[#111] text-white rounded-xl py-3 text-sm font-medium hover:bg-[#333] transition-colors"
                      >
                        Analyze {photos.length} {photos.length === 1 ? 'Photo' : 'Photos'} with AI
                      </button>
                    )}

                    {/* Single mode: re-analyze option */}
                    {photoMode === 'single' && !generating && photos.length > 0 && (
                      <button
                        type="button"
                        onClick={() => analyzePhotos(photos)}
                        className="text-xs text-[#6b6b6b] hover:text-[#111] underline underline-offset-2 transition-colors"
                      >
                        Re-analyze with AI
                      </button>
                    )}
                  </div>
                )}

                {/* Mode switcher */}
                <div className="px-4 pb-3 border-t border-[#f3f3f3] pt-3">
                  <button
                    type="button"
                    onClick={() => { setPhotoMode(null); setPhotos([]); setPreviews([]); setSuggestions(null) }}
                    className="text-xs text-[#bbb] hover:text-[#6b6b6b] transition-colors"
                  >
                    ← Change photo mode
                  </button>
                </div>
              </section>
            )}

            {/* ── AI Suggestions ── */}
            {suggestions && (
              <section className="bg-[#f9f9f9] border border-[#e5e5e5] rounded-2xl p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs text-[#6b6b6b] uppercase tracking-wider">AI Suggestions</p>
                  <button type="button" onClick={applyAll} className="text-xs bg-[#111] text-white px-3 py-1.5 rounded-lg hover:bg-[#333] transition-colors">
                    Apply All
                  </button>
                </div>
                <div className="flex flex-col gap-3">
                  {(Object.keys(suggestions) as (keyof AISuggestions)[])
                    .filter(k => suggestions[k])
                    .map(key => (
                      <div key={key} className="flex items-start gap-3 bg-white border border-[#e5e5e5] rounded-xl p-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-[#aaa] uppercase tracking-wider mb-0.5">{SUGGESTION_LABELS[key]}</p>
                          <p className="text-sm text-[#333] leading-snug">{suggestions[key]}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => applySuggestion(key)}
                          disabled={appliedKeys.has(key)}
                          className="shrink-0 text-xs border border-[#e5e5e5] rounded-lg px-2.5 py-1 hover:border-[#111] transition-colors disabled:opacity-40 disabled:cursor-default"
                        >
                          {appliedKeys.has(key) ? '✓' : 'Apply'}
                        </button>
                      </div>
                    ))}
                </div>
              </section>
            )}

            {/* ── Required fields ── */}
            <section className="bg-white border border-[#e5e5e5] rounded-2xl p-4 sm:p-6">
              <p className="text-xs text-[#6b6b6b] uppercase tracking-wider mb-4">Required</p>
              <div className="flex flex-col gap-4">
                <Field label="Name / Description" required>
                  <input value={form.name} onChange={e => set('name', e.target.value)} required className={inputClass} />
                </Field>
                <Field label="Place of Origin" required>
                  <input value={form.place_of_origin} onChange={e => set('place_of_origin', e.target.value)} required className={inputClass} />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Age / Period" required>
                    <input value={form.age} onChange={e => set('age', e.target.value)} required placeholder="e.g. 1200–1400 AD" className={inputClass} />
                  </Field>
                  <Field label="Color" required>
                    <input value={form.color} onChange={e => set('color', e.target.value)} required className={inputClass} />
                  </Field>
                </div>
              </div>
            </section>

            {/* ── Details ── */}
            <section className="bg-white border border-[#e5e5e5] rounded-2xl p-4 sm:p-6">
              <p className="text-xs text-[#6b6b6b] uppercase tracking-wider mb-4">Details</p>
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Use / Function">
                    <input value={form.use_function} onChange={e => set('use_function', e.target.value)} placeholder="e.g. Ceremonial" className={inputClass} />
                  </Field>
                  <Field label="Tribe / Culture">
                    <input value={form.tribe_culture} onChange={e => set('tribe_culture', e.target.value)} className={inputClass} />
                  </Field>
                  <Field label="Dimensions">
                    <input value={form.dimensions} onChange={e => set('dimensions', e.target.value)} placeholder='e.g. 8"H × 5"W' className={inputClass} />
                  </Field>
                  <Field label="Display Case">
                    <select value={form.case_id} onChange={e => set('case_id', e.target.value)} className={inputClass}>
                      <option value="">— Unassigned —</option>
                      {CASES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </Field>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <Field label="Condition">
                    <select value={form.condition} onChange={e => set('condition', e.target.value)} className={inputClass}>
                      <option value="">—</option>
                      {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                  <Field label="Rarity">
                    <select value={form.rarity} onChange={e => set('rarity', e.target.value)} className={inputClass}>
                      <option value="">—</option>
                      {RARITIES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </Field>
                  <Field label="Originality">
                    <select value={form.originality} onChange={e => set('originality', e.target.value)} className={inputClass}>
                      <option value="">—</option>
                      {ORIGINALITIES.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </Field>
                </div>
              </div>
            </section>

            {/* ── Acquisition ── */}
            <section className="bg-white border border-[#e5e5e5] rounded-2xl p-4 sm:p-6">
              <p className="text-xs text-[#6b6b6b] uppercase tracking-wider mb-4">Acquisition</p>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Date Acquired">
                  <input type="date" value={form.date_acquired} onChange={e => set('date_acquired', e.target.value)} className={inputClass} />
                </Field>
                <Field label="Location Acquired">
                  <input value={form.location_acquired} onChange={e => set('location_acquired', e.target.value)} className={inputClass} />
                </Field>
                <Field label="Seller / Donator">
                  <input value={form.seller_donator} onChange={e => set('seller_donator', e.target.value)} className={inputClass} />
                </Field>
                <Field label="Provenance">
                  <input value={form.provenance} onChange={e => set('provenance', e.target.value)} placeholder="Chain of ownership" className={inputClass} />
                </Field>
                <Field label="Acquisition Cost ($)">
                  <input type="number" value={form.acquisition_cost} onChange={e => set('acquisition_cost', e.target.value)} min="0" step="0.01" className={inputClass} />
                </Field>
                <Field label="Appraised Value ($)">
                  <input type="number" value={form.appraised_value} onChange={e => set('appraised_value', e.target.value)} min="0" step="0.01" className={inputClass} />
                </Field>
              </div>
            </section>

            {/* ── Research ── */}
            <section className="bg-white border border-[#e5e5e5] rounded-2xl p-4 sm:p-6">
              <p className="text-xs text-[#6b6b6b] uppercase tracking-wider mb-4">Research</p>
              <div className="flex flex-col gap-4">
                <Field label="Museums with Comparable Pieces">
                  <input value={form.museums_comparable} onChange={e => set('museums_comparable', e.target.value)} className={inputClass} />
                </Field>
                <Field label="Notes">
                  <textarea value={form.research_notes} onChange={e => set('research_notes', e.target.value)} rows={3} className={inputClass + ' resize-none'} />
                </Field>
              </div>
            </section>

            {/* ── Description ── */}
            <section className="bg-white border border-[#e5e5e5] rounded-2xl p-4 sm:p-6">
              <label className="text-xs text-[#6b6b6b] uppercase tracking-wider block mb-3">Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder="AI-generated or written description..." className={inputClass + ' resize-none'} />
            </section>

            {error && <p className="text-red-500 text-sm px-1">{error}</p>}

            <button
              type="submit"
              disabled={saving}
              className="bg-[#111] text-white rounded-2xl py-4 text-sm font-medium hover:bg-[#333] transition-colors disabled:opacity-50"
              style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
            >
              {saving ? 'Saving...' : 'Save Piece'}
            </button>
          </form>
        </main>
      </div>
    </AuthGuard>
  )
}

const inputClass = 'w-full border border-[#e5e5e5] rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#111] transition-colors'

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-[#6b6b6b] uppercase tracking-wider">
        {label}{required && <span className="text-[#111] ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
