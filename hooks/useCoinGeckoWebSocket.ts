"use client";

import { useEffect, useRef, useState } from "react";

const RELAY_ENDPOINT = "/api/coingecko/ws";
const INITIAL_RETRY_DELAY_MS = 1_000;
const MAX_RETRY_DELAY_MS = 5_000;

export const useCoinGeckoWebSocket = ({
  coinId,
  poolId,
  liveInterval,
}: UseCoinGeckoWebSocketProps): UseCoinGeckoWebSocketReturn => {
  const eventSourceRef = useRef<EventSource | null>(null);
  const subscribed = useRef(new Set<string>());
  const retryCountRef = useRef(0);
  const reconnectTimerRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);

  const [price, setPrice] = useState<ExtendedPriceData | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [ohlcv, setOhlcv] = useState<OHLCData | null>(null);

  const [isWsReady, setIsWsReady] = useState(false);

  useEffect(() => {
    const scheduleReconnect = () => {
      if (!isMountedRef.current || reconnectTimerRef.current !== null) {
        return;
      }

      const delay = Math.min(
        INITIAL_RETRY_DELAY_MS * 2 ** retryCountRef.current,
        MAX_RETRY_DELAY_MS
      );

      retryCountRef.current += 1;

      reconnectTimerRef.current = window.setTimeout(() => {
        reconnectTimerRef.current = null;
        connect();
      }, delay);
    };

    const handleConnectionFailure = () => {
      setIsWsReady(false);
      if (!isMountedRef.current) {
        return;
      }

      eventSourceRef.current?.close();
      scheduleReconnect();
    };

    const connect = () => {
      if (!isMountedRef.current) {
        return;
      }

      const eventSource = new EventSource(RELAY_ENDPOINT);
      eventSourceRef.current = eventSource;

      const send = async (payload: Record<string, unknown>) => {
        try {
          await fetch(RELAY_ENDPOINT, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });
        } catch {
          // Ignore relay send errors; they will surface through the stream.
        }
      };

      const handleMessage = (event: MessageEvent) => {
        let msg: WebSocketMessage;

        try {
          msg = JSON.parse(event.data);
        } catch {
          handleConnectionFailure();
          return;
        }

        if (msg.type === "ping") {
          void send({ type: "pong" });
          return;
        }

        if (msg.c === "C1") {
          setPrice({
            usd: msg.p ?? 0,
            coin: msg.i,
            price: msg.p,
            change24h: msg.pp,
            marketCap: msg.m,
            volume24h: msg.v,
            timestamp: msg.t,
          });
        }

        if (msg.c === "G2") {
          const newTrade: Trade = {
            price: msg.pu,
            value: msg.vo,
            timestamp: msg.t ?? 0,
            type: msg.ty,
            amount: msg.to,
          };

          setTrades((prev) => [newTrade, ...prev].slice(0, 7));
        }

        if (msg.ch === "G3") {
          const timestamp = msg.t ?? 0;

          const candle: OHLCData = [
            timestamp,
            Number(msg.o ?? 0),
            Number(msg.h ?? 0),
            Number(msg.l ?? 0),
            Number(msg.c ?? 0),
          ];

          setOhlcv(candle);
        }
      };

      eventSource.onopen = () => {
        retryCountRef.current = 0;
        setIsWsReady(true);
      };
      eventSource.onmessage = handleMessage;
      eventSource.onerror = () => {
        handleConnectionFailure();
      };
    };

    connect();

    return () => {
      isMountedRef.current = false;

      if (reconnectTimerRef.current !== null) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      eventSourceRef.current?.close();
      eventSourceRef.current = null;
      setIsWsReady(false);
    };
  }, []);

  useEffect(() => {
    if (!isWsReady) return;
    const eventSource = eventSourceRef.current;
    if (!eventSource) return;

    const send = async (payload: Record<string, unknown>) => {
      try {
        const response = await fetch(RELAY_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        return response.ok;
      } catch {
        return false;
      }
    };

    const unsubscribeAll = () => {
      subscribed.current.forEach((channel) => {
        void send({
          command: "unsubscribe",
          identifier: JSON.stringify({ channel }),
        });
      });

      subscribed.current.clear();
    };

    const resetState = () => {
      setPrice(null);
      setTrades([]);
      setOhlcv(null);
    };

    const subscribe = async (
      channel: string,
      data?: Record<string, unknown>
    ) => {
      if (subscribed.current.has(channel)) return;

      const subscribeSent = await send({
        command: "subscribe",
        identifier: JSON.stringify({ channel }),
      });

      if (!subscribeSent) return;

      if (data) {
        const messageSent = await send({
          command: "message",
          identifier: JSON.stringify({ channel }),
          data: JSON.stringify(data),
        });

        if (!messageSent) return;
      }

      subscribed.current.add(channel);
    };

    const resubscribe = async () => {
      resetState();
      unsubscribeAll();

      await subscribe("CGSimpleProce", {
        coinId: [coinId],
        action: "set_tokens",
      });

      const poolAddress = poolId.replace("_", ":");

      if (poolAddress) {
        await subscribe("OnchainTrade", {
          "network_id:pool_addresses": [poolAddress],
          action: "set_pools",
        });

        await subscribe("OnchainOHLCV", {
          "network_id:pool_addresses": [poolAddress],
          interval: liveInterval,
          action: "set_pools",
        });
      }
    };

    void resubscribe();

    return () => {
      unsubscribeAll();
    };
  }, [coinId, poolId, isWsReady, liveInterval]);

  return {
    price,
    trades,
    ohlcv,
    isConnected: isWsReady,
  };
};
