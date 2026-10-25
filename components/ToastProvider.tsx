"use client";

import { useState, useEffect, useRef, createContext, useContext, useCallback } from 'react';
import { bus, type ConfirmOptions, type MessageOptions } from '@/lib/notify';

interface Toast {
  id: number;
  message: string;
  type: 'error' | 'success';
}

interface Pending extends ConfirmOptions {
  resolve: (v: boolean) => void;
}

interface PendingMsg extends MessageOptions {
  resolve: () => void;
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
  const [msg, setMsg] = useState<PendingMsg | null>(null);
  const msgRef = useRef<PendingMsg | null>(null);
  const [copied, setCopied] = useState(false);

  const showToast = useCallback((message: string, type: 'error' | 'success' = 'error') => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, Math.min(8000, 2500 + message.length * 45));
  }, []);

  const closeMessage = useCallback(() => {
    const m = msgRef.current;
    msgRef.current = null;
    setMsg(null);
    setCopied(false);
    m?.resolve();
  }, []);

  const copyMsg = useCallback(async () => {
    const t = msgRef.current?.copyText;
    if (!t) return;
    try {
      await navigator.clipboard.writeText(t);
      setCopied(true);
    } catch {}
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
    const onMessage = (e: Event) => {
      const d = (e as CustomEvent<PendingMsg>).detail;
      msgRef.current?.resolve();
      msgRef.current = d;
      setCopied(false);
      setMsg(d);
    };
    window.addEventListener('bb-toast', onToast);
    window.addEventListener('bb-confirm', onConfirm);
    window.addEventListener('bb-message', onMessage);
    return () => {
      bus.ready = false;
      window.removeEventListener('bb-toast', onToast);
      window.removeEventListener('bb-confirm', onConfirm);
      window.removeEventListener('bb-message', onMessage);
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
      {msg && (
        <div className="fixed inset-0 z-[310] flex items-end justify-center bg-black/60">
          <div
            role="alertdialog"
            aria-modal="true"
            className="w-full max-w-md rounded-t-2xl bg-bbl-bg p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] text-bbl-text"
          >
            <p className="text-base font-bold">{msg.title}</p>
            {msg.message && <p className="mt-1 whitespace-pre-wrap text-sm text-bbl-muted">{msg.message}</p>}
            {msg.copyText && (
              <div className="mt-3 rounded-xl border border-bbl-border p-3">
                <p className="break-all font-mono text-[11px] text-bbl-text">{msg.copyText}</p>
                <button
                  type="button"
                  onClick={() => void copyMsg()}
                  className="mt-2 h-9 rounded-lg border border-bbl-border px-3 text-xs font-bold active:scale-95"
                >
                  {copied ? 'Copied' : (msg.copyLabel ?? 'Copy')}
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={closeMessage}
              className="mt-4 h-12 w-full rounded-xl bg-bbl-accent text-sm font-bold text-white active:scale-[0.98]"
            >
              {msg.okLabel ?? 'OK'}
            </button>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}
