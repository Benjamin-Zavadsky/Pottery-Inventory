// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, renderWithToast, screen, waitFor, within } from '../support/render';
import { createSupabaseMock } from '../support/supabaseMock';
import { makeFile, stubImageAndCanvas } from '../support/browser';
import { STORAGE, makeItem } from '../support/fixtures';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/add',
}));
vi.mock('@/lib/supabase', () => ({ createClient: vi.fn() }));

import { createClient } from '@/lib/supabase';
import AddPage from '@/app/(staff)/add/page';

const mock = createSupabaseMock();
vi.mocked(createClient).mockReturnValue(
  mock.supabase as unknown as ReturnType<typeof createClient>,
);

const DRAFT_KEY = 'pottery-intake-draft-v1';
const saved = makeItem({ id: 'new-id', sku: 'P0036', case_id: 'A' });

function queueUpload(name = 'a') {
  mock.queueResult({});
  mock.queueResult({ data: { publicUrl: `${STORAGE}/intake/x/${name}.jpg` } });
  mock.queueResult({});
  mock.queueResult({ data: { publicUrl: `${STORAGE}/intake/x/thumbs/${name}.jpg` } });
}

function stubAi(
  body: unknown = { name: 'AI jar', culture_id: 'maya', confidence: 'High' },
  status = 200,
) {
  const fetchMock = vi.fn(() => Promise.resolve(Response.json(body, { status })));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

async function addPhoto() {
  queueUpload();
  fireEvent.change(screen.getByLabelText('Choose photos'), { target: { files: [makeFile()] } });
  await screen.findByAltText('Photo 1');
  await waitFor(() => expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled());
}

const continueBtn = () => fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

beforeEach(() => {
  mock.reset();
  mock.setUser({ id: 'staff' });
  push.mockClear();
  window.localStorage.clear();
  stubImageAndCanvas();
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Add piece intake', () => {
  it('walks photos → AI → details → location → review and saves with "add next"', async () => {
    const fetchMock = stubAi();
    renderWithToast(<AddPage />);
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    await addPhoto();
    fireEvent.change(screen.getByLabelText('Context for the AI'), {
      target: { value: 'Found in Belize' },
    });
    continueBtn();

    expect(await screen.findByText('High confidence')).toBeInTheDocument();
    expect(
      JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string),
    ).toEqual({
      imageUrls: [`${STORAGE}/intake/x/a.jpg`],
      userContext: 'Found in Belize',
    });
    fireEvent.click(screen.getByRole('button', { name: /Apply all/ }));
    expect(screen.getByLabelText(/^Name/, { selector: 'input' })).toHaveValue('AI jar');
    fireEvent.change(screen.getByLabelText(/^Color/), { target: { value: 'Red' } });
    continueBtn();

    fireEvent.change(screen.getByLabelText(/^Display case/), { target: { value: 'A' } });
    fireEvent.change(screen.getByLabelText('Seller / donor'), { target: { value: 'Estate' } });
    continueBtn();

    const review = screen.getByRole('heading', { name: 'Review' }).parentElement as HTMLElement;
    expect(within(review).getByText('AI jar')).toBeInTheDocument();
    expect(within(review).getByText('Maya')).toBeInTheDocument();
    expect(within(review).getByText(/AI-suggested fields will be flagged/)).toBeInTheDocument();

    mock.queueResult({ data: saved });
    mock.queueResult({});
    mock.queueResult({});
    mock.queueResult({});
    fireEvent.click(screen.getByRole('button', { name: 'Save & add next' }));
    expect(await screen.findByText('Saved P0036')).toBeInTheDocument();

    const insert = mock.builders.find((b) => b.insert.mock.calls.length)!;
    expect(insert.insert.mock.calls[0][0]).toMatchObject({
      name: 'AI jar',
      culture_id: 'maya',
      region: 'Mesoamerica',
      color: 'Red',
      case_id: 'A',
      photos: [`${STORAGE}/intake/x/a.jpg`],
      thumbs: [`${STORAGE}/intake/x/thumbs/a.jpg`],
      status: 'Active',
    });
    expect(insert.insert.mock.calls[0][0]).not.toHaveProperty('sku');
    expect(insert.insert.mock.calls[0][0].ai_fields).toContain('name');
    expect(insert.insert.mock.calls[0][0].ai_fields).not.toContain('color');
    expect(mock.builders.find((b) => b.upsert.mock.calls.length)!.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ pottery_id: 'new-id', seller_donator: 'Estate' }),
    );

    expect(screen.queryByAltText('Photo 1')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /3\. Location/ }));
    expect(screen.getByLabelText(/^Display case/)).toHaveValue('A');
    expect(screen.getByLabelText('Seller / donor')).toHaveValue('Estate');
  });

  it('saves and opens the new piece; leaves a pending AI record when nothing was applied', async () => {
    stubAi({ name: 'AI jar' });
    renderWithToast(<AddPage />);
    await addPhoto();
    continueBtn();
    await screen.findByText('AI suggestions');
    fireEvent.change(screen.getByLabelText(/^Name/, { selector: 'input' }), {
      target: { value: 'My jar' },
    });
    continueBtn();
    continueBtn();
    mock.queueResult({ data: makeItem({ id: 'n', sku: 'P0040', case_id: null }) });
    mock.queueResult({});
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/item/P0040'));
    const insert = mock.builders.filter((b) => b.insert.mock.calls.length).at(-1)!;
    expect(insert.insert).toHaveBeenCalledWith(expect.objectContaining({ status: 'pending' }));
    expect(window.localStorage.getItem(DRAFT_KEY) ?? '').not.toContain('My jar');
  });

  it('lets staff save while the AI is still running and finishes it in the background', async () => {
    let resolveAi: (r: Response) => void = () => {};
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>((r) => (resolveAi = r))),
    );
    renderWithToast(<AddPage />);
    await addPhoto();
    continueBtn();
    expect(screen.getByText(/keep going/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/^Name/, { selector: 'input' }), {
      target: { value: 'Quick save' },
    });
    fireEvent.click(screen.getByRole('button', { name: /4\. Review/ }));
    expect(screen.getByText(/The AI is still running/)).toBeInTheDocument();
    mock.queueResult({ data: makeItem({ id: 'q', sku: 'P0041', case_id: null }) });
    fireEvent.click(screen.getByRole('button', { name: 'Save & add next' }));
    expect(await screen.findByText(/AI results will appear in Review/)).toBeInTheDocument();
    mock.queueResult({});
    resolveAi(Response.json({ name: 'Late result' }));
    await waitFor(() =>
      expect(
        mock.builders.find((b) => b.insert.mock.calls.some((c) => c[0].pottery_id === 'q')),
      ).toBeTruthy(),
    );
  });

  it('shows AI errors with a retry, and requires a name before saving', async () => {
    stubAi({ error: 'Rate limited' }, 429);
    renderWithToast(<AddPage />);
    await addPhoto();
    continueBtn();
    expect(await screen.findByText('AI analysis failed: Rate limited')).toBeInTheDocument();
    stubAi({ name: 'Second try' });
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Second try')).toBeInTheDocument();
    continueBtn();
    continueBtn();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Identification' })).toBeInTheDocument();
  });

  it('reports insert failures without leaving the form', async () => {
    renderWithToast(<AddPage />);
    fireEvent.click(screen.getByRole('button', { name: /2\. Details/ }));
    fireEvent.change(screen.getByLabelText(/^Name/, { selector: 'input' }), {
      target: { value: 'No photos' },
    });
    fireEvent.click(screen.getByRole('button', { name: /4\. Review/ }));
    expect(screen.getAllByText('Not set').length).toBeGreaterThan(0);
    mock.queueResult({ error: { message: 'duplicate key' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('duplicate key')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Edit Name' }));
    expect(screen.getByLabelText(/^Name/, { selector: 'input' })).toHaveValue('No photos');
  });

  it('reports follow-up failures after the piece exists', async () => {
    renderWithToast(<AddPage />);
    fireEvent.click(screen.getByRole('button', { name: /2\. Details/ }));
    fireEvent.change(screen.getByLabelText(/^Name/, { selector: 'input' }), {
      target: { value: 'Jar' },
    });
    fireEvent.click(screen.getByRole('button', { name: /3\. Location/ }));
    fireEvent.change(screen.getByLabelText(/^Display case/), { target: { value: 'A' } });
    fireEvent.change(screen.getByLabelText('Acquisition cost ($)'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    mock.queueResult({ data: saved });
    mock.queueResult({ error: { message: 'rls' } });
    mock.queueResult({ error: { message: 'fk' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(
      await screen.findByText('Saved P0036, but: private fields: rls; case history: fk'),
    ).toBeInTheDocument();
  });

  it('waits for uploads before saving', async () => {
    renderWithToast(<AddPage />);
    fireEvent.click(screen.getByRole('button', { name: /2\. Details/ }));
    fireEvent.change(screen.getByLabelText(/^Name/, { selector: 'input' }), {
      target: { value: 'Jar' },
    });
    fireEvent.click(screen.getByRole('button', { name: /1\. Photos/ }));
    queueUpload();
    fireEvent.change(screen.getByLabelText('Choose photos'), { target: { files: [makeFile()] } });
    expect(screen.getByRole('button', { name: 'Uploading…' })).toBeDisabled();
    await screen.findByAltText('Photo 1');
  });

  it('restores a saved draft and can run the analysis from Details', async () => {
    window.localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        folder: 'intake/old',
        step: 1,
        pairs: [
          { photo: `${STORAGE}/intake/old/a.jpg`, thumb: `${STORAGE}/intake/old/thumbs/a.jpg` },
        ],
        form: {
          ...JSON.parse(JSON.stringify({ name: 'Draft jar' })),
          culture_id: '',
          region: '',
          period_start_year: null,
          period_end_year: null,
          age: '',
          place_of_origin: '',
          tribe_culture: '',
          color: '',
          use_function: '',
          dimensions: '',
          condition: '',
          rarity: '',
          originality: '',
          case_id: '',
          date_acquired: '',
          location_acquired: '',
          provenance: '',
          museums_comparable: '',
          research_notes: '',
          description: '',
        },
        privateForm: {
          acquisition_cost: '',
          appraised_value: '',
          appraisal_date: '',
          appraiser_name: '',
          seller_donator: '',
        },
        aiFields: [],
        context: '',
        analysis: null,
        applied: [],
      }),
    );
    stubAi({ name: 'From draft' });
    renderWithToast(<AddPage />);
    expect(await screen.findByText('Restored your unsaved piece')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Name/, { selector: 'input' })).toHaveValue('Draft jar');
    fireEvent.click(screen.getByRole('button', { name: 'Analyze 1 photo with AI' }));
    expect(await screen.findByText('From draft')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByAltText('Photo 1')).toBeInTheDocument();
  });

  it('removes photos immediately and discards the whole draft', async () => {
    renderWithToast(<AddPage />);
    await addPhoto();
    mock.queueResult({});
    fireEvent.click(screen.getByRole('button', { name: 'Remove photo 1' }));
    expect(mock.bucket.remove).toHaveBeenCalledWith(['intake/x/a.jpg', 'intake/x/thumbs/a.jpg']);
    await addPhoto();
    const confirm = vi
      .spyOn(window, 'confirm')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(screen.getByAltText('Photo 1')).toBeInTheDocument();
    mock.queueResult({ error: { message: 'gone' } });
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
    await waitFor(() => expect(screen.queryByAltText('Photo 1')).not.toBeInTheDocument());
    expect(confirm).toHaveBeenCalledTimes(2);
  });

  it('allows jumping between steps freely', () => {
    renderWithToast(<AddPage />);
    fireEvent.click(screen.getByRole('button', { name: /3\. Location/ }));
    expect(screen.getByRole('heading', { name: 'Location & acquisition' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /3\. Location/ })).toHaveAttribute(
      'aria-current',
      'step',
    );
  });
});
