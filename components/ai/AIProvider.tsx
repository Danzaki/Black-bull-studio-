'use client';

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import { streamAI, friendlyError, MAX_INPUT_CHARS, type AIEngine, type AIRoute } from '@/lib/ai/engine';
import { buildChatSystem } from '@/lib/ai/chatSystem';
import { getAIContext, subscribeAIContext } from '@/lib/ai/contextStore';

export type ChatMsg = { id: string; role: 'user' | 'model'; text: string; error?: boolean; engine?: AIEngine; ts: number };
export type Thread = { id: string; title: string; updatedAt: number; messages: ChatMsg[] };

const STORE = 'bb_ai_threads_v1';
const MAX_THREADS = 20;
const MAX_MSGS = 60;

type Ctx = {
  open: boolean;
  setOpen: (v: boolean) => void;
  threads: Thread[];
  activeId: string | null;
  messages: ChatMsg[];
  engine: AIEngine | null;
  busy: boolean;
  mint: string | null;
  hasContext: boolean;
  send: (text: string, opts?: { route?: AIRoute }) => Promise<void>;
  regenerate: () => Promise<void>;
  stop: () => void;
  newThread: () => void;
  selectThread: (id: string) => void;
  deleteThread: (id: string) => void;
  clearAll: () => void;
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
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [engine, setEngine] = useState<AIEngine | null>(null);
  const [busy, setBusy] = useState(false);

  const threadsRef = useRef<Thread[]>([]);
  const activeRef = useRef<string | null>(null);
  const busyRef = useRef(false);
  const lastRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const commit = useCallback((n: Thread[]) => {
    threadsRef.current = n;
    setThreads(n);
  }, []);
  const setActive = useCallback((id: string | null) => {
    activeRef.current = id;
    setActiveId(id);
  }, []);
  const patch = useCallback(
    (id: string, fn: (m: ChatMsg[]) => ChatMsg[]) => {
      commit(threadsRef.current.map((t) => (t.id === id ? { ...t, messages: fn(t.messages), updatedAt: Date.now() } : t)));
    },
    [commit],
  );

  // load / save history (device only)
  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem(STORE) || '[]');
      if (Array.isArray(d)) {
        const t = d.filter((x) => x && typeof x.id === 'string' && Array.isArray(x.messages)).slice(0, MAX_THREADS);
        commit(t);
        if (t[0]) setActive(t[0].id);
      }
    } catch {}
  }, [commit, setActive]);
  useEffect(() => {
    if (busy) return;
    try {
      localStorage.setItem(STORE, JSON.stringify(threads));
    } catch {}
  }, [threads, busy]);

  const run = useCallback(
    async (id: string, opts?: { route?: AIRoute }) => {
      const th = threadsRef.current.find((t) => t.id === id);
      if (!th) return;
      busyRef.current = true;
      setBusy(true);
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      const botId = uid();
      const history = th.messages.filter((m) => !m.error).map((m) => ({ role: m.role, text: m.text }));
      const last = history[history.length - 1]?.text ?? '';
      patch(id, (m) => [...m, { id: botId, role: 'model', text: '', ts: Date.now() }]);
      try {
        const stream = streamAI({
          system: buildChatSystem({ path, context }),
          messages: history,
          route: opts?.route ?? (context || mint || last.length > 600 ? 'heavy' : 'light'),
          signal: ctrl.signal,
        });
        for await (const ev of stream) {
          if (ev.type === 'engine') {
            setEngine(ev.engine);
            patch(id, (m) => m.map((x) => (x.id === botId ? { ...x, engine: ev.engine } : x)));
          } else {
            patch(id, (m) => m.map((x) => (x.id === botId ? { ...x, text: x.text + ev.text } : x)));
          }
        }
      } catch (e) {
        if (!ctrl.signal.aborted) {
          patch(id, (m) => m.map((x) => (x.id === botId ? { ...x, text: friendlyError(e), error: true } : x)));
        }
      } finally {
        busyRef.current = false;
        setBusy(false);
        abortRef.current = null;
      }
    },
    [path, context, mint, patch],
  );

  const send = useCallback(
    async (text: string, opts?: { route?: AIRoute }) => {
      const clean = text.trim().slice(0, MAX_INPUT_CHARS);
      if (!clean || busyRef.current) return;
      const now = Date.now();
      if (now - lastRef.current < 1200) return;
      lastRef.current = now;
      let id = activeRef.current;
      if (!id || !threadsRef.current.some((t) => t.id === id)) {
        id = uid();
        commit([{ id, title: clean.slice(0, 40), updatedAt: now, messages: [] }, ...threadsRef.current].slice(0, MAX_THREADS));
        setActive(id);
      }
      patch(id, (m) => [...m.slice(-MAX_MSGS), { id: uid(), role: 'user', text: clean, ts: now }]);
      await run(id, opts);
    },
    [commit, setActive, patch, run],
  );

  const regenerate = useCallback(async () => {
    const id = activeRef.current;
    if (!id || busyRef.current) return;
    const th = threadsRef.current.find((t) => t.id === id);
    if (!th) return;
    const msgs = [...th.messages];
    while (msgs.length && msgs[msgs.length - 1].role === 'model') msgs.pop();
    if (!msgs.length) return;
    commit(threadsRef.current.map((t) => (t.id === id ? { ...t, messages: msgs } : t)));
    await run(id);
  }, [commit, run]);

  const stop = useCallback(() => abortRef.current?.abort(), []);
  const newThread = useCallback(() => {
    abortRef.current?.abort();
    setActive(null);
  }, [setActive]);
  const selectThread = useCallback((id: string) => setActive(id), [setActive]);
  const deleteThread = useCallback(
    (id: string) => {
      commit(threadsRef.current.filter((t) => t.id !== id));
      if (activeRef.current === id) setActive(null);
    },
    [commit, setActive],
  );
  const clearAll = useCallback(() => {
    abortRef.current?.abort();
    commit([]);
    setActive(null);
  }, [commit, setActive]);

  // Ctrl/Cmd + I toggles; any component can open it with a custom event.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const onOpen = (e: Event) => {
      setOpen(true);
      const p = (e as CustomEvent).detail?.prompt;
      if (typeof p === 'string' && p.trim()) void send(p);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('bb:ai-open', onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('bb:ai-open', onOpen);
    };
  }, [send]);

  const messages = useMemo(() => threads.find((t) => t.id === activeId)?.messages ?? [], [threads, activeId]);

  const value = useMemo<Ctx>(
    () => ({
      open, setOpen, threads, activeId, messages, engine, busy, mint, hasContext: !!context,
      send, regenerate, stop, newThread, selectThread, deleteThread, clearAll,
    }),
    [open, threads, activeId, messages, engine, busy, mint, context, send, regenerate, stop, newThread, selectThread, deleteThread, clearAll],
  );

  return <AICtx.Provider value={value}>{children}</AICtx.Provider>;
}
