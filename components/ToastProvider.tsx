"use client";

import { useState, useEffect, createContext, useContext, useCallback } from 'react';

interface Toast {
  id: number;
  message: string;
  type: 'error' | 'success';
}

const ToastContext = createContext<{ showToast: (message: string, type?: 'error' | 'success') => void }>({
  showToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: 'error' | 'success' = 'error') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

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
    </ToastContext.Provider>
  );
}
