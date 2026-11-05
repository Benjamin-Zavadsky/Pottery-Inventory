'use client';

import { useState } from 'react';
import type { StoredPhoto } from '@/lib/photos';
import { Lightbox } from '@/components/ui/Lightbox';
import { Icon } from '@/components/ui/Icon';

export default function Gallery({ photos, alt }: { photos: StoredPhoto[]; alt: string }) {
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const current = photos[Math.min(active, photos.length - 1)];

  if (!current) {
    return (
      <div className="flex aspect-[4/5] items-center justify-center rounded-2xl bg-sunken text-sm text-faint">
        No photos yet
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open photo viewer"
        className="group relative aspect-[4/5] overflow-hidden rounded-2xl bg-sunken"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={current.photo}
          src={current.photo}
          alt={alt}
          className="h-full w-full object-contain animate-fade-in"
        />
        <span className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-xs text-white opacity-90 print:hidden">
          <Icon name="zoom" size={14} />
          View
        </span>
      </button>
      {photos.length > 1 && (
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 print:hidden">
          <div className="flex gap-2" style={{ width: 'max-content' }}>
            {photos.map((p, i) => (
              <button
                key={p.photo}
                type="button"
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === active}
                onClick={() => setActive(i)}
                className={`h-16 w-16 overflow-hidden rounded-xl border-2 transition-colors ${i === active ? 'border-ink' : 'border-transparent opacity-80 hover:opacity-100'}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.thumb} alt="" loading="lazy" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
      {open && (
        <Lightbox
          images={photos.map((p) => p.photo)}
          index={active}
          alt={alt}
          onClose={() => setOpen(false)}
          onIndexChange={setActive}
        />
      )}
    </div>
  );
}
