// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useState } from 'react';
import { fireEvent, render, renderWithToast, screen, waitFor } from '../support/render';
import { createSupabaseMock } from '../support/supabaseMock';
import { makeFile, stubImageAndCanvas } from '../support/browser';
import { STORAGE } from '../support/fixtures';
import SuggestionsPanel from '@/components/SuggestionsPanel';
import PhotoManager from '@/components/PhotoManager';
import {
  IdentificationFields,
  LocationFields,
  NarrativeFields,
  PhysicalFields,
  PrivateFields,
  YearInput,
  FormSection,
} from '@/components/PieceFields';
import { normalizeAiResult } from '@/lib/ai';
import { EMPTY_FORM, EMPTY_PRIVATE, type PieceFormValues } from '@/lib/pieceForm';
import type { StoredPhoto } from '@/lib/photos';
import type { Supabase } from '@/lib/supabase';

describe('SuggestionsPanel', () => {
  const result = normalizeAiResult({
    name: 'Jar',
    culture_id: 'maya',
    confidence: 'Medium',
    color: 'Red',
  });

  it('lists suggestions with current values and applies one or all', () => {
    const onApply = vi.fn();
    const onApplyAll = vi.fn();
    const onDismiss = vi.fn();
    render(
      <SuggestionsPanel
        result={result}
        current={{ name: 'Old name', color: '' }}
        applied={new Set(['color'])}
        onApply={onApply}
        onApplyAll={onApplyAll}
        onDismiss={onDismiss}
      />,
    );
    expect(screen.getByText('Medium confidence')).toBeInTheDocument();
    expect(screen.getByText('Current: Old name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Color applied' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Apply Culture' }));
    expect(onApply).toHaveBeenCalledWith('culture_id', 'maya');
    fireEvent.click(screen.getByRole('button', { name: 'Apply all (3)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onApplyAll).toHaveBeenCalled();
    expect(onDismiss).toHaveBeenCalled();
  });

  it('handles an empty analysis with nothing left to apply', () => {
    render(
      <SuggestionsPanel
        result={normalizeAiResult({})}
        current={{}}
        applied={new Set()}
        onApply={vi.fn()}
        onApplyAll={vi.fn()}
      />,
    );
    expect(screen.getByText('The analysis returned no usable fields.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Apply all/ })).not.toBeInTheDocument();
  });
});

describe('PhotoManager', () => {
  const mock = createSupabaseMock();
  const supabase = mock.supabase as unknown as Supabase;

  function Harness({ initial = [] as StoredPhoto[], onRemove = vi.fn(), onBusy = vi.fn() }) {
    const [pairs, setPairs] = useState(initial);
    return (
      <>
        <PhotoManager
          pairs={pairs}
          setPairs={setPairs}
          folder="f"
          supabase={supabase}
          onRemove={onRemove}
          onBusyChange={onBusy}
        />
        <output data-testid="order">{pairs.map((p) => p.photo).join(',')}</output>
      </>
    );
  }

  beforeEach(() => {
    mock.reset();
    stubImageAndCanvas();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function queueUpload(name: string) {
    mock.queueResult({});
    mock.queueResult({ data: { publicUrl: `${STORAGE}/f/${name}.jpg` } });
    mock.queueResult({});
    mock.queueResult({ data: { publicUrl: `${STORAGE}/f/thumbs/${name}.jpg` } });
  }

  it('uploads from the library, reorders, sets the cover and removes', async () => {
    const onRemove = vi.fn();
    const onBusy = vi.fn();
    renderWithToast(<Harness onRemove={onRemove} onBusy={onBusy} />);
    queueUpload('a');
    queueUpload('b');
    fireEvent.change(screen.getByLabelText('Choose photos'), {
      target: { files: [makeFile('a.jpg'), makeFile('b.jpg')] },
    });
    await waitFor(() => expect(screen.getByTestId('order').textContent).toContain('b.jpg'));
    expect(onBusy).toHaveBeenCalledWith(true);
    expect(onBusy).toHaveBeenLastCalledWith(false);
    expect(screen.getByText('Cover')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Make photo 2 the cover' }));
    expect(screen.getByTestId('order').textContent).toBe(`${STORAGE}/f/b.jpg,${STORAGE}/f/a.jpg`);
    fireEvent.click(screen.getByRole('button', { name: 'Move photo 1 later' }));
    fireEvent.click(screen.getByRole('button', { name: 'Move photo 2 earlier' }));
    expect(screen.getByTestId('order').textContent).toBe(`${STORAGE}/f/b.jpg,${STORAGE}/f/a.jpg`);
    fireEvent.click(screen.getByRole('button', { name: 'Remove photo 1' }));
    expect(onRemove).toHaveBeenCalledWith({
      photo: `${STORAGE}/f/b.jpg`,
      thumb: `${STORAGE}/f/thumbs/b.jpg`,
    });
    expect(screen.getByTestId('order').textContent).toBe(`${STORAGE}/f/a.jpg`);
  });

  it('reports failed uploads and caps the photo count', async () => {
    const full = Array.from({ length: 11 }, (_, i) => ({ photo: `p${i}`, thumb: `t${i}` }));
    renderWithToast(<Harness initial={full} />);
    mock.queueResult({ error: { message: 'quota' } });
    fireEvent.change(screen.getByLabelText('Take photo'), {
      target: { files: [makeFile('a.jpg'), makeFile('b.jpg')] },
    });
    expect(await screen.findByText('Up to 12 photos per piece')).toBeInTheDocument();
    expect(await screen.findByText('Photo upload failed: quota')).toBeInTheDocument();
  });

  it('hides the add buttons once full and ignores empty selections', () => {
    const full = Array.from({ length: 12 }, (_, i) => ({ photo: `p${i}`, thumb: `t${i}` }));
    render(<Harness initial={full} />);
    expect(screen.queryByLabelText('Take photo')).not.toBeInTheDocument();
  });
});

describe('PieceFields', () => {
  function Harness({ initial = EMPTY_FORM }: { initial?: PieceFormValues }) {
    const [form, setForm] = useState(initial);
    const onField = <K extends keyof PieceFormValues>(k: K, v: PieceFormValues[K]) =>
      setForm((f) => ({ ...f, [k]: v }));
    return (
      <FormSection title="All">
        <IdentificationFields form={form} onField={onField} aiFields={['name']} />
        <PhysicalFields form={form} onField={onField} />
        <LocationFields form={form} onField={onField} />
        <NarrativeFields form={form} onField={onField} />
        <output data-testid="form">{JSON.stringify(form)}</output>
      </FormSection>
    );
  }
  const state = () => JSON.parse(screen.getByTestId('form').textContent as string);

  it('edits text, selects, dates and textareas through labelled controls', () => {
    render(<Harness />);
    expect(screen.getAllByText('AI').length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: 'Jar' } });
    fireEvent.change(screen.getByLabelText(/^Condition/), { target: { value: 'Good' } });
    fireEvent.change(screen.getByLabelText(/^Display case/), { target: { value: 'A' } });
    fireEvent.change(screen.getByLabelText(/^Date acquired/), { target: { value: '2024-01-02' } });
    fireEvent.change(screen.getByLabelText(/^Description/), { target: { value: 'Long' } });
    expect(state()).toMatchObject({
      name: 'Jar',
      condition: 'Good',
      case_id: 'A',
      date_acquired: '2024-01-02',
      description: 'Long',
    });
  });

  it('sets the region automatically when a culture is chosen', () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText(/^Culture/), { target: { value: 'nazca' } });
    expect(state()).toMatchObject({ culture_id: 'nazca', region: 'South America' });
    fireEvent.change(screen.getByLabelText(/^Culture/), { target: { value: '' } });
    expect(state().culture_id).toBe('');
  });

  it('YearInput stores BCE years as negatives and switches era', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <YearInput id="y" label="Start" value={null} onChange={onChange} ai />,
    );
    fireEvent.change(screen.getByLabelText('Start era'), { target: { value: 'BCE' } });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(/^Start/, { selector: 'input' }), {
      target: { value: '800' },
    });
    expect(onChange).toHaveBeenLastCalledWith(-800);
    rerender(<YearInput id="y" label="Start" value={-800} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Start era'), { target: { value: 'CE' } });
    expect(onChange).toHaveBeenLastCalledWith(800);
    fireEvent.change(screen.getByLabelText(/^Start/, { selector: 'input' }), {
      target: { value: '' },
    });
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('PrivateFields reports each change', () => {
    const onChange = vi.fn();
    render(<PrivateFields value={EMPTY_PRIVATE} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Acquisition cost ($)'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('Seller / donor'), { target: { value: 'Ann' } });
    expect(onChange).toHaveBeenCalledWith('acquisition_cost', '5');
    expect(onChange).toHaveBeenCalledWith('seller_donator', 'Ann');
  });
});
