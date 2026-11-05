import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fitWithin, resizeImage } from '@/lib/images';
import {
  coverThumb,
  createThumbFor,
  needsThumbs,
  photoPairs,
  removePhotos,
  splitPairs,
  storagePath,
  uploadPhoto,
} from '@/lib/photos';
import { createSupabaseMock } from '../support/supabaseMock';
import { makeFile, stubImageAndCanvas } from '../support/browser';
import { STORAGE } from '../support/fixtures';
import type { Supabase } from '@/lib/supabase';

const mock = createSupabaseMock();
const supabase = mock.supabase as unknown as Supabase;

beforeEach(() => {
  mock.reset();
  stubImageAndCanvas();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('fitWithin', () => {
  it('keeps small images and scales the longest edge down', () => {
    expect(fitWithin(100, 50, 200)).toEqual({ width: 100, height: 50 });
    expect(fitWithin(4000, 3000, 2048)).toEqual({ width: 2048, height: 1536 });
    expect(fitWithin(3000, 4000, 2048)).toEqual({ width: 1536, height: 2048 });
  });
});

describe('resizeImage', () => {
  it('re-encodes to a JPEG blob', async () => {
    const blob = await resizeImage(makeFile(), 100);
    expect(blob.type).toBe('image/jpeg');
  });

  it('rejects when the canvas has no 2D context', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    await expect(resizeImage(makeFile(), 100)).rejects.toThrow('Canvas unavailable');
  });

  it('rejects when encoding produces nothing', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb) => cb(null));
    await expect(resizeImage(makeFile(), 100)).rejects.toThrow('Image encoding failed');
  });

  it('rejects files that are not images', async () => {
    class BrokenImage {
      onerror: (() => void) | null = null;
      onload: (() => void) | null = null;
      set src(_v: string) {
        queueMicrotask(() => this.onerror?.());
      }
    }
    vi.stubGlobal('Image', BrokenImage);
    await expect(resizeImage(makeFile(), 100)).rejects.toThrow(/could not be read/);
  });
});

describe('photo storage helpers', () => {
  it('uploads a display image and a thumbnail', async () => {
    mock.queueResult({});
    mock.queueResult({ data: { publicUrl: `${STORAGE}/f/x.jpg` } });
    mock.queueResult({});
    mock.queueResult({ data: { publicUrl: `${STORAGE}/f/thumbs/x.jpg` } });
    const pair = await uploadPhoto(supabase, 'f', makeFile());
    expect(pair).toEqual({ photo: `${STORAGE}/f/x.jpg`, thumb: `${STORAGE}/f/thumbs/x.jpg` });
    const bucket = mock.bucket;
    expect(bucket.upload).toHaveBeenCalledTimes(2);
  });

  it('surfaces upload errors', async () => {
    mock.queueResult({ error: { message: 'quota exceeded' } });
    await expect(uploadPhoto(supabase, 'f', makeFile())).rejects.toEqual({
      message: 'quota exceeded',
    });
  });

  it('creates a thumbnail next to an existing photo', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(new Blob(['x']), { status: 200 }))),
    );
    mock.queueResult({});
    mock.queueResult({ data: { publicUrl: `${STORAGE}/P1/thumbs/a.jpg` } });
    expect(await createThumbFor(supabase, `${STORAGE}/P1/a.png`)).toBe(
      `${STORAGE}/P1/thumbs/a.jpg`,
    );
    const bucket = mock.bucket;
    expect(bucket.upload).toHaveBeenCalledWith('P1/thumbs/a.jpg', expect.any(Blob), {
      contentType: 'image/jpeg',
      cacheControl: '31536000',
      upsert: true,
    });
  });

  it('refuses foreign URLs and failed downloads', async () => {
    await expect(createThumbFor(supabase, 'https://evil.example/x.jpg')).rejects.toThrow(
      'Not a collection photo',
    );
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('', { status: 404 }))),
    );
    await expect(createThumbFor(supabase, `${STORAGE}/P1/a.jpg`)).rejects.toThrow('404');
  });

  it('removes storage objects by path, skipping foreign URLs', async () => {
    await removePhotos(supabase, ['https://elsewhere/x.jpg']);
    const bucket = mock.bucket;
    expect(bucket.remove).not.toHaveBeenCalled();
    mock.queueResult({});
    await removePhotos(supabase, [`${STORAGE}/P1/a.jpg`, `${STORAGE}/P1/a.jpg`]);
    expect(bucket.remove).toHaveBeenCalledWith(['P1/a.jpg']);
    mock.queueResult({ error: { message: 'denied' } });
    await expect(removePhotos(supabase, [`${STORAGE}/P1/b.jpg`])).rejects.toEqual({
      message: 'denied',
    });
  });

  it('pairs photos with thumbnails and detects missing ones', () => {
    const legacy = { photos: ['p1', 'p2'], thumbs: [] };
    expect(photoPairs(legacy)).toEqual([
      { photo: 'p1', thumb: 'p1' },
      { photo: 'p2', thumb: 'p2' },
    ]);
    expect(needsThumbs(legacy)).toBe(true);
    expect(needsThumbs({ photos: ['p1'], thumbs: ['t1'] })).toBe(false);
    expect(photoPairs({ photos: null })).toEqual([]);
    expect(coverThumb({ photos: ['p1'], thumbs: ['t1'] })).toBe('t1');
    expect(coverThumb({ photos: ['p1'] })).toBe('p1');
    expect(coverThumb({ photos: [] })).toBeUndefined();
    expect(splitPairs([{ photo: 'p', thumb: 't' }])).toEqual({ photos: ['p'], thumbs: ['t'] });
    expect(storagePath(`${STORAGE}/a%20b.jpg`)).toBe('a b.jpg');
  });
});
