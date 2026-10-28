import { DurableObject } from "cloudflare:workers";

interface Env {
  RELAY_ROOM: DurableObjectNamespace<BitSocialRelayRoom>;
}

export class BitSocialRelayRoom extends DurableObject {
  private subscriptions: Map<string, Set<WebSocket>> = new Map();
  private socketTopics: Map<WebSocket, Set<string>> = new Map();
  private stats = {
    totalConnections: 0,
    messagesRelayed: 0,
    startedAt: Date.now()
  };

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Health / stats endpoint
    if (url.pathname === "/stats" || url.pathname === "/health") {
      let activeSocketsCount = 0;
      for (const sockets of this.subscriptions.values()) {
        activeSocketsCount += sockets.size;
      }
      return Response.json({
        status: "healthy",
        uptimeSeconds: Math.floor((Date.now() - this.stats.startedAt) / 1000),
        activeTopics: this.subscriptions.size,
        activeSubscriptions: activeSocketsCount,
        messagesRelayed: this.stats.messagesRelayed
      });
    }

    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response(
        "⚡️ Wacko BitSocial P2P WebSocket Relay is Active.\nConnect via WebSocket (ws:// or wss://) to subscribe to Gossipsub discovery topics.\n\nHealth check: /health",
        { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } }
      );
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    this.ctx.acceptWebSocket(server);
    this.socketTopics.set(server, new Set());
    this.stats.totalConnections++;

    return new Response(null, { status: 101, webSocket: client });
  }

  // Handle incoming WebSocket messages (Cloudflare Hibernation API)
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    try {
      const text = typeof message === "string" ? message : new TextDecoder().decode(message);
      const msg = JSON.parse(text);

      // 1. Topic Subscription: { jsonrpc: "2.0", method: "bitsocial_subscribe", params: { topic } }
      if (msg.method === "bitsocial_subscribe" && msg.params?.topic) {
        const topic = msg.params.topic;
        if (!this.subscriptions.has(topic)) {
          this.subscriptions.set(topic, new Set());
        }
        this.subscriptions.get(topic)!.add(ws);

        let topics = this.socketTopics.get(ws);
        if (!topics) {
          topics = new Set();
          this.socketTopics.set(ws, topics);
        }
        topics.add(topic);

        // Acknowledge subscription
        ws.send(
          JSON.stringify({
            jsonrpc: "2.0",
            result: { subscribed: topic },
            id: msg.id ?? null
          })
        );
        return;
      }

      // 2. Publish Encrypted Envelope: { jsonrpc: "2.0", method: "bitsocial_publish", params: { topic, data } }
      if (msg.method === "bitsocial_publish" && msg.params?.topic && msg.params?.data) {
        const topic = msg.params.topic;
        const peers = this.subscriptions.get(topic);
        if (peers && peers.size > 0) {
          const broadcastPayload = JSON.stringify({
            jsonrpc: "2.0",
            method: "bitsocial_message",
            params: {
              topic,
              data: msg.params.data
            }
          });

          this.stats.messagesRelayed++;

          for (const peer of peers) {
            // Forward to all peers in the topic except sender
            if (peer !== ws) {
              try {
                peer.send(broadcastPayload);
              } catch {
                // Closed connections will be cleaned up by webSocketClose
              }
            }
          }
        }
        return;
      }

      // 3. Ping/Pong Heartbeat
      if (msg.method === "ping") {
        ws.send(JSON.stringify({ method: "pong", timestamp: Date.now() }));
      }
    } catch {
      // Ignore malformed payloads - relay is zero-knowledge
    }
  }

  async webSocketClose(ws: WebSocket, _code: number, _reason: string, _wasClean: boolean) {
    this.removeSocket(ws);
  }

  async webSocketError(ws: WebSocket, _error: unknown) {
    this.removeSocket(ws);
  }

  private removeSocket(ws: WebSocket) {
    const topics = this.socketTopics.get(ws);
    if (topics) {
      for (const topic of topics) {
        const peers = this.subscriptions.get(topic);
        if (peers) {
          peers.delete(ws);
          if (peers.size === 0) {
            this.subscriptions.delete(topic);
          }
        }
      }
      this.socketTopics.delete(ws);
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Route all clients to the global singleton mesh room
    const id = env.RELAY_ROOM.idFromName("wacko-global-mesh");
    const room = env.RELAY_ROOM.get(id);
    return room.fetch(request);
  }
};
