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
const CLOUD_MODEL = process.env.NEXT_PUBLIC_AI_CLOUD_MODEL || 'gemini-2.5-flash';

const models: Partial<Record<AIRoute, GenerativeModel>> = {};

function getModel(route: AIRoute): GenerativeModel {
  const cached = models[route];
  if (cached) return cached;
  const app = getFirebaseApp();
  ensureAppCheck(app);
  const ai = getAI(app, { backend: new GoogleAIBackend() });
  const model = getGenerativeModel(ai, {
    // light work: on-device first (free, private); heavy work: cloud only.
    mode: route === 'light' ? InferenceMode.PREFER_ON_DEVICE : InferenceMode.ONLY_IN_CLOUD,
    inCloudParams: { model: CLOUD_MODEL },
  });
  models[route] = model;
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

  for (let attempt = 0; attempt < 2; attempt++) {
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
      // on-device path failed before any output: retry once in the cloud.
      if (req.signal?.aborted || yielded || route === 'heavy' || attempt === 1) throw e;
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
  const m = String((e as any)?.message ?? e).toLowerCase();
  if (m.includes('app-check') || m.includes('appcheck')) return 'Tsaro (App Check) ya ki amincewa. Sake lodin shafi ko a duba saitin.';
  if (m.includes('429') || m.includes('quota') || m.includes('rate')) return 'An yi kira da yawa. Jira dan lokaci a sake gwadawa.';
  if (m.includes('network') || m.includes('fetch') || m.includes('offline')) return 'Babu internet. Cloud AI yana bukatar haɗi.';
  return 'AI ya samu matsala. Sake gwadawa.';
}
