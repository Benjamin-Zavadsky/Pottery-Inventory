'use client';

import { useState } from 'react';
import { Icon } from './Icon';

// Thumbnails may be missing for legacy pieces — fall back to the full photo,
// then to a placeholder, so a broken URL never shows a broken-image glyph.
export function PieceImage({
  src,
  fallbackSrc,
  alt,
  className = '',
  eager,
}: {
  src?: string;
  fallbackSrc?: string;
  alt: string;
  className?: string;
  eager?: boolean;
}) {
  const [current, setCurrent] = useState(src || fallbackSrc);
  const [failed, setFailed] = useState(false);

  if (!current || failed) {
    return (
      <div className={`flex items-center justify-center bg-sunken text-faint ${className}`}>
        <Icon name="image" size={24} strokeWidth={1.5} />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={current}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() =>
        fallbackSrc && current !== fallbackSrc ? setCurrent(fallbackSrc) : setFailed(true)
      }
      className={className}
    />
  );
}
