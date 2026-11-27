import { getAI, getGenerativeModel, GoogleAIBackend, InferenceMode } from 'firebase/ai';
import type { GenerativeModel } from 'firebase/ai';
import { getFirebaseApp } from '@/lib/firebaseClient';
import { ensureAppCheck } from './appCheck';
import { TASKS, type AITask } from './prompts';

export type AIEngine = 'on-device' | 'cloud';
export type AIRoute = 'light' | 'heavy';
export type AIMessage = { role: 'user' | 'model'; text: string };
export type AIEvent = { type: 'engine'; engine: AIEngine } | { type: 'text'; text: string };

export const MAX_INPUT_CHARS = 4000;
const HISTORY_LIMIT = 8;
const CLOUD_MODELS = Array.from(new Set([process.env.NEXT_PUBLIC_AI_CLOUD_MODEL, 'gemini-3-flash-preview', 'gemini-2.5-flash-lite', 'gemini-2.5-flash'].filter(Boolean))) as string[];
let modelIdx = 0; // moves to the next name when a model returns 404

const models: Record<string, GenerativeModel> = {};

function getModel(route: AIRoute): GenerativeModel {
  const k = route + ':' + modelIdx;
  const cached = models[k];
  if (cached) return cached;
  const app = getFirebaseApp();
  ensureAppCheck(app);
  const ai = getAI(app, { backend: new GoogleAIBackend() });
  const model = getGenerativeModel(ai, {
    // light work: on-device first (free, private); heavy work: cloud only.
    mode: route === 'light' ? InferenceMode.PREFER_ON_DEVICE : InferenceMode.ONLY_IN_CLOUD,
    inCloudParams: { model: CLOUD_MODELS[modelIdx] },
  });
  models[k] = model;
  return model;
}

// Chrome Prompt API check (desktop Chrome only). Used for the badge prediction.
export async function onDeviceReady(): Promise<boolean> {
  try {
    const LM = (globalThis as any).LanguageModel;
    if (!LM?.availability) return false;
    return (await LM.availability()) === 'available';
  } catch {
    return false;
  }
}

// On-device inference is single-turn, so history is flattened into one prompt.
function buildPrompt(system: string, messages: AIMessage[]) {
  const turns = messages
    .slice(-HISTORY_LIMIT)
    .map((m) => (m.role === 'user' ? 'User: ' : 'Assistant: ') + m.text.slice(0, MAX_INPUT_CHARS))
    .join('\n');
  return system + '\n\nConversation:\n' + turns + '\nAssistant:';
}

export async function* streamAI(req: {
  system: string;
  messages: AIMessage[];
  route?: AIRoute;
  signal?: AbortSignal;
}): AsyncGenerator<AIEvent> {
  const prompt = buildPrompt(req.system, req.messages);
  let route: AIRoute = req.route ?? 'light';
  let yielded = false;

  for (let attempt = 0; attempt < 5; attempt++) {
    const predicted: AIEngine = route === 'light' && (await onDeviceReady()) ? 'on-device' : 'cloud';
    yield { type: 'engine', engine: predicted };
    try {
      const result = await getModel(route).generateContentStream(prompt);
      for await (const chunk of result.stream) {
        if (req.signal?.aborted) return;
        const t = chunk.text();
        if (t) {
          yielded = true;
          yield { type: 'text', text: t };
        }
      }
      const src = String((await result.response as any).inferenceSource ?? '').toUpperCase();
      if (src) {
        const actual: AIEngine = src === 'ON_DEVICE' ? 'on-device' : 'cloud';
        if (actual !== predicted) yield { type: 'engine', engine: actual };
      }
      return;
    } catch (e) {
      if (!req.signal?.aborted && !yielded && /\[404|is not found|not found/i.test(String((e as any)?.message ?? e)) && modelIdx < CLOUD_MODELS.length - 1) {
        modelIdx++;
        continue;
      }
      // on-device path failed before any output: retry once in the cloud.
      if (req.signal?.aborted || yielded || route === 'heavy' || attempt === 4) throw e;
      route = 'heavy';
    }
  }
}

export async function runTask(
  task: AITask,
  input: string,
  o: {
    signal?: AbortSignal;
    onChunk?: (accumulated: string) => void;
    onEngine?: (e: AIEngine) => void;
  } = {},
) {
  const t = TASKS[task];
  let acc = '';
  for await (const ev of streamAI({
    system: t.system,
    messages: [{ role: 'user', text: input.slice(0, MAX_INPUT_CHARS) }],
    route: t.route,
    signal: o.signal,
  })) {
    if (ev.type === 'engine') o.onEngine?.(ev.engine);
    else {
      acc += ev.text;
      o.onChunk?.(acc);
    }
  }
  return acc.trim();
}

export function friendlyError(e: unknown) {
  console.error('[AI]', e);
  const raw = String((e as any)?.message ?? e);
  const m = raw.toLowerCase();
  const code = /\[(\d{3})/.exec(raw)?.[1] ?? /\((\d{3})\)/.exec(raw)?.[1];
  const tag = code ? ' (code ' + code + ')' : '';
  if (code === '401' || m.includes('app-check') || m.includes('appcheck') || m.includes('app check')) {
    const noKey = !process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY && !process.env.NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN;
    return noKey
      ? 'App Check key is missing in this build. Add NEXT_PUBLIC_RECAPTCHA_SITE_KEY to this Vercel environment and redeploy.' + tag
      : 'App Check rejected this site. Check the reCAPTCHA key, its allowed domains, and the App Check registration.' + tag;
  }
  if (code === '429' || m.includes('quota') || m.includes('resource_exhausted') || m.includes('too many requests'))
    return 'Usage limit reached. Please wait a moment and try again.' + tag;
  if (code === '403' || m.includes('permission') || m.includes('has not been used') || m.includes('blocked'))
    return 'AI is not enabled for this project yet. Check Firebase AI Logic and the API key restrictions.' + tag;
  if (code === '404' || m.includes('is not found') || m.includes('not supported'))
    return 'The AI model is not available. Check NEXT_PUBLIC_AI_CLOUD_MODEL.' + tag;
  if (m.includes('failed to fetch') || m.includes('network') || m.includes('offline'))
    return 'No internet connection. Cloud AI needs a connection.';
  return 'Something went wrong. Please try again.' + tag;
}
