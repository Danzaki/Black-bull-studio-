'use client';

import { useMemo, useRef, useState, type DragEvent, type WheelEvent } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { createCompletion } from '@/services/openaiService';

const DEFAULT_CANVAS_SIZE = { width: 1040, height: 640 };
const STICKERS = ['🔥', '✨', '💥', '🎯', '🧠', '🚀', '🤯'];
const FONTS = ['Inter', 'Montserrat', 'Playfair Display', 'Space Grotesk', 'Bebas Neue'];

type MemeLayer = {
  id: string;
  type: 'image' | 'text' | 'sticker';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  content: string;
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  outline?: string;
  shadow?: string;
};

type HistoryEntry = {
  layers: MemeLayer[];
  activeLayerId: string | null;
};

function generateId() {
  return `layer-${Math.random().toString(36).slice(2, 10)}`;
}

export default function StudioWorkspace() {
  const initialLayer: MemeLayer = {
    id: generateId(),
    type: 'text',
    x: 140,
    y: 280,
    width: 760,
    height: 120,
    rotation: 0,
    opacity: 1,
    content: 'Your meme caption here',
    fontFamily: 'Inter',
    fontSize: 56,
    color: '#FACC15',
    outline: '#111827',
    shadow: '#000000',
  };

  const [layers, setLayers] = useState<MemeLayer[]>([initialLayer]);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(initialLayer.id);
  const [history, setHistory] = useState<HistoryEntry[]>([{ layers: [initialLayer], activeLayerId: initialLayer.id }]);
  const [future, setFuture] = useState<HistoryEntry[]>([]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [message, setMessage] = useState('Ready to create a premium AI meme.');
  const [captionLoading, setCaptionLoading] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [uploading, setUploading] = useState(false);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const activeLayer = useMemo(() => layers.find((layer) => layer.id === activeLayerId) ?? null, [layers, activeLayerId]);

  function getValidLayerId(layers: MemeLayer[], candidateId: string | null) {
    if (!candidateId) {
      return layers[0]?.id ?? null;
    }
    return layers.some((layer) => layer.id === candidateId) ? candidateId : layers[0]?.id ?? null;
  }

  function pushHistory(newLayers: MemeLayer[], newActiveLayerId: string | null) {
    setHistory((current) => [...current, { layers: newLayers, activeLayerId: newActiveLayerId }]);
    setFuture([]);
  }

  function updateLayer(layerId: string, updates: Partial<MemeLayer>) {
    setLayers((current) => {
      const updated = current.map((layer) => (layer.id === layerId ? { ...layer, ...updates } : layer));
      pushHistory(updated, layerId);
      return updated;
    });
  }

  function addTextLayer() {
    const newLayer = {
      id: generateId(),
      type: 'text' as const,
      x: 160,
      y: 160,
      width: 760,
      height: 120,
      rotation: 0,
      opacity: 1,
      content: 'New caption',
      fontFamily: 'Inter',
      fontSize: 48,
      color: '#FACC15',
      outline: '#111827',
      shadow: '#000000',
    };
    const updated = [...layers, newLayer];
    setLayers(updated);
    setActiveLayerId(newLayer.id);
    pushHistory(updated, newLayer.id);
  }

  function addStickerLayer(sticker: string) {
    const newLayer = {
      id: generateId(),
      type: 'sticker' as const,
      x: 220,
      y: 220,
      width: 120,
      height: 120,
      rotation: 0,
      opacity: 1,
      content: sticker,
    };
    const updated = [...layers, newLayer];
    setLayers(updated);
    setActiveLayerId(newLayer.id);
    pushHistory(updated, newLayer.id);
  }

  function deleteLayer(layerId: string) {
    const updated = layers.filter((layer) => layer.id !== layerId);
    setLayers(updated);
    setActiveLayerId(updated[updated.length - 1]?.id ?? null);
    pushHistory(updated, updated[updated.length - 1]?.id ?? null);
  }

  function addImageLayer(file: File) {
    const url = URL.createObjectURL(file);
    const newLayer = {
      id: generateId(),
      type: 'image' as const,
      x: 120,
      y: 120,
      width: 720,
      height: 420,
      rotation: 0,
      opacity: 1,
      content: url,
    };
    const updated = [...layers, newLayer];
    setLayers(updated);
    setActiveLayerId(newLayer.id);
    pushHistory(updated, newLayer.id);
  }

  function undo() {
    if (history.length <= 1) {
      return;
    }
    const previous = history[history.length - 2];
    setFuture((current) => [history[history.length - 1], ...current]);
    setHistory((current) => current.slice(0, -1));
    setLayers(previous.layers);
    setActiveLayerId(getValidLayerId(previous.layers, previous.activeLayerId));
  }

  function redo() {
    if (future.length === 0) {
      return;
    }
    const next = future[0];
    setHistory((current) => [...current, next]);
    setFuture((current) => current.slice(1));
    setLayers(next.layers);
    setActiveLayerId(getValidLayerId(next.layers, next.activeLayerId));
  }

  function handleCanvasWheel(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    const factor = event.deltaY < 0 ? 0.1 : -0.1;
    setZoom((current) => Math.min(2.5, Math.max(0.6, current + factor)));
  }

  async function generateCaption() {
    if (captionLoading) return;
    setCaptionLoading(true);

    try {
      const description = 'Generate a bold premium meme caption for a luxury AI brand launch.';
      const caption = await createCompletion(description);
      const updated = layers.map((layer) =>
        layer.type === 'text'
          ? {
              ...layer,
              content: caption.slice(0, 80),
            }
          : layer
      );
      setLayers(updated);
      pushHistory(updated, activeLayerId);
      setMessage('Caption updated with AI-generated copy.');
    } catch (error) {
      setMessage('Unable to generate caption at this time.');
    } finally {
      setCaptionLoading(false);
    }
  }

  async function exportImage(format: 'png' | 'jpeg' | 'webp') {
    const canvas = document.createElement('canvas');
    canvas.width = DEFAULT_CANVAS_SIZE.width;
    canvas.height = DEFAULT_CANVAS_SIZE.height;
    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    context.fillStyle = '#040509';
    context.fillRect(0, 0, canvas.width, canvas.height);

    for (const layer of layers) {
      context.save();
      context.globalAlpha = layer.opacity;
      context.translate(layer.x + layer.width / 2, layer.y + layer.height / 2);
      context.rotate((layer.rotation * Math.PI) / 180);
      if (layer.type === 'image') {
        const image = new Image();
        image.src = layer.content;
        await new Promise<void>((resolve) => {
          image.onload = () => {
            context.drawImage(image, -layer.width / 2, -layer.height / 2, layer.width, layer.height);
            resolve();
          };
          image.onerror = () => resolve();
        });
      }
      if (layer.type === 'sticker') {
        context.font = `${layer.width}px Inter`;
        context.fillText(layer.content, -layer.width / 2, layer.height / 4);
      }
      if (layer.type === 'text') {
        context.font = `${layer.fontSize ?? 48}px ${layer.fontFamily ?? 'Inter'}`;
        context.fillStyle = layer.color ?? '#FACC15';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.lineWidth = 8;
        context.strokeStyle = layer.outline ?? '#111827';
        context.strokeText(layer.content, 0, 0, layer.width);
        context.fillText(layer.content, 0, 0, layer.width);
      }
      context.restore();
    }

    const mimeType = format === 'png' ? 'image/png' : format === 'jpeg' ? 'image/jpeg' : 'image/webp';
    const url = canvas.toDataURL(mimeType, 0.95);
    const link = document.createElement('a');
    link.href = url;
    link.download = `black-bull-meme.${format}`;
    link.click();
  }

  async function saveDraft() {
    if (!draftName.trim()) {
      setMessage('Please name your draft before saving.');
      return;
    }
    if (!canvasRef.current) {
      return;
    }

    setUploading(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = DEFAULT_CANVAS_SIZE.width;
      canvas.height = DEFAULT_CANVAS_SIZE.height;
      const context = canvas.getContext('2d');
      if (!context) {
        return;
      }

      context.fillStyle = '#040509';
      context.fillRect(0, 0, canvas.width, canvas.height);
      layers.forEach((layer) => {
        context.save();
        context.translate(layer.x + layer.width / 2, layer.y + layer.height / 2);
        context.rotate((layer.rotation * Math.PI) / 180);
        if (layer.type === 'image') {
          const image = new Image();
          image.src = layer.content;
          context.drawImage(image, -layer.width / 2, -layer.height / 2, layer.width, layer.height);
        }
        if (layer.type === 'sticker') {
          context.font = `${layer.width}px Inter`;
          context.fillText(layer.content, -layer.width / 2, layer.height / 4);
        }
        if (layer.type === 'text') {
          context.font = `${layer.fontSize ?? 48}px ${layer.fontFamily ?? 'Inter'}`;
          context.fillStyle = layer.color ?? '#FACC15';
          context.textAlign = 'center';
          context.textBaseline = 'middle';
          context.lineWidth = 8;
          context.strokeStyle = layer.outline ?? '#111827';
          context.strokeText(layer.content, 0, 0, layer.width);
          context.fillText(layer.content, 0, 0, layer.width);
        }
        context.restore();
      });

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((result) => resolve(result), 'image/png'));
      if (!blob) {
        throw new Error('Failed to create image draft.');
      }

      const supabase = getSupabaseClient();
      const filename = `${draftName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.png`;
      const { error } = await supabase.storage.from('meme-drafts').upload(filename, blob, {
        contentType: 'image/png',
      });

      if (error) {
        throw error;
      }

      setMessage('Draft saved successfully to Supabase Storage.');
    } catch (error) {
      setMessage('Unable to save draft.');
    } finally {
      setUploading(false);
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      addImageLayer(file);
    }
  }

  function onDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <header className="rounded-[2.5rem] border border-amber-400/10 bg-slate-950/95 p-6 shadow-glow">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-amber-300/80">AI Meme Studio</p>
              <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Create premium memes with AI-powered design tools.</h1>
              <p className="mt-4 max-w-3xl text-slate-300">Upload images, add bold captions, layer stickers, and export finished assets in PNG, JPG, or WebP.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <button onClick={undo} className="rounded-full border border-slate-700 bg-slate-900/90 px-4 py-2 text-sm text-slate-100 transition hover:border-amber-300">
                Undo
              </button>
              <button onClick={redo} className="rounded-full border border-slate-700 bg-slate-900/90 px-4 py-2 text-sm text-slate-100 transition hover:border-amber-300">
                Redo
              </button>
              <button onClick={generateCaption} disabled={captionLoading} className="rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60">
                {captionLoading ? 'Generating…' : 'AI Caption'}
              </button>
            </div>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[1.55fr_0.95fr]">
          <section className="rounded-[2.5rem] border border-slate-800/90 bg-slate-950/95 p-5 shadow-2xl shadow-slate-950/20">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="rounded-3xl bg-slate-900/95 px-4 py-3 text-sm text-slate-300">
                {message}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button onClick={() => setZoom((current) => Math.min(2.5, current + 0.1))} className="rounded-full border border-slate-700 bg-slate-900/90 px-4 py-2 text-sm text-slate-100 transition hover:border-amber-300">Zoom in</button>
                <button onClick={() => setZoom((current) => Math.max(0.6, current - 0.1))} className="rounded-full border border-slate-700 bg-slate-900/90 px-4 py-2 text-sm text-slate-100 transition hover:border-amber-300">Zoom out</button>
                <button onClick={() => setPan({ x: 0, y: 0 })} className="rounded-full border border-slate-700 bg-slate-900/90 px-4 py-2 text-sm text-slate-100 transition hover:border-amber-300">Reset pan</button>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[2.5rem] border border-slate-800/90 bg-slate-950/80 p-5">
              <div className="mb-4 grid gap-3 sm:grid-cols-2">
                <label className="rounded-3xl border border-slate-800/90 bg-slate-900/95 px-4 py-3 text-sm text-slate-300">
                  <span className="block text-slate-400">Upload image</span>
                  <input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) addImageLayer(file); }} className="mt-2 w-full cursor-pointer text-slate-200" />
                </label>
                <label className="rounded-3xl border border-slate-800/90 bg-slate-900/95 px-4 py-3 text-sm text-slate-300">
                  <span className="block text-slate-400">Draft name</span>
                  <input value={draftName} onChange={(event) => setDraftName(event.target.value)} placeholder="Midnight launch" className="mt-2 w-full rounded-3xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none" />
                </label>
              </div>

              <div className="relative h-[480px] overflow-hidden rounded-[2.25rem] border border-slate-800/90 bg-slate-900 p-4" onDrop={onDrop} onDragOver={onDragOver} onWheel={handleCanvasWheel} ref={canvasRef}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.08),_transparent_26%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.02),_transparent_30%)]" />
                <div className="absolute inset-x-0 top-4 left-4 flex gap-3 text-xs uppercase tracking-[0.28em] text-slate-400">
                  <span>Canvas</span>
                  <span>Zoom {Math.round(zoom * 100)}%</span>
                  <span>Pan {pan.x},{pan.y}</span>
                </div>
                <div className="pointer-events-none absolute inset-0 rounded-[2rem] border border-dashed border-slate-700" />
                <div
                  className="absolute left-1/2 top-1/2 h-[640px] w-[1040px] -translate-x-1/2 -translate-y-1/2 rounded-[2rem] bg-[#0B1220] shadow-[inset_0_0_60px_rgba(0,0,0,0.4)]"
                  style={{ transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom})` }}
                >
                  {layers.map((layer) => (
                    <div
                      key={layer.id}
                      onClick={() => setActiveLayerId(layer.id)}
                      className={`absolute ${layer.type === 'image' ? 'overflow-hidden rounded-[1.5rem]' : ''}`}
                      style={{
                        left: layer.x,
                        top: layer.y,
                        width: layer.width,
                        height: layer.height,
                        transform: `rotate(${layer.rotation}deg)`,
                        opacity: layer.opacity,
                        border: layer.id === activeLayerId ? '2px solid rgba(245, 158, 11, 0.9)' : '1px solid rgba(148, 163, 184, 0.12)',
                        cursor: 'pointer',
                        padding: layer.type === 'text' ? 10 : 0,
                      }}
                    >
                      {layer.type === 'image' ? (
                        <img src={layer.content} alt="Meme upload" className="h-full w-full object-cover" />
                      ) : layer.type === 'sticker' ? (
                        <div className="flex h-full items-center justify-center text-6xl">{layer.content}</div>
                      ) : (
                        <div
                          style={{
                            fontFamily: layer.fontFamily,
                            fontSize: layer.fontSize,
                            color: layer.color,
                            textShadow: `2px 2px 0 ${layer.outline}, 5px 5px 15px ${layer.shadow}`,
                            whiteSpace: 'pre-wrap',
                            lineHeight: 1.05,
                          }}
                        >
                          {layer.content}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-[2rem] border border-slate-800/90 bg-slate-950/95 p-6 shadow-2xl shadow-slate-950/20">
              <h2 className="mb-4 text-lg font-semibold text-white">Layers</h2>
              <div className="flex flex-col gap-3">
                {layers.map((layer) => (
                  <button
                    key={layer.id}
                    type="button"
                    onClick={() => setActiveLayerId(layer.id)}
                    className={`w-full rounded-3xl border px-4 py-3 text-left transition ${layer.id === activeLayerId ? 'border-amber-400/60 bg-amber-500/10 text-white' : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-amber-300/40 hover:bg-slate-900/95'}`}
                  >
                    <span className="block text-sm font-semibold">{layer.type === 'image' ? 'Image' : layer.type === 'sticker' ? 'Sticker' : 'Text'}</span>
                    <span className="mt-1 block text-xs text-slate-400">{layer.id}</span>
                  </button>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <button type="button" onClick={addTextLayer} className="rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-300">Add text</button>
                {STICKERS.map((sticker) => (
                  <button key={sticker} type="button" onClick={() => addStickerLayer(sticker)} className="rounded-full border border-slate-700 bg-slate-900/90 px-4 py-2 text-sm text-slate-100 transition hover:border-amber-300">{sticker}</button>
                ))}
              </div>
            </section>

            {activeLayer ? (
              <section className="rounded-[2rem] border border-slate-800/90 bg-slate-950/95 p-6 shadow-2xl shadow-slate-950/20">
                <h2 className="mb-4 text-lg font-semibold text-white">Layer settings</h2>
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">Opacity</label>
                    <input type="range" min={0.2} max={1} step={0.05} value={activeLayer.opacity} onChange={(event) => updateLayer(activeLayer.id, { opacity: Number(event.target.value) })} className="w-full" />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">Rotation</label>
                    <input type="range" min={0} max={360} step={1} value={activeLayer.rotation} onChange={(event) => updateLayer(activeLayer.id, { rotation: Number(event.target.value) })} className="w-full" />
                  </div>
                  {activeLayer.type === 'text' && (
                    <>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-300">Text</label>
                        <textarea value={activeLayer.content} onChange={(event) => updateLayer(activeLayer.id, { content: event.target.value })} rows={3} className="w-full rounded-3xl border border-slate-800 bg-slate-900/95 px-4 py-3 text-sm text-slate-100 outline-none" />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-300">Font</label>
                        <select value={activeLayer.fontFamily} onChange={(event) => updateLayer(activeLayer.id, { fontFamily: event.target.value })} className="w-full rounded-3xl border border-slate-800 bg-slate-900/95 px-4 py-3 text-sm text-slate-100 outline-none">
                          {FONTS.map((font) => (
                            <option key={font} value={font}>{font}</option>
                          ))}
                        </select>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block text-sm font-medium text-slate-300">Font size</label>
                        <input type="number" min={24} max={120} value={activeLayer.fontSize} onChange={(event) => updateLayer(activeLayer.id, { fontSize: Number(event.target.value) })} className="w-full rounded-3xl border border-slate-800 bg-slate-900/95 px-4 py-3 text-sm text-slate-100 outline-none" />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-300">Color</label>
                          <input type="color" value={activeLayer.color} onChange={(event) => updateLayer(activeLayer.id, { color: event.target.value })} className="h-12 w-full rounded-3xl border border-slate-800 bg-slate-900/95 p-2" />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-300">Outline</label>
                          <input type="color" value={activeLayer.outline} onChange={(event) => updateLayer(activeLayer.id, { outline: event.target.value })} className="h-12 w-full rounded-3xl border border-slate-800 bg-slate-900/95 p-2" />
                        </div>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-300">Shadow</label>
                          <input type="color" value={activeLayer.shadow} onChange={(event) => updateLayer(activeLayer.id, { shadow: event.target.value })} className="h-12 w-full rounded-3xl border border-slate-800 bg-slate-900/95 p-2" />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-300">Size</label>
                          <input type="range" min={0.5} max={2} step={0.05} value={activeLayer.width / 120} onChange={(event) => updateLayer(activeLayer.id, { width: Number(event.target.value) * 120, height: Number(event.target.value) * 60 })} className="w-full" />
                        </div>
                      </div>
                    </>
                  )}
                  <button type="button" onClick={() => deleteLayer(activeLayer.id)} className="w-full rounded-full border border-rose-500 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/20">
                    Delete layer
                  </button>
                </div>
              </section>
            ) : null}

            <section className="rounded-[2rem] border border-slate-800/90 bg-slate-950/95 p-6 shadow-2xl shadow-slate-950/20">
              <h2 className="mb-4 text-lg font-semibold text-white">Export & save</h2>
              <div className="grid gap-3">
                <button type="button" onClick={() => exportImage('png')} className="rounded-full bg-amber-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300">Export PNG</button>
                <button type="button" onClick={() => exportImage('jpeg')} className="rounded-full bg-amber-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300">Export JPG</button>
                <button type="button" onClick={() => exportImage('webp')} className="rounded-full bg-amber-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300">Export WebP</button>
                <button type="button" onClick={saveDraft} disabled={uploading} className="rounded-full bg-slate-900/95 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70">
                  {uploading ? 'Saving draft…' : 'Save draft to Supabase'}
                </button>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
