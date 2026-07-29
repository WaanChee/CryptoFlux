import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RelayListener = (payload: string) => void;

class CoinGeckoRelay {
  private socket: WebSocket | null = null;
  private readonly listeners = new Set<RelayListener>();
  private pendingMessages: string[] = [];
  private connectionPromise: Promise<void> | null = null;
  private connected = false;

  async connect(): Promise<void> {
    if (this.socket?.readyState === WebSocket.OPEN) {
      return;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    const websocketUrl =
      process.env.COINGECKO_WEBSOCKET_URL ??
      process.env.NEXT_PUBLIC_COINGECKO_WEBSOCKET_URL;
    const apiKey = process.env.COINGECKO_API_KEY;

    if (!websocketUrl || !apiKey) {
      throw new Error("CoinGecko websocket credentials are not configured.");
    }

    this.connectionPromise = new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(
        `${websocketUrl}?x_cg_pro_api_key=${apiKey}`
      );

      socket.addEventListener("open", () => {
        this.connected = true;
        while (this.pendingMessages.length > 0) {
          const pending = this.pendingMessages.shift();
          if (pending) {
            socket.send(pending);
          }
        }
        resolve();
      });

      socket.addEventListener("message", (event) => {
        const payload =
          typeof event.data === "string" ? event.data : event.data.toString();
        this.broadcast(payload);
      });

      socket.addEventListener("close", () => {
        this.connected = false;
        this.socket = null;
      });

      socket.addEventListener("error", (event) => {
        const message =
          event instanceof ErrorEvent ? event.message : "WebSocket relay error";
        this.broadcast(JSON.stringify({ type: "error", message }));
      });

      this.socket = socket;
    }).catch((error) => {
      this.connected = false;
      throw error;
    });

    try {
      await this.connectionPromise;
    } finally {
      this.connectionPromise = null;
    }
  }

  send(payload: string): void {
    if (!this.connected) {
      this.pendingMessages.push(payload);
      void this.connect();
      return;
    }

    this.socket?.send(payload);
  }

  subscribe(listener: RelayListener): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  private broadcast(payload: string): void {
    for (const listener of this.listeners) {
      listener(payload);
    }
  }
}

const relay = new CoinGeckoRelay();

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const unregister = relay.subscribe((payload) => {
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
      });

      const abortHandler = () => {
        unregister();
        controller.close();
      };

      request.signal.addEventListener("abort", abortHandler, { once: true });

      void relay.connect().catch((error) => {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", message: error instanceof Error ? error.message : "Unknown relay error" })}\n\n`
          )
        );
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    if (!payload || typeof payload !== "object") {
      return Response.json({ error: "Invalid payload" }, { status: 400 });
    }

    await relay.connect();
    relay.send(JSON.stringify(payload));

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to relay message",
      },
      { status: 500 }
    );
  }
}
