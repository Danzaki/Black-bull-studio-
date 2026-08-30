"use client";

import { useEffect, useState, useRef } from "react";

interface SlotInfo {
  slot: number;
  parent: number;
  root: number;
}

interface ProgramLogEvent {
  signature: string;
  slot: number;
  err: any;
  logs: string[];
}

export function useSolanaWebSocket(rpcWsUrl: string = "wss://api.mainnet-beta.solana.com") {
  const [isConnected, setIsConnected] = useState(false);
  const [currentSlot, setCurrentSlot] = useState<number | null>(null);
  const [latestLog, setLatestLog] = useState<ProgramLogEvent | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let ws: WebSocket;

    try {
      ws = new WebSocket(rpcWsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);

        // Subscribe to live slots (slotSubscribe)
        const slotSubscribeReq = JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "slotSubscribe",
        });

        // Subscribe to Raydium Liquidity Program logs (logsSubscribe)
        const logSubscribeReq = JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          method: "logsSubscribe",
          params: [
            { mentions: ["675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8"] }, // Raydium V4
            { commitment: "confirmed" },
          ],
        });

        ws.send(slotSubscribeReq);
        ws.send(logSubscribeReq);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Handle slot updates
          if (data.method === "slotNotification") {
            const slotData = data.params.result as SlotInfo;
            setCurrentSlot(slotData.slot);
          }

          // Handle live program logs
          if (data.method === "logsNotification") {
            const logData = data.params.result.value as ProgramLogEvent;
            setLatestLog(logData);
          }
        } catch (e) {
          // JSON parse bypass
        }
      };

      ws.onerror = () => {
        setIsConnected(false);
      };

      ws.onclose = () => {
        setIsConnected(false);
      };
    } catch (err) {
      setIsConnected(false);
    }

    return () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, [rpcWsUrl]);

  return { isConnected, currentSlot, latestLog };
}
