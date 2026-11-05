import { describe, it, expect } from 'vitest';
import {
  EMPTY_FORM,
  EMPTY_PRIVATE,
  applySuggestion,
  formFromItem,
  formToRow,
  hasPrivateValues,
  privateFromRow,
  privateToRow,
  validateForm,
} from '@/lib/pieceForm';
import { classificationFor, dashboardStats } from '@/lib/maintenance';
import { makeItem } from '../support/fixtures';

describe('piece form model', () => {
  it('round-trips an item through the form', () => {
    const item = makeItem({ case_id: 'A', description: 'Text' });
    const form = formFromItem(item);
    expect(form.period_start_year).toBe(1050);
    expect(form.dimensions).toBe('');
    const row = formToRow(form);
    expect(row).toMatchObject({
      name: item.name,
      culture_id: 'mississippian',
      region: 'North America',
      case_id: 'A',
      description: 'Text',
      dimensions: null,
    });
  });

  it('drops invalid constrained values and derives region from culture', () => {
    const row = formToRow({
      ...EMPTY_FORM,
      name: '  Jar ',
      culture_id: 'moche',
      condition: 'Perfect',
      case_id: 'Z',
      region: 'Atlantis',
      date_acquired: '',
    });
    expect(row).toMatchObject({
      name: 'Jar',
      region: 'South America',
      condition: null,
      case_id: null,
      date_acquired: null,
    });
    expect(formToRow({ ...EMPTY_FORM, culture_id: 'nope' }).culture_id).toBeNull();
    expect(formToRow({ ...EMPTY_FORM, region: 'Europe' }).region).toBe('Europe');
  });

  it('validates name and period order', () => {
    expect(validateForm(EMPTY_FORM)).toBe('Name is required');
    expect(
      validateForm({ ...EMPTY_FORM, name: 'x', period_start_year: 10, period_end_year: 5 }),
    ).toMatch(/before/);
    expect(validateForm({ ...EMPTY_FORM, name: 'x' })).toBeNull();
  });

  it('applies suggestions, filling region from culture only when empty', () => {
    expect(applySuggestion(EMPTY_FORM, 'culture_id', 'maya').region).toBe('Mesoamerica');
    expect(applySuggestion({ ...EMPTY_FORM, region: 'Europe' }, 'culture_id', 'maya').region).toBe(
      'Europe',
    );
    expect(applySuggestion(EMPTY_FORM, 'culture_id', 'nope').region).toBe('');
    expect(applySuggestion(EMPTY_FORM, 'name', 'Jar').name).toBe('Jar');
  });

  it('maps private fields both ways', () => {
    expect(privateFromRow(null)).toEqual(EMPTY_PRIVATE);
    const form = privateFromRow({
      pottery_id: 'p',
      acquisition_cost: 12.5,
      appraised_value: null,
      appraisal_date: '2024-01-02',
      appraiser_name: 'A',
      seller_donator: null,
    });
    expect(form.acquisition_cost).toBe('12.5');
    expect(hasPrivateValues(form)).toBe(true);
    expect(hasPrivateValues(EMPTY_PRIVATE)).toBe(false);
    expect(
      privateToRow('p', {
        ...EMPTY_PRIVATE,
        acquisition_cost: '10.005',
        appraised_value: '-1',
        seller_donator: ' Bob ',
      }),
    ).toEqual({
      pottery_id: 'p',
      acquisition_cost: 10.01,
      appraised_value: null,
      appraisal_date: null,
      appraiser_name: null,
      seller_donator: 'Bob',
    });
  });
});

describe('maintenance', () => {
  const row = (o: Partial<ReturnType<typeof makeItem>>) => ({ ...makeItem(), ...o });

  it('classifies legacy free-text records without overwriting', () => {
    expect(
      classificationFor(
        row({
          culture_id: null,
          region: null,
          tribe_culture: 'Classic Maya',
          period_start_year: null,
          period_end_year: null,
          age: '600–900 CE',
        }),
      ),
    ).toEqual({
      culture_id: 'maya',
      region: 'Mesoamerica',
      period_start_year: 600,
      period_end_year: 900,
    });
    expect(
      classificationFor(
        row({
          culture_id: null,
          tribe_culture: null,
          place_of_origin: 'Peru',
          name: 'Moche portrait vessel',
        }),
      ),
    ).toEqual({ culture_id: 'moche' });
    expect(classificationFor(row({ region: null }))).toEqual({ region: 'North America' });
    expect(classificationFor(row({ culture_id: 'gone', region: null }))).toEqual({ region: null });
    expect(classificationFor(row({}))).toBeNull();
    expect(
      classificationFor(
        row({
          culture_id: null,
          tribe_culture: 'x',
          place_of_origin: null,
          name: 'y',
          period_start_year: null,
          period_end_year: null,
          age: null,
        }),
      ),
    ).toBeNull();
  });

  it('computes dashboard stats', () => {
    const stats = dashboardStats([
      row({ ai_fields: ['name'], case_id: null, photos: [], thumbs: [], provenance: null }),
      row({
        id: '2',
        case_id: 'A',
        dimensions: '5in',
        culture_id: null,
        tribe_culture: 'Maya',
        period_start_year: null,
        period_end_year: null,
      }),
    ]);
    expect(stats).toMatchObject({
      total: 2,
      flagged: 1,
      unassigned: 1,
      unclassified: 1,
      undated: 1,
      noPhotos: 1,
      noDimensions: 1,
      noProvenance: 2,
      needThumbs: 0,
      classifiable: 1,
    });
  });
});
