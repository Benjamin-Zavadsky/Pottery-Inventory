'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';

export function Lightbox({
  images,
  index,
  alt,
  onClose,
  onIndexChange,
}: {
  images: string[];
  index: number;
  alt: string;
  onClose: () => void;
  onIndexChange: (i: number) => void;
}) {
  const [zoomed, setZoomed] = useState(false);
  const touchX = useRef<number | null>(null);
  const count = images.length;

  useEffect(() => {
    const go = (delta: number) => {
      setZoomed(false);
      onIndexChange((index + delta + count) % count);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, count, onClose, onIndexChange]);

  function step(delta: number) {
    setZoomed(false);
    onIndexChange((index + delta + count) % count);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      className="fixed inset-0 z-[70] flex flex-col bg-black/95 text-white animate-fade-in"
    >
      <div className="flex items-center justify-between px-4 py-3 pt-safe">
        <span className="text-sm tabular-nums text-white/70">
          {index + 1} / {count}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            aria-label={zoomed ? 'Fit to screen' : 'Zoom to full size'}
            aria-pressed={zoomed}
            onClick={() => setZoomed((z) => !z)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
          >
            <Icon name="zoom" />
          </button>
          <button
            type="button"
            aria-label="Close photo viewer"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
          >
            <Icon name="close" />
          </button>
        </div>
      </div>

      <div
        className={`relative flex-1 ${zoomed ? 'overflow-auto' : 'flex items-center justify-center overflow-hidden'}`}
        onTouchStart={(e) => {
          touchX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (zoomed || touchX.current == null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
          touchX.current = null;
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[index]}
          alt={`${alt} — photo ${index + 1} of ${count}`}
          onClick={() => setZoomed((z) => !z)}
          className={
            zoomed
              ? 'max-w-none cursor-zoom-out'
              : 'max-h-full max-w-full cursor-zoom-in object-contain'
          }
        />
      </div>

      {count > 1 && (
        <div className="flex items-center justify-center gap-6 py-4 pb-safe">
          <button
            type="button"
            aria-label="Previous photo"
            onClick={() => step(-1)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
          >
            <Icon name="chevron-left" />
          </button>
          <button
            type="button"
            aria-label="Next photo"
            onClick={() => step(1)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
          >
            <Icon name="chevron-right" />
          </button>
        </div>
      )}
    </div>
  );
}
