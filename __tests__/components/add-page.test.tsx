// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen, fireEvent, waitFor } from '../support/render';
import { createSupabaseMock } from '../support/supabaseMock';
import { stubImageAndCanvas, makeFile } from '../support/browser';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
vi.mock('@/components/AuthGuard', () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('@/lib/supabase', () => ({ createClient: vi.fn() }));

import { createClient } from '@/lib/supabase';
import AddPage from '@/app/add/page';

const supabaseMock = createSupabaseMock();
vi.mocked(createClient).mockReturnValue(
  supabaseMock.supabase as unknown as ReturnType<typeof createClient>,
);

function fillRequiredFields() {
  const inputs = screen.getByText('Required').closest('section')!.querySelectorAll('input');
  fireEvent.change(inputs[0], { target: { value: 'Hand-built Bowl' } });
  fireEvent.change(inputs[1], { target: { value: 'North America' } });
  fireEvent.change(inputs[2], { target: { value: '1200 CE' } });
  fireEvent.change(inputs[3], { target: { value: 'Brown' } });
}

describe('AddPage', () => {
  beforeEach(() => {
    mockPush.mockClear();
    stubImageAndCanvas();
    global.fetch = vi.fn();
  });

  it('shows the photo mode picker first', () => {
    render(<AddPage />);
    expect(screen.getByText('How would you like to photograph this piece?')).toBeInTheDocument();
  });

  it('auto-analyzes after the first photo in single mode', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      json: () => Promise.resolve({ name: 'AI Suggested Name', condition: 'Good' }),
    } as Response);

    render(<AddPage />);
    fireEvent.click(screen.getByText('Single Photo'));
    fireEvent.change(document.querySelector('input[type="file"]')!, {
      target: { files: [makeFile()] },
    });

    expect(await screen.findByText('AI Suggested Name')).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/generate-description',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('applies an individual AI suggestion into the form', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      json: () => Promise.resolve({ place_of_origin: 'Southeastern US' }),
    } as Response);

    render(<AddPage />);
    fireEvent.click(screen.getByText('Single Photo'));
    fireEvent.change(document.querySelector('input[type="file"]')!, {
      target: { files: [makeFile()] },
    });
    await screen.findByText('Southeastern US');

    fireEvent.click(screen.getByText('Apply'));
    expect(screen.getByDisplayValue('Southeastern US')).toBeInTheDocument();
  });

  it('creates the piece and redirects to its detail page on submit', async () => {
    supabaseMock.queueResult({ count: 4 }); // generateSKU
    supabaseMock.queueResult({ data: { id: 'new-id' }, error: null }); // insert

    render(<AddPage />);
    fireEvent.click(screen.getByText('Single Photo'));
    fillRequiredFields();
    fireEvent.click(screen.getByText('Save Piece'));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/item/new-id'));
  });

  it('shows an error and does not redirect when the insert fails', async () => {
    supabaseMock.queueResult({ count: 4 });
    supabaseMock.queueResult({ data: null, error: { message: 'insert failed' } });

    render(<AddPage />);
    fireEvent.click(screen.getByText('Single Photo'));
    fillRequiredFields();
    fireEvent.click(screen.getByText('Save Piece'));

    expect(await screen.findByText('insert failed')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('lets the user switch photo mode back to the picker', () => {
    render(<AddPage />);
    fireEvent.click(screen.getByText('Multiple Photos'));
    fireEvent.click(screen.getByText('← Change photo mode'));
    expect(screen.getByText('How would you like to photograph this piece?')).toBeInTheDocument();
  });

  it('lets the user add several photos in multi mode and analyze them together', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      json: () => Promise.resolve({ name: 'Multi AI Name' }),
    } as Response);

    render(<AddPage />);
    fireEvent.click(screen.getByText('Multiple Photos'));
    fireEvent.change(document.querySelector('input[type="file"]')!, {
      target: { files: [makeFile('a.jpg'), makeFile('b.jpg')] },
    });
    expect(await screen.findByText('Analyze 2 Photos with AI')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Analyze 2 Photos with AI'));
    expect(await screen.findByText('Multi AI Name')).toBeInTheDocument();
  });

  it('removes a photo from the preview strip', async () => {
    render(<AddPage />);
    fireEvent.click(screen.getByText('Multiple Photos'));
    fireEvent.change(document.querySelector('input[type="file"]')!, {
      target: { files: [makeFile()] },
    });
    await screen.findByText('Analyze 1 Photo with AI');

    fireEvent.click(screen.getByText('×'));
    expect(screen.queryByText('Analyze 1 Photo with AI')).not.toBeInTheDocument();
  });

  it('applies all AI suggestions at once', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      json: () => Promise.resolve({ place_of_origin: 'Southeastern US', color: 'Buff' }),
    } as Response);

    render(<AddPage />);
    fireEvent.click(screen.getByText('Single Photo'));
    fireEvent.change(document.querySelector('input[type="file"]')!, {
      target: { files: [makeFile()] },
    });
    await screen.findByText('Southeastern US');

    fireEvent.click(screen.getByText('Apply All'));
    expect(screen.getByDisplayValue('Southeastern US')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Buff')).toBeInTheDocument();
  });

  it('ignores an empty file selection', () => {
    render(<AddPage />);
    fireEvent.click(screen.getByText('Single Photo'));
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [] } });
    expect(screen.getByText('Photograph your piece')).toBeInTheDocument();
  });

  it('applies the description suggestion into the description field', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      json: () => Promise.resolve({ description: 'A fine hand-built vessel.' }),
    } as Response);

    render(<AddPage />);
    fireEvent.click(screen.getByText('Single Photo'));
    fireEvent.change(document.querySelector('input[type="file"]')!, {
      target: { files: [makeFile()] },
    });
    await screen.findByText('A fine hand-built vessel.');

    fireEvent.click(screen.getByText('Apply'));
    expect(screen.getByDisplayValue('A fine hand-built vessel.')).toBeInTheDocument();
  });

  it('silently ignores an analysis failure and lets the user continue', async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error('network down'));

    render(<AddPage />);
    fireEvent.click(screen.getByText('Single Photo'));
    fireEvent.change(document.querySelector('input[type="file"]')!, {
      target: { files: [makeFile()] },
    });

    await waitFor(() =>
      expect(screen.queryByText('Analyzing your piece with AI...')).not.toBeInTheDocument(),
    );
    expect(screen.queryByText('Photograph your piece')).not.toBeInTheDocument();
  });

  it('re-analyzes in single mode via the re-analyze link', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      json: () => Promise.resolve({ name: 'First Pass' }),
    } as Response);

    render(<AddPage />);
    fireEvent.click(screen.getByText('Single Photo'));
    fireEvent.change(document.querySelector('input[type="file"]')!, {
      target: { files: [makeFile()] },
    });
    await screen.findByText('First Pass');

    vi.mocked(global.fetch).mockResolvedValue({
      json: () => Promise.resolve({ name: 'Second Pass' }),
    } as Response);
    fireEvent.click(screen.getByText('Re-analyze with AI'));

    expect(await screen.findByText('Second Pass')).toBeInTheDocument();
  });

  it('removes a photo from the multi-mode preview strip and re-adds it', async () => {
    render(<AddPage />);
    fireEvent.click(screen.getByText('Multiple Photos'));
    fireEvent.change(document.querySelector('input[type="file"]')!, {
      target: { files: [makeFile()] },
    });
    await screen.findByText('Analyze 1 Photo with AI');
    fireEvent.click(screen.getByText('×'));
    expect(screen.queryByText('Analyze 1 Photo with AI')).not.toBeInTheDocument();

    fireEvent.change(document.querySelector('input[type="file"]')!, {
      target: { files: [makeFile(), makeFile('b.jpg')] },
    });
    expect(await screen.findByText('Analyze 2 Photos with AI')).toBeInTheDocument();
  });

  it('resizes a portrait-oriented photo (height greater than width)', async () => {
    class TallImage {
      onload: (() => void) | null = null;
      width = 100;
      height = 300;
      private _src = '';
      set src(v: string) {
        this._src = v;
        queueMicrotask(() => this.onload?.());
      }
      get src() {
        return this._src;
      }
    }
    vi.stubGlobal('Image', TallImage);
    vi.mocked(global.fetch).mockResolvedValue({
      json: () => Promise.resolve({ name: 'Portrait' }),
    } as Response);

    render(<AddPage />);
    fireEvent.click(screen.getByText('Single Photo'));
    fireEvent.change(document.querySelector('input[type="file"]')!, {
      target: { files: [makeFile()] },
    });

    expect(await screen.findByText('Portrait')).toBeInTheDocument();
  });

  it('fills in all optional Details, Acquisition, and Research fields', async () => {
    supabaseMock.queueResult({ count: 4 });
    supabaseMock.queueResult({ data: { id: 'new-id' }, error: null });

    render(<AddPage />);
    fireEvent.click(screen.getByText('Single Photo'));
    fillRequiredFields();

    const detailsInputs = screen.getByText('Details').closest('section')!.querySelectorAll('input');
    fireEvent.change(detailsInputs[0], { target: { value: 'Ceremonial' } }); // use_function
    fireEvent.change(detailsInputs[1], { target: { value: 'Mississippian' } }); // tribe_culture
    fireEvent.change(detailsInputs[2], { target: { value: '8"H' } }); // dimensions
    const detailsSelects = screen
      .getByText('Details')
      .closest('section')!
      .querySelectorAll('select');
    fireEvent.change(detailsSelects[0], { target: { value: 'A' } }); // case_id
    fireEvent.change(detailsSelects[1], { target: { value: 'Good' } }); // condition
    fireEvent.change(detailsSelects[2], { target: { value: 'Rare' } }); // rarity
    fireEvent.change(detailsSelects[3], { target: { value: 'Reproduction' } }); // originality

    const acqInputs = screen.getByText('Acquisition').closest('section')!.querySelectorAll('input');
    fireEvent.change(acqInputs[0], { target: { value: '2020-01-01' } }); // date_acquired
    fireEvent.change(acqInputs[1], { target: { value: 'Estate Sale' } }); // location_acquired
    fireEvent.change(acqInputs[2], { target: { value: 'Jane Doe' } }); // seller_donator
    fireEvent.change(acqInputs[3], { target: { value: 'Private collection' } }); // provenance
    fireEvent.change(acqInputs[4], { target: { value: '100' } }); // acquisition_cost
    fireEvent.change(acqInputs[5], { target: { value: '250' } }); // appraised_value

    const researchSection = screen.getByText('Research').closest('section')!;
    fireEvent.change(researchSection.querySelector('input')!, { target: { value: 'Smithsonian' } }); // museums_comparable
    fireEvent.change(researchSection.querySelector('textarea')!, {
      target: { value: 'Needs more research' },
    });

    fireEvent.change(screen.getByPlaceholderText('AI-generated or written description...'), {
      target: { value: 'A hand-written description.' },
    });

    fireEvent.click(screen.getByText('Save Piece'));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/item/new-id'));
  });

  it('actually resizes an oversized photo before analyzing', async () => {
    class HugeImage {
      onload: (() => void) | null = null;
      width = 3000;
      height = 2000;
      private _src = '';
      set src(v: string) {
        this._src = v;
        queueMicrotask(() => this.onload?.());
      }
      get src() {
        return this._src;
      }
    }
    vi.stubGlobal('Image', HugeImage);
    vi.mocked(global.fetch).mockResolvedValue({
      json: () => Promise.resolve({ name: 'Resized OK' }),
    } as Response);

    render(<AddPage />);
    fireEvent.click(screen.getByText('Single Photo'));
    fireEvent.change(document.querySelector('input[type="file"]')!, {
      target: { files: [makeFile()] },
    });

    expect(await screen.findByText('Resized OK')).toBeInTheDocument();
  });

  it('does not surface suggestions when the API responds with an error field', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      json: () => Promise.resolve({ error: 'Analysis failed' }),
    } as Response);

    render(<AddPage />);
    fireEvent.click(screen.getByText('Single Photo'));
    fireEvent.change(document.querySelector('input[type="file"]')!, {
      target: { files: [makeFile()] },
    });

    await waitFor(() =>
      expect(screen.queryByText('Analyzing your piece with AI...')).not.toBeInTheDocument(),
    );
    expect(screen.queryByText('AI Suggestions')).not.toBeInTheDocument();
  });

  it('skips falsy suggestion values when applying all', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      json: () => Promise.resolve({ name: 'Has Value', condition: '' }),
    } as Response);

    render(<AddPage />);
    fireEvent.click(screen.getByText('Single Photo'));
    fireEvent.change(document.querySelector('input[type="file"]')!, {
      target: { files: [makeFile()] },
    });
    await screen.findByText('Has Value');

    fireEvent.click(screen.getByText('Apply All'));
    expect(screen.getByDisplayValue('Has Value')).toBeInTheDocument();
  });

  it('defaults the SKU counter to 0 when count comes back undefined', async () => {
    supabaseMock.queueResult({}); // count undefined
    supabaseMock.queueResult({ data: { id: 'sku-0' }, error: null });

    render(<AddPage />);
    fireEvent.click(screen.getByText('Single Photo'));
    fillRequiredFields();
    fireEvent.click(screen.getByText('Save Piece'));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/item/sku-0'));
  });

  it('surfaces a storage upload error without inserting the piece', async () => {
    supabaseMock.queueResult({ count: 4 });
    supabaseMock.queueResult({ error: { message: 'upload failed' } });

    render(<AddPage />);
    fireEvent.click(screen.getByText('Multiple Photos'));
    fireEvent.change(document.querySelector('input[type="file"]')!, {
      target: { files: [makeFile()] },
    });
    await waitFor(() => expect(document.querySelectorAll('img').length).toBeGreaterThan(0));
    fillRequiredFields();
    fireEvent.click(screen.getByText('Save Piece'));

    expect(await screen.findByText('upload failed')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('falls back to a generic error message when the insert error has no message', async () => {
    supabaseMock.queueResult({ count: 4 });
    supabaseMock.queueResult({ data: null, error: {} });

    render(<AddPage />);
    fireEvent.click(screen.getByText('Single Photo'));
    fillRequiredFields();
    fireEvent.click(screen.getByText('Save Piece'));

    expect(await screen.findByText('Something went wrong')).toBeInTheDocument();
  });

  it('uploads attached photos to storage before inserting the piece', async () => {
    vi.mocked(global.fetch).mockResolvedValue({ json: () => Promise.resolve({}) } as Response);
    supabaseMock.queueResult({ count: 4 }); // generateSKU
    supabaseMock.queueResult({ error: null }); // storage.upload
    supabaseMock.queueResult({ data: { publicUrl: 'https://cdn.example.com/p0005/1.jpg' } }); // getPublicUrl
    supabaseMock.queueResult({ data: { id: 'new-id' }, error: null }); // insert

    render(<AddPage />);
    fireEvent.click(screen.getByText('Multiple Photos'));
    fireEvent.change(document.querySelector('input[type="file"]')!, {
      target: { files: [makeFile()] },
    });
    await waitFor(() => expect(document.querySelectorAll('img').length).toBeGreaterThan(0));
    fillRequiredFields();
    fireEvent.click(screen.getByText('Save Piece'));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/item/new-id'));
    expect(supabaseMock.supabase.storage.from).toHaveBeenCalledWith('pottery-photos');
  });
});
