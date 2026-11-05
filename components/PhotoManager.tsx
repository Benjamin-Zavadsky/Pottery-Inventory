'use client';

import { useEffect, useState } from 'react';
import { MAX_PHOTOS } from '@/lib/constants';
import { errorMessage } from '@/lib/errors';
import { uploadPhoto, type StoredPhoto } from '@/lib/photos';
import type { Supabase } from '@/lib/supabase';
import { Icon, Spinner } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';

export default function PhotoManager({
  pairs,
  setPairs,
  folder,
  supabase,
  onBusyChange,
  onRemove,
}: {
  pairs: StoredPhoto[];
  setPairs: React.Dispatch<React.SetStateAction<StoredPhoto[]>>;
  folder: string;
  supabase: Supabase;
  onBusyChange?: (busy: boolean) => void;
  onRemove?: (pair: StoredPhoto) => void;
}) {
  const toast = useToast();
  const [uploading, setUploading] = useState(0);

  useEffect(() => {
    onBusyChange?.(uploading > 0);
  }, [uploading, onBusyChange]);

  async function addFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    const room = MAX_PHOTOS - pairs.length - uploading;
    const batch = files.slice(0, Math.max(room, 0));
    if (files.length > batch.length) toast.info(`Up to ${MAX_PHOTOS} photos per piece`);
    setUploading((n) => n + batch.length);
    // Sequential uploads keep peak memory low on phones.
    for (const file of batch) {
      try {
        const pair = await uploadPhoto(supabase, folder, file);
        setPairs((prev) => [...prev, pair]);
      } catch (err) {
        toast.error(`Photo upload failed: ${errorMessage(err)}`);
      } finally {
        setUploading((n) => n - 1);
      }
    }
  }

  function move(index: number, to: number) {
    setPairs((prev) => {
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  function remove(index: number) {
    onRemove?.(pairs[index]);
    setPairs((prev) => prev.filter((_, i) => i !== index));
  }

  const full = pairs.length + uploading >= MAX_PHOTOS;

  return (
    <div>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {pairs.map((pair, i) => (
          <li
            key={pair.photo}
            className="group relative aspect-square overflow-hidden rounded-xl border border-line bg-sunken animate-fade-in"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pair.thumb} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
            {i === 0 && (
              <span className="absolute left-1.5 top-1.5 rounded-full bg-ink/80 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white">
                Cover
              </span>
            )}
            <button
              type="button"
              aria-label={`Remove photo ${i + 1}`}
              onClick={() => remove(i)}
              className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-danger"
            >
              <Icon name="close" size={12} strokeWidth={2.5} />
            </button>
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-black/60 to-transparent p-1.5">
              <button
                type="button"
                aria-label={`Move photo ${i + 1} earlier`}
                disabled={i === 0}
                onClick={() => move(i, i - 1)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-white disabled:opacity-30"
              >
                <Icon name="chevron-left" size={14} strokeWidth={2.5} />
              </button>
              {i > 0 && (
                <button
                  type="button"
                  aria-label={`Make photo ${i + 1} the cover`}
                  onClick={() => move(i, 0)}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-white"
                >
                  <Icon name="star" size={14} />
                </button>
              )}
              <button
                type="button"
                aria-label={`Move photo ${i + 1} later`}
                disabled={i === pairs.length - 1}
                onClick={() => move(i, i + 1)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-white disabled:opacity-30"
              >
                <Icon name="chevron-right" size={14} strokeWidth={2.5} />
              </button>
            </div>
          </li>
        ))}
        {Array.from({ length: uploading }, (_, i) => (
          <li
            key={`uploading-${i}`}
            className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-line-strong bg-sunken text-muted"
          >
            <Spinner />
            <span className="sr-only">Uploading photo</span>
          </li>
        ))}
      </ul>

      {!full && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-ink px-3 py-3 text-sm font-medium text-white active:scale-[0.98]">
            <Icon name="camera" size={16} />
            Take photo
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={addFiles}
              className="sr-only"
            />
          </label>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-line bg-surface px-3 py-3 text-sm font-medium active:scale-[0.98]">
            <Icon name="image" size={16} />
            Choose photos
            <input type="file" accept="image/*" multiple onChange={addFiles} className="sr-only" />
          </label>
        </div>
      )}
      <p className="mt-2 text-xs text-faint">
        {pairs.length} of {MAX_PHOTOS} photos · first photo is the cover · location data is stripped
        on upload
      </p>
    </div>
  );
}
