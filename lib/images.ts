export function fitWithin(width: number, height: number, max: number) {
  if (width <= max && height <= max) return { width, height };
  return width >= height
    ? { width: max, height: Math.round((height / width) * max) }
    : { width: Math.round((width / height) * max), height: max };
}

// Re-encoding through a canvas also strips EXIF metadata, including GPS
// coordinates that would otherwise reveal where the collection is stored.
export function resizeImage(source: Blob, maxDim: number, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(source);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const { width, height } = fitWithin(img.width, img.height, maxDim);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas unavailable'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Image encoding failed'))),
        'image/jpeg',
        quality,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('This file could not be read as an image'));
    };
    img.src = url;
  });
}
