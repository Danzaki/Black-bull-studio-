"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  CrosshairMode,
  CandlestickSeries,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type HistogramData,
} from "lightweight-charts";
import type { Candle } from "@/hooks/useTokenOHLCV";

interface SolanaTradingChartProps {
  symbol: string;
  candles: Candle[];
  loading?: boolean;
  livePrice?: number | null;
  marketCap?: number | null;
}

interface Legend {
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
  pct: number;
}

const SUB = "₀₁₂₃₄₅₆₇₈₉";
const toSub = (n: number) =>
  String(n)
    .split("")
    .map((d) => SUB[Number(d)])
    .join("");
const trim = (s: string) => (s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s);

export function formatPrice(v: number): string {
  if (!isFinite(v)) return "--";
  if (v === 0) return "0";
  const abs = Math.abs(v);
  if (abs >= 1000) return v.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (abs >= 1) return trim(v.toFixed(4));
  if (abs >= 0.0001) return trim(v.toPrecision(4));
  const zeros = Math.ceil(-Math.log10(abs)) - 1;
  let digits = String(Math.round(abs * Math.pow(10, zeros + 4)));
  if (digits.length > 4) digits = digits.slice(0, 4);
  digits = digits.replace(/0+$/, "") || "0";
  return `${v < 0 ? "-" : ""}0.0${toSub(zeros)}${digits}`;
}

export function formatCompact(v: number): string {
  if (!isFinite(v)) return "--";
  const abs = Math.abs(v);
  if (abs >= 1e9) return (v / 1e9).toFixed(2) + "B";
  if (abs >= 1e6) return (v / 1e6).toFixed(2) + "M";
  if (abs >= 1e3) return (v / 1e3).toFixed(1) + "K";
  return v.toFixed(0);
}

function lastLegend(list: Candle[], mult: number): Legend | null {
  const c = list[list.length - 1];
  if (!c) return null;
  return {
    o: c.open * mult,
    h: c.high * mult,
    l: c.low * mult,
    c: c.close * mult,
    v: c.volume ?? 0,
    pct: c.open ? ((c.close - c.open) / c.open) * 100 : 0,
  };
}

export default function SolanaTradingChart({
  symbol,
  candles,
  loading,
  livePrice,
  marketCap,
}: SolanaTradingChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const dataRef = useRef<{ list: Candle[]; mult: number }>({ list: [], mult: 1 });
  const fittedRef = useRef(false);
  const [mode, setMode] = useState<"price" | "mcap">("price");
  const [legend, setLegend] = useState<Legend | null>(null);

  const lastClose = candles.length ? candles[candles.length - 1].close : 0;
  const supply = useMemo(
    () => (marketCap && lastClose > 0 ? marketCap / lastClose : null),
    [marketCap, lastClose]
  );
  const mult = mode === "mcap" && supply ? supply : 1;

  useEffect(() => {
    if (!supply && mode === "mcap") setMode("price");
  }, [supply, mode]);

  useEffect(() => {
    fittedRef.current = false;
  }, [symbol]);

  // Ƙirƙirar chart (sau ɗaya)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      layout: { background: { type: ColorType.Solid, color: "#000000" }, textColor: "#a1a1aa" },
      grid: { vertLines: { color: "#111113" }, horzLines: { color: "#111113" } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: "#27272a", scaleMargins: { top: 0.08, bottom: 0.25 } },
      timeScale: { borderColor: "#27272a", timeVisible: true, secondsVisible: false },
      width: el.clientWidth,
      height: 380,
    });

    const candle = chart.addSeries(CandlestickSeries, {
      upColor: "#10b981",
      downColor: "#f43f5e",
      borderVisible: false,
      wickUpColor: "#10b981",
      wickDownColor: "#f43f5e",
      priceFormat: { type: "price", precision: 12, minMove: 1e-12 },
    });

    const vol = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "",
    });
    vol.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

    chart.subscribeCrosshairMove((param) => {
      const cd = param.seriesData.get(candle) as CandlestickData | undefined;
      if (!param.time || !cd) {
        setLegend(lastLegend(dataRef.current.list, dataRef.current.mult));
        return;
      }
      const vd = param.seriesData.get(vol) as HistogramData | undefined;
      setLegend({
        o: cd.open,
        h: cd.high,
        l: cd.low,
        c: cd.close,
        v: vd?.value ?? 0,
        pct: cd.open ? ((cd.close - cd.open) / cd.open) * 100 : 0,
      });
    });

    chartRef.current = chart;
    candleRef.current = candle;
    volRef.current = vol;

    const ro = new ResizeObserver(() => chart.applyOptions({ width: el.clientWidth }));
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      candleRef.current = null;
      volRef.current = null;
    };
  }, []);

  // Tsarin nuna lambobi (Price ko MC)
  useEffect(() => {
    chartRef.current?.applyOptions({
      localization: {
        priceFormatter: (p: number) => (mode === "mcap" ? "$" + formatCompact(p) : "$" + formatPrice(p)),
      },
    });
  }, [mode]);

  // Bayanan candles da volume
  useEffect(() => {
    const candle = candleRef.current;
    const vol = volRef.current;
    if (!candle || !vol) return;
    dataRef.current = { list: candles, mult };
    if (!candles.length) {
      candle.setData([]);
      vol.setData([]);
      setLegend(null);
      return;
    }
    candle.setData(
      candles.map((c) => ({
        time: c.time,
        open: c.open * mult,
        high: c.high * mult,
        low: c.low * mult,
        close: c.close * mult,
      }))
    );
    vol.setData(
      candles.map((c) => ({
        time: c.time,
        value: c.volume ?? 0,
        color: c.close >= c.open ? "rgba(16,185,129,0.4)" : "rgba(244,63,94,0.4)",
      }))
    );
    setLegend(lastLegend(candles, mult));
    if (!fittedRef.current) {
      chartRef.current?.timeScale().fitContent();
      fittedRef.current = true;
    }
  }, [candles, mult]);

  // Farashi kai tsaye: yana sabunta candle na ƙarshe
  useEffect(() => {
    const candle = candleRef.current;
    const list = dataRef.current.list;
    if (!candle || !livePrice || !list.length) return;
    const last = list[list.length - 1];
    const m = dataRef.current.mult;
    candle.update({
      time: last.time,
      open: last.open * m,
      high: Math.max(last.high, livePrice) * m,
      low: Math.min(last.low, livePrice) * m,
      close: livePrice * m,
    });
  }, [livePrice]);

  const fmt = (v: number) => (mode === "mcap" ? "$" + formatCompact(v) : "$" + formatPrice(v));
  const up = (legend?.pct ?? 0) >= 0;

  return (
    <div className="w-full bg-black p-3 space-y-2 font-mono">
      <div className="flex items-center justify-between border-b border-bb-border pb-2">
        <span className="text-xs font-bold text-white">
          {symbol} / {mode === "mcap" ? "MCAP" : "USD"}
        </span>
        <div className="flex items-center gap-2">
          {loading && <span className="text-[10px] text-zinc-500">Loading...</span>}
          {supply ? (
            <div className="flex overflow-hidden rounded border border-zinc-800 text-[10px]">
              <button
                type="button"
                onClick={() => setMode("price")}
                className={mode === "price" ? "bg-zinc-800 px-2 py-0.5 text-white" : "px-2 py-0.5 text-zinc-500"}
              >
                Price
              </button>
              <button
                type="button"
                onClick={() => setMode("mcap")}
                className={mode === "mcap" ? "bg-zinc-800 px-2 py-0.5 text-white" : "px-2 py-0.5 text-zinc-500"}
              >
                MC
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {legend && (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-zinc-400">
          <span>O <b className="text-zinc-200">{fmt(legend.o)}</b></span>
          <span>H <b className="text-zinc-200">{fmt(legend.h)}</b></span>
          <span>L <b className="text-zinc-200">{fmt(legend.l)}</b></span>
          <span>C <b className="text-zinc-200">{fmt(legend.c)}</b></span>
          <span className={up ? "text-bb-up" : "text-bb-down"}>
            {up ? "+" : ""}
            {legend.pct.toFixed(2)}%
          </span>
          <span>Vol <b className="text-zinc-200">${formatCompact(legend.v)}</b></span>
        </div>
      )}

      <div ref={containerRef} className="w-full h-[380px]" />
    </div>
  );
}
