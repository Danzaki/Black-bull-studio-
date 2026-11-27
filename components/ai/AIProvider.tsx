'use client';

import {
  createContext, useCallback, useContext, useMemo, useRef, useState, useSyncExternalStore, type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import { streamAI, friendlyError, MAX_INPUT_CHARS, type AIEngine, type AIRoute } from '@/lib/ai/engine';
import { buildChatSystem } from '@/lib/ai/prompts';
import { getAIContext, subscribeAIContext } from '@/lib/ai/contextStore';

export type ChatMsg = { id: string; role: 'user' | 'model'; text: string; error?: boolean };

type Ctx = {
  open: boolean;
  setOpen: (v: boolean) => void;
  messages: ChatMsg[];
  engine: AIEngine | null;
  busy: boolean;
  path: string;
  mint: string | null;
  hasContext: boolean;
  send: (text: string, opts?: { route?: AIRoute }) => Promise<void>;
  stop: () => void;
  clear: () => void;
};

const AICtx = createContext<Ctx | null>(null);
export const useAI = () => {
  const c = useContext(AICtx);
  if (!c) throw new Error('useAI must be used inside AIProvider');
  return c;
};

const uid = () => Math.random().toString(36).slice(2, 10);

export function AIProvider({ children }: { children: ReactNode }) {
  const path = usePathname() || '/';
  const context = useSyncExternalStore(subscribeAIContext, getAIContext, () => null);
  const mint = useMemo(() => path.match(/^\/terminal\/token\/([^/?#]+)/)?.[1] ?? null, [path]);

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [engine, setEngine] = useState<AIEngine | null>(null);
  const [busy, setBusy] = useState(false);

  const busyRef = useRef(false);
  const lastRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const msgsRef = useRef<ChatMsg[]>([]);
  msgsRef.current = messages;

  const send = useCallback(
    async (text: string, opts?: { route?: AIRoute }) => {
      const clean = text.trim().slice(0, MAX_INPUT_CHARS);
      if (!clean || busyRef.current) return;
      const now = Date.now();
      if (now - lastRef.current < 1500) return; // client-side throttle
      lastRef.current = now;

      busyRef.current = true;
      setBusy(true);
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      const userMsg: ChatMsg = { id: uid(), role: 'user', text: clean };
      const botId = uid();
      const history = [...msgsRef.current.filter((m) => !m.error), userMsg];
      setMessages([...msgsRef.current, userMsg, { id: botId, role: 'model', text: '' }]);

      try {
        const stream = streamAI({
          system: buildChatSystem({ path, context }),
          messages: history.map((m) => ({ role: m.role, text: m.text })),
          route: opts?.route ?? (clean.length > 600 ? 'heavy' : 'light'),
          signal: ctrl.signal,
        });
        for await (const ev of stream) {
          if (ev.type === 'engine') setEngine(ev.engine);
          else setMessages((p) => p.map((m) => (m.id === botId ? { ...m, text: m.text + ev.text } : m)));
        }
      } catch (e) {
        if (!ctrl.signal.aborted) {
          setMessages((p) => p.map((m) => (m.id === botId ? { ...m, text: friendlyError(e), error: true } : m)));
        }
      } finally {
        busyRef.current = false;
        setBusy(false);
        abortRef.current = null;
      }
    },
    [path, context],
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);
  const clear = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
  }, []);

  const value = useMemo<Ctx>(
    () => ({ open, setOpen, messages, engine, busy, path, mint, hasContext: !!context, send, stop, clear }),
    [open, messages, engine, busy, path, mint, context, send, stop, clear],
  );

  return <AICtx.Provider value={value}>{children}</AICtx.Provider>;
}
