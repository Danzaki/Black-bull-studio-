"use client";

import { useState, useEffect, useRef, createContext, useContext, useCallback } from 'react';
import { bus, type ConfirmOptions } from '@/lib/notify';

interface Toast {
  id: number;
  message: string;
  type: 'error' | 'success';
}

interface Pending extends ConfirmOptions {
  resolve: (v: boolean) => void;
}

const ToastContext = createContext<{ showToast: (message: string, type?: 'error' | 'success') => void }>({
  showToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pending, setPending] = useState<Pending | null>(null);
  const pendingRef = useRef<Pending | null>(null);

  const showToast = useCallback((message: string, type: 'error' | 'success' = 'error') => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, Math.min(8000, 2500 + message.length * 45));
  }, []);

  const closeConfirm = useCallback((value: boolean) => {
    const p = pendingRef.current;
    pendingRef.current = null;
    setPending(null);
    p?.resolve(value);
  }, []);

  useEffect(() => {
    bus.ready = true;
    const onToast = (e: Event) => {
      const d = (e as CustomEvent).detail ?? {};
      showToast(String(d.message ?? ''), d.type === 'success' ? 'success' : 'error');
    };
    const onConfirm = (e: Event) => {
      const d = (e as CustomEvent<Pending>).detail;
      pendingRef.current?.resolve(false);
      pendingRef.current = d;
      setPending(d);
    };
    window.addEventListener('bb-toast', onToast);
    window.addEventListener('bb-confirm', onConfirm);
    return () => {
      bus.ready = false;
      window.removeEventListener('bb-toast', onToast);
      window.removeEventListener('bb-confirm', onConfirm);
    };
  }, [showToast]);

  useEffect(() => {
    if (!pending) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeConfirm(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pending, closeConfirm]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-24 left-0 right-0 z-[200] flex flex-col items-center gap-2 px-4 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto max-w-sm rounded-full px-4 py-2.5 text-xs font-bold shadow-lg ${
              t.type === 'error' ? 'bg-rose-600 text-stone-900' : 'bg-emerald-600 text-stone-900'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>

      {pending && (
        <div
          className="fixed inset-0 z-[300] flex items-end justify-center bg-black/50"
          onClick={() => closeConfirm(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-t-2xl bg-bbl-bg p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] text-bbl-text"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-base font-bold">{pending.title}</p>
            {pending.message && <p className="mt-1 text-sm text-bbl-muted">{pending.message}</p>}
            <button
              type="button"
              onClick={() => closeConfirm(true)}
              className={`mt-4 h-12 w-full rounded-xl text-sm font-bold active:scale-[0.98] ${
                pending.danger ? 'bg-rose-600 text-white' : 'bg-bbl-accent text-white'
              }`}
            >
              {pending.confirmLabel ?? 'Confirm'}
            </button>
            <button
              type="button"
              onClick={() => closeConfirm(false)}
              className="mt-2 h-12 w-full rounded-xl text-sm font-semibold text-bbl-muted"
            >
              {pending.cancelLabel ?? 'Cancel'}
            </button>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}
