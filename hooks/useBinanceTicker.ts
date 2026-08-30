"use client";

import { useEffect, useState } from "react";

// Tsarin bayanan da muke karɓowa daga Binance
export interface TickerData {
  symbol: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume: number;
}

export function useBinanceTicker(symbol: string = "BTCUSDT") {
  const [data, setData] = useState<TickerData | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    // Haɗawa da Binance Live Stream WebSocket
    const pair = symbol.toLowerCase();
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${pair}@ticker`);

    ws.onopen = () => {
      // Yana nuna cewa an haɗa da yanar gizo lafiya
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      // Karɓar sabon farashi da sauran bayanan kasuwa
      const raw = JSON.parse(event.data);
      setData({
        symbol: raw.s,
        price: parseFloat(raw.c),        // Farashi na yanzu
        change24h: parseFloat(raw.P),    // Kashe-kashen sauyi na sa'o'i 24
        high24h: parseFloat(raw.h),      // Farashi mafi ƙoli
        low24h: parseFloat(raw.l),       // Farashi mafi ƙasa
        volume: parseFloat(raw.v),       // Yawan ciniki
      });
    };

    ws.onerror = (err) => {
      // Idan aka samu matsalar hanyar yanar gizo
      console.error("Matsalar WebSocket:", err);
      setIsConnected(false);
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    // Tsofe haɗin yanar gizo idan an rufe shafin
    return () => {
      ws.close();
    };
  }, [symbol]);

  return { data, isConnected };
}
