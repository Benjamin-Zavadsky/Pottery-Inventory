import { vi } from 'vitest';

// jsdom implements neither image decoding nor canvas rendering. Photo-resize
// flows (add page, item detail page) need `new Image()` to fire `onload` and
// `canvas.toDataURL()` to return something — stub both so those flows run.
export function stubImageAndCanvas() {
  class FakeImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    width = 200;
    height = 100;
    private _src = '';
    set src(value: string) {
      this._src = value;
      queueMicrotask(() => this.onload?.());
    }
    get src() {
      return this._src;
    }
  }
  vi.stubGlobal('Image', FakeImage);

  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-object-url');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

  const fakeCtx = { drawImage: vi.fn() } as unknown as CanvasRenderingContext2D;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(fakeCtx);
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
    'data:image/jpeg;base64,ZmFrZQ==',
  );
}

export function makeFile(name = 'photo.jpg', type = 'image/jpeg'): File {
  return new File(['fake-bytes'], name, { type });
}
