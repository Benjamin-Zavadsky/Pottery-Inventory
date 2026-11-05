'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Icon } from './Icon';

type Tone = 'success' | 'error' | 'info';
type ToastItem = { id: number; tone: Tone; message: string };

const ToastContext = createContext<(tone: Tone, message: string) => void>(() => {});

const TONE_CLASS: Record<Tone, string> = {
  success: 'bg-ink text-white',
  info: 'bg-ink text-white',
  error: 'bg-danger text-white',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (tone: Tone, message: string) => {
      const id = ++nextId.current;
      setToasts((list) => [...list.slice(-2), { id, tone, message }]);
      setTimeout(() => dismiss(id), tone === 'error' ? 7000 : 3500);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 z-[60] flex flex-col items-center gap-2 px-4 print:hidden"
        style={{ bottom: 'calc(84px + env(safe-area-inset-bottom, 0px))' }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex max-w-md items-start gap-3 rounded-2xl px-4 py-3 text-sm shadow-lg animate-rise ${TONE_CLASS[t.tone]}`}
          >
            <Icon
              name={t.tone === 'error' ? 'alert' : 'check'}
              size={16}
              className="mt-0.5 shrink-0"
            />
            <span className="flex-1">{t.message}</span>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => dismiss(t.id)}
              className="shrink-0 opacity-70 hover:opacity-100"
            >
              <Icon name="close" size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const show = useContext(ToastContext);
  return useMemo(
    () => ({
      success: (message: string) => show('success', message),
      error: (message: string) => show('error', message),
      info: (message: string) => show('info', message),
    }),
    [show],
  );
}
