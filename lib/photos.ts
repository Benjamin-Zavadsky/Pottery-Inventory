import { PHOTO_BUCKET } from './constants';
import { resizeImage } from './images';
import type { Supabase } from './supabase';

export const DISPLAY_MAX = 2048;
export const THUMB_MAX = 480;

export type StoredPhoto = { photo: string; thumb: string };

const PUBLIC_MARKER = `/storage/v1/object/public/${PHOTO_BUCKET}/`;

export function storagePath(url: string): string | null {
  const i = url.indexOf(PUBLIC_MARKER);
  return i === -1 ? null : decodeURIComponent(url.slice(i + PUBLIC_MARKER.length));
}

async function put(supabase: Supabase, path: string, blob: Blob, upsert = false) {
  const bucket = supabase.storage.from(PHOTO_BUCKET);
  const { error } = await bucket.upload(path, blob, {
    contentType: 'image/jpeg',
    cacheControl: '31536000',
    upsert,
  });
  if (error) throw error;
  return bucket.getPublicUrl(path).data.publicUrl;
}

export async function uploadPhoto(
  supabase: Supabase,
  folder: string,
  file: Blob,
): Promise<StoredPhoto> {
  const [display, thumb] = await Promise.all([
    resizeImage(file, DISPLAY_MAX, 0.86),
    resizeImage(file, THUMB_MAX, 0.8),
  ]);
  const name = crypto.randomUUID();
  const photo = await put(supabase, `${folder}/${name}.jpg`, display);
  return { photo, thumb: await put(supabase, `${folder}/thumbs/${name}.jpg`, thumb) };
}

export async function createThumbFor(supabase: Supabase, photoUrl: string): Promise<string> {
  const path = storagePath(photoUrl);
  if (!path) throw new Error('Not a collection photo');
  const res = await fetch(photoUrl);
  if (!res.ok) throw new Error(`Failed to fetch photo (${res.status})`);
  const thumb = await resizeImage(await res.blob(), THUMB_MAX, 0.8);
  const slash = path.lastIndexOf('/');
  const base = path.slice(slash + 1).replace(/\.[^.]+$/, '');
  return put(supabase, `${path.slice(0, slash)}/thumbs/${base}.jpg`, thumb, true);
}

export async function removePhotos(supabase: Supabase, urls: string[]) {
  const paths = [...new Set(urls)].map(storagePath).filter((p): p is string => !!p);
  if (!paths.length) return;
  const { error } = await supabase.storage.from(PHOTO_BUCKET).remove(paths);
  if (error) throw error;
}

type WithPhotos = { photos: string[] | null; thumbs?: string[] | null };

export function photoPairs(item: WithPhotos): StoredPhoto[] {
  return (item.photos ?? []).map((photo, i) => ({ photo, thumb: item.thumbs?.[i] || photo }));
}

export function coverThumb(item: WithPhotos): string | undefined {
  return item.thumbs?.[0] || item.photos?.[0] || undefined;
}

export function needsThumbs(item: WithPhotos): boolean {
  return photoPairs(item).some((p) => p.thumb === p.photo);
}

export function splitPairs(pairs: StoredPhoto[]) {
  return { photos: pairs.map((p) => p.photo), thumbs: pairs.map((p) => p.thumb) };
}
