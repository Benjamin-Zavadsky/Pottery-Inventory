'use client'

import { useState, useMemo, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { CULTURES } from '@/lib/constants'
import type { PotteryItem } from '@/lib/types'

const CONDITIONS = ['Mint', 'Excellent', 'Good', 'Fair', 'Poor']

interface Props {
  mode: 'add' | 'edit'
  item?: PotteryItem
  onClose: () => void
  onSaved: (item: PotteryItem) => void
}

export default function PieceModal({ mode, item, onClose, onSaved }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '',
    tribe_culture: '',
    age: '',
    condition: '',
    imageUrl: '',
    research_notes: '',
  })

  useEffect(() => {
    if (mode === 'edit' && item) {
      setForm({
        name: item.name,
        tribe_culture: item.tribe_culture ?? '',
        age: item.age ?? '',
        condition: item.condition ?? '',
        imageUrl: item.photos?.[0] ?? '',
        research_notes: item.research_notes ?? '',
      })
    }
  }, [mode, item])

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function generateSKU(): Promise<string> {
    const { count } = await supabase.from('pottery').select('*', { count: 'exact', head: true })
    const next = (count ?? 0) + 1
    return `P${String(next).padStart(4, '0')}`
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError('')
    try {
      if (mode === 'add') {
        const sku = await generateSKU()
        const cultureEntry = CULTURES.find(c => c.culture === form.tribe_culture)
        const place_of_origin = cultureEntry?.region ?? 'Unknown'
        const photos = form.imageUrl.trim() ? [form.imageUrl.trim()] : []
        const { data, error: err } = await supabase
          .from('pottery')
          .insert({
            sku,
            name: form.name.trim(),
            tribe_culture: form.tribe_culture || null,
            age: form.age.trim() || 'Unknown',
            condition: CONDITIONS.includes(form.condition) ? form.condition : null,
            research_notes: form.research_notes.trim() || null,
            place_of_origin,
            color: 'Unknown',
            photos,
            status: 'Active',
          })
          .select()
          .single()
        if (err) throw err
        onSaved(data as PotteryItem)
      } else if (mode === 'edit' && item) {
        const existingPhotos = item.photos ?? []
        const photos = form.imageUrl.trim()
          ? [form.imageUrl.trim(), ...existingPhotos.slice(1)]
          : existingPhotos
        const { data, error: err } = await supabase
          .from('pottery')
          .update({
            name: form.name.trim(),
            tribe_culture: form.tribe_culture || null,
            age: form.age.trim() || item.age,
            condition: CONDITIONS.includes(form.condition) ? form.condition : item.condition,
            research_notes: form.research_notes.trim() || null,
            photos,
          })
          .eq('id', item.id)
          .select()
          .single()
        if (err) throw err
        onSaved(data as PotteryItem)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message ?? 'Something went wrong'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white w-full sm:w-[480px] rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#e5e5e5]">
          <h2 className="text-sm font-medium tracking-wide">{mode === 'add' ? 'Add Piece' : 'Edit Piece'}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#f3f3f3] text-[#6b6b6b] text-lg">×</button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-4">
          {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <Field label="Name *">
            <input
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              className="input-base"
              placeholder="e.g. Effigy Vessel"
            />
          </Field>

          <Field label="Culture">
            <select value={form.tribe_culture} onChange={e => set('tribe_culture', e.target.value)} className="input-base">
              <option value="">— Unknown —</option>
              {CULTURES.map(c => (
                <option key={c.culture} value={c.culture}>{c.culture}</option>
              ))}
            </select>
          </Field>

          <Field label="Period / Age">
            <input
              type="text"
              value={form.age}
              onChange={e => set('age', e.target.value)}
              className="input-base"
              placeholder="e.g. 800–1200 CE"
            />
          </Field>

          <Field label="Condition">
            <select value={form.condition} onChange={e => set('condition', e.target.value)} className="input-base">
              <option value="">— Unknown —</option>
              {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>

          <Field label="Image URL">
            <input
              type="url"
              value={form.imageUrl}
              onChange={e => set('imageUrl', e.target.value)}
              className="input-base"
              placeholder="https://..."
            />
          </Field>

          <Field label="Notes">
            <textarea
              value={form.research_notes}
              onChange={e => set('research_notes', e.target.value)}
              rows={3}
              className="input-base resize-none"
              placeholder="Optional research notes..."
            />
          </Field>
        </form>

        <div className="px-5 pt-3 pb-5 border-t border-[#e5e5e5]" style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full bg-[#111] text-white rounded-xl py-3 text-sm font-medium disabled:opacity-50"
          >
            {saving ? 'Saving…' : mode === 'add' ? 'Add Piece' : 'Save Changes'}
          </button>
        </div>
      </div>

      <style>{`.input-base { width: 100%; border: 1px solid #e5e5e5; border-radius: 10px; padding: 10px 12px; font-size: 14px; background: white; outline: none; } .input-base:focus { border-color: #111; }`}</style>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-[#aaa] uppercase tracking-wider">{label}</label>
      {children}
    </div>
  )
}
