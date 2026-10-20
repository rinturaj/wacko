/**
 * @wacko/protocol
 * BitSocial P2P client implementing:
 * - Real-time Gossipsub pubsub topic swarms (BitSocial spec)
 * - Ephemeral Heartbeat discovery (Option A: Non-existing mode when offline)
 * - Automatic peer pruning on TTL expiration
 * - Mutual Double-Blind Matching signals
 * - End-to-End Encrypted (E2EE) Direct Whisper Messaging
 * - Multi-transport resilience (BitSocial RPC daemon + Browser P2P mesh)
 */

import {
  UserProfile,
  EphemeralPeerPresence,
  MatchSignal,
  EncryptedMessagePayload,
  ChatMessage
} from '@wacko/core';
import {
  IdentityKeyBundle,
  deriveSessionKey,
  encryptDirectMessage,
  decryptDirectMessage,
  signPayload,
  verifySignature
} from '@wacko/crypto';

export type ProtocolEventMap = {
  peer_discovered: (peer: EphemeralPeerPresence) => void;
  peer_updated: (peer: EphemeralPeerPresence) => void;
  peer_left: (peerId: string) => void;
  match_signal_received: (signal: MatchSignal) => void;
  message_received: (message: ChatMessage) => void;
  connection_status: (status: 'connected' | 'disconnected' | 'connecting') => void;
};

export interface BitSocialConfig {
  rpcUrl?: string; // Optional BitSocial Daemon / Forge RPC endpoint e.g., 'ws://localhost:9090'
  discoveryTopic?: string; // Default: 'bitsocial:wacko:discovery'
  heartbeatIntervalMs?: number; // Default: 20000 (20s)
  ttlSeconds?: number; // Default: 45s
}

export class BitSocialP2PClient {
  private config: Required<BitSocialConfig>;
  private identity: IdentityKeyBundle | null = null;
  private profile: UserProfile | null = null;

  private isConnected = false;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private sweepTimer: ReturnType<typeof setInterval> | null = null;

  // Active ephemeral peers currently present in the network (in-memory only)
  private activePeers = new Map<string, EphemeralPeerPresence & { lastReceived: number }>();

  // Cached ECDH session keys: [recipientPeerId] -> CryptoKey
  private sessionKeys = new Map<string, CryptoKey>();

  // Event subscribers
  private listeners: { [K in keyof ProtocolEventMap]?: Array<ProtocolEventMap[K]> } = {};

  // Transports: BitSocial WebSocket RPC + BroadcastChannel mesh
  private ws: WebSocket | null = null;
  private broadcastChannel: BroadcastChannel | null = null;

  constructor(config: BitSocialConfig = {}) {
    this.config = {
      rpcUrl: config.rpcUrl || 'ws://127.0.0.1:9090',
      discoveryTopic: config.discoveryTopic || 'bitsocial:wacko:discovery',
      heartbeatIntervalMs: config.heartbeatIntervalMs || 20000,
      ttlSeconds: config.ttlSeconds || 45
    };
  }

  // -------------------------------------------------------------
  // Event Subscription
  // -------------------------------------------------------------

  on<K extends keyof ProtocolEventMap>(event: K, listener: ProtocolEventMap[K]): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event]!.push(listener);
    return () => this.off(event, listener);
  }

  off<K extends keyof ProtocolEventMap>(event: K, listener: ProtocolEventMap[K]): void {
    const list = this.listeners[event];
    if (list) {
      this.listeners[event] = list.filter((l) => l !== listener) as any;
    }
  }

  private emit<K extends keyof ProtocolEventMap>(
    event: K,
    ...args: Parameters<ProtocolEventMap[K]>
  ): void {
    const list = this.listeners[event];
    if (list) {
      for (const listener of list) {
        try {
          (listener as any)(...args);
        } catch (err) {
          console.error(`Error in BitSocialP2P listener for "${event}":`, err);
        }
      }
    }
  }

  // -------------------------------------------------------------
  // Connect / Login Flow (Entering the Network)
  // -------------------------------------------------------------

  async connect(identity: IdentityKeyBundle, profile: UserProfile): Promise<void> {
    if (this.isConnected) {
      await this.disconnect();
    }

    this.identity = identity;
    this.profile = profile;
    this.isConnected = true;
    this.emit('connection_status', 'connecting');

    // 1. Initialize BroadcastChannel for instant local / cross-tab P2P mingling
    if (typeof BroadcastChannel !== 'undefined') {
      this.broadcastChannel = new BroadcastChannel(this.config.discoveryTopic);
      this.broadcastChannel.onmessage = (event) => this.handleIncomingEnvelope(event.data);
    }

    // 2. Attempt connection to BitSocial RPC daemon if present
    this.tryConnectWebSocketRPC();

    // 3. Immediately broadcast first ephemeral presence ping
    await this.broadcastPresence('ONLINE');

    // 4. Start periodic heartbeat loop
    this.heartbeatTimer = setInterval(async () => {
      if (this.isConnected) {
        await this.broadcastPresence('ONLINE');
      }
    }, this.config.heartbeatIntervalMs);

    // 5. Start peer sweeper loop to prune peers who stopped emitting heartbeats (Non-existing mode)
    this.sweepTimer = setInterval(() => {
      this.sweepInactivePeers();
    }, 5000);

    this.emit('connection_status', 'connected');
  }

  // -------------------------------------------------------------
  // Disconnect / Logout Flow (Completely Non-Existent Mode)
  // -------------------------------------------------------------

  async disconnect(): Promise<void> {
    if (!this.isConnected) return;

    // 1. Send explicit OFFLINE tombstone message so peers prune immediately
    try {
      await this.broadcastPresence('OFFLINE');
    } catch (err) {
      console.warn('Failed to dispatch offline presence:', err);
    }

    // 2. Clear intervals
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.sweepTimer) clearInterval(this.sweepTimer);
    this.heartbeatTimer = null;
    this.sweepTimer = null;

    // 3. Close network channels
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    // 4. Clear in-memory caches
    this.activePeers.clear();
    this.sessionKeys.clear();
    this.identity = null;
    this.profile = null;
    this.isConnected = false;

    this.emit('connection_status', 'disconnected');
  }

  // -------------------------------------------------------------
  // Live Profile & Vibe Update
  // -------------------------------------------------------------

  async updateProfile(updated: Partial<UserProfile>): Promise<void> {
    if (!this.profile) return;
    this.profile = {
      ...this.profile,
      ...updated
    };
    if (this.isConnected) {
      await this.broadcastPresence('ONLINE');
    }
  }

  // -------------------------------------------------------------
  // Ephemeral Presence Broadcasting & Pruning
  // -------------------------------------------------------------

  private async broadcastPresence(status: 'ONLINE' | 'OFFLINE'): Promise<void> {
    if (!this.identity || !this.profile) return;

    const timestamp = Date.now();
    const payloadToSign = JSON.stringify({
      peerId: this.identity.fingerprint,
      pseudonym: this.profile.pseudonym,
      interests: this.profile.interests,
      mood: this.profile.mood,
      avatarCid: this.profile.avatarCid,
      timestamp,
      ttlSeconds: this.config.ttlSeconds,
      status
    });

    const signature = await signPayload(
      this.identity.ecdsaKeyPair.privateKey,
      payloadToSign
    );

    const presenceMessage: EphemeralPeerPresence = {
      peerId: this.identity.fingerprint,
      pseudonym: this.profile.pseudonym,
      interests: this.profile.interests,
      mood: this.profile.mood,
      avatarCid: this.profile.avatarCid,
      timestamp,
      ttlSeconds: this.config.ttlSeconds,
      ecdhPublicKeyJwk: this.identity.ecdhPublicKeyJwk,
      ecdsaPublicKeyJwk: this.identity.ecdsaPublicKeyJwk,
      status,
      signature
    };

    this.publishEnvelope({
      type: 'PRESENCE',
      payload: presenceMessage
    });
  }

  private sweepInactivePeers(): void {
    const now = Date.now();
    for (const [peerId, peer] of this.activePeers.entries()) {
      const expirationMs = peer.ttlSeconds * 1000;
      if (now - peer.lastReceived > expirationMs) {
        this.activePeers.delete(peerId);
        this.sessionKeys.delete(peerId);
        this.emit('peer_left', peerId);
      }
    }
  }

  // -------------------------------------------------------------
  // Matching Signals (Double-Blind Discovery)
  // -------------------------------------------------------------

  async sendMatchSignal(
    type: 'HEART' | 'PASS' | 'ACCEPT',
    targetPeer: EphemeralPeerPresence
  ): Promise<void> {
    if (!this.identity || !this.profile) throw new Error('Not connected');

    const timestamp = Date.now();
    const payloadToSign = JSON.stringify({
      type,
      fromPeerId: this.identity.fingerprint,
      toPeerId: targetPeer.peerId,
      timestamp
    });

    const signature = await signPayload(
      this.identity.ecdsaKeyPair.privateKey,
      payloadToSign
    );

    const signal: MatchSignal = {
      type,
      fromPeerId: this.identity.fingerprint,
      toPeerId: targetPeer.peerId,
      timestamp,
      fromEcdhPublicKeyJwk: this.identity.ecdhPublicKeyJwk,
      fromEcdsaPublicKeyJwk: this.identity.ecdsaPublicKeyJwk,
      profileSummary: {
        pseudonym: this.profile.pseudonym,
        interests: this.profile.interests,
        mood: this.profile.mood
      },
      signature
    };

    this.publishEnvelope({
      type: 'MATCH_SIGNAL',
      payload: signal
    });
  }

  // -------------------------------------------------------------
  // End-to-End Encrypted (E2EE) Direct Messaging
  // -------------------------------------------------------------

  async sendDirectMessage(
    recipientPeerId: string,
    recipientEcdhJwk: JsonWebKey,
    text: string,
    conversationId?: string
  ): Promise<ChatMessage> {
    if (!this.identity) throw new Error('Not connected');

    // 1. Get or derive shared AES-GCM session key via ECDH
    let sessionKey = this.sessionKeys.get(recipientPeerId);
    if (!sessionKey) {
      const derived = await deriveSessionKey(
        this.identity.ecdhKeyPair.privateKey,
        recipientEcdhJwk
      );
      this.sessionKeys.set(recipientPeerId, derived);
      sessionKey = derived;
    }

    // 2. Encrypt message content with AES-GCM
    const { ciphertext, iv } = await encryptDirectMessage(sessionKey, text);
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const timestamp = Date.now();
    const convId = conversationId || [this.identity.fingerprint, recipientPeerId].sort().join('_');

    // 3. Sign the encrypted envelope with sender's ECDSA key for anti-tamper
    const envelopeToSign = `${messageId}:${convId}:${ciphertext}:${iv}:${timestamp}`;
    const signature = await signPayload(
      this.identity.ecdsaKeyPair.privateKey,
      envelopeToSign
    );

    const payload: EncryptedMessagePayload = {
      id: messageId,
      conversationId: convId,
      senderId: this.identity.fingerprint,
      recipientId: recipientPeerId,
      ciphertext,
      iv,
      timestamp,
      signature
    };

    // 4. Dispatch over BitSocial network
    this.publishEnvelope({
      type: 'DIRECT_MESSAGE',
      payload
    });

    return {
      id: messageId,
      conversationId: convId,
      senderId: this.identity.fingerprint,
      recipientId: recipientPeerId,
      text,
      timestamp,
      status: 'sent'
    };
  }

  // -------------------------------------------------------------
  // Envelope Dispatcher & Ingestion
  // -------------------------------------------------------------

  private publishEnvelope(envelope: { type: string; payload: any }): void {
    const raw = JSON.stringify(envelope);

    // 1. BroadcastChannel (inter-tab / local network)
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(raw);
      } catch (err) {
        console.warn('BroadcastChannel publish failed:', err);
      }
    }

    // 2. WebSocket RPC to BitSocial daemon (if connected)
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(
          JSON.stringify({
            jsonrpc: '2.0',
            method: 'bitsocial_publish',
            params: {
              topic: this.config.discoveryTopic,
              data: raw
            }
          })
        );
      } catch (err) {
        console.warn('BitSocial RPC publish failed:', err);
      }
    }
  }

  private async handleIncomingEnvelope(raw: string): Promise<void> {
    if (!this.isConnected || !this.identity) return;

    let envelope: { type: string; payload: any };
    try {
      envelope = JSON.parse(raw);
    } catch {
      return; // Ignore malformed data
    }

    switch (envelope.type) {
      case 'PRESENCE':
        await this.handlePresence(envelope.payload);
        break;
      case 'MATCH_SIGNAL':
        await this.handleMatchSignal(envelope.payload);
        break;
      case 'DIRECT_MESSAGE':
        await this.handleDirectMessage(envelope.payload);
        break;
    }
  }

  private async handlePresence(presence: EphemeralPeerPresence): Promise<void> {
    if (!this.identity || presence.peerId === this.identity.fingerprint) {
      return; // Ignore our own announcements
    }

    // 1. Verify ECDSA signature to prevent spoofing
    const payloadToVerify = JSON.stringify({
      peerId: presence.peerId,
      pseudonym: presence.pseudonym,
      interests: presence.interests,
      mood: presence.mood,
      avatarCid: presence.avatarCid,
      timestamp: presence.timestamp,
      ttlSeconds: presence.ttlSeconds,
      status: presence.status
    });

    const isValid = await verifySignature(
      presence.ecdsaPublicKeyJwk,
      payloadToVerify,
      presence.signature
    );
    if (!isValid) return;

    // 2. If peer is going OFFLINE, prune immediately
    if (presence.status === 'OFFLINE') {
      if (this.activePeers.has(presence.peerId)) {
        this.activePeers.delete(presence.peerId);
        this.sessionKeys.delete(presence.peerId);
        this.emit('peer_left', presence.peerId);
      }
      return;
    }

    // 3. Otherwise add or update active peer
    const isNew = !this.activePeers.has(presence.peerId);
    this.activePeers.set(presence.peerId, {
      ...presence,
      lastReceived: Date.now()
    });

    if (isNew) {
      // Mutual discovery handshake: announce ourselves to the new peer immediately
      this.broadcastPresence('ONLINE').catch(console.warn);
      this.emit('peer_discovered', presence);
    } else {
      this.emit('peer_updated', presence);
    }
  }

  private async handleMatchSignal(signal: MatchSignal): Promise<void> {
    if (!this.identity || signal.toPeerId !== this.identity.fingerprint) {
      return; // Not targeted to us
    }

    // Verify signature
    const payloadToVerify = JSON.stringify({
      type: signal.type,
      fromPeerId: signal.fromPeerId,
      toPeerId: signal.toPeerId,
      timestamp: signal.timestamp
    });

    const isValid = await verifySignature(
      signal.fromEcdsaPublicKeyJwk,
      payloadToVerify,
      signal.signature
    );
    if (!isValid) return;

    this.emit('match_signal_received', signal);
  }

  private async handleDirectMessage(payload: EncryptedMessagePayload): Promise<void> {
    if (!this.identity || payload.recipientId !== this.identity.fingerprint) {
      return; // Not addressed to us
    }

    const peer = this.activePeers.get(payload.senderId);
    if (!peer) {
      // Option A: If peer is not currently online in activePeers, discard or verify
      return;
    }

    // 1. Verify envelope signature
    const envelopeToVerify = `${payload.id}:${payload.conversationId}:${payload.ciphertext}:${payload.iv}:${payload.timestamp}`;
    const isValid = await verifySignature(
      peer.ecdsaPublicKeyJwk,
      envelopeToVerify,
      payload.signature
    );
    if (!isValid) return;

    // 2. Derive session key if not cached
    let sessionKey = this.sessionKeys.get(payload.senderId);
    if (!sessionKey) {
      const derived = await deriveSessionKey(
        this.identity.ecdhKeyPair.privateKey,
        peer.ecdhPublicKeyJwk
      );
      this.sessionKeys.set(payload.senderId, derived);
      sessionKey = derived;
    }

    // 3. Decrypt ciphertext
    let decryptedText: string;
    try {
      decryptedText = await decryptDirectMessage(sessionKey, payload.ciphertext, payload.iv);
    } catch (err) {
      console.warn('Failed to decrypt direct message:', err);
      return;
    }

    const message: ChatMessage = {
      id: payload.id,
      conversationId: payload.conversationId,
      senderId: payload.senderId,
      recipientId: payload.recipientId,
      text: decryptedText,
      timestamp: payload.timestamp,
      status: 'delivered'
    };

    this.emit('message_received', message);
  }

  private tryConnectWebSocketRPC(): void {
    if (typeof WebSocket === 'undefined') return;

    try {
      this.ws = new WebSocket(this.config.rpcUrl);
      this.ws.onopen = () => {
        // Subscribe to BitSocial pubsub discovery topic
        this.ws?.send(
          JSON.stringify({
            jsonrpc: '2.0',
            method: 'bitsocial_subscribe',
            params: { topic: this.config.discoveryTopic }
          })
        );
      };
      this.ws.onmessage = (event) => {
        try {
          const res = JSON.parse(event.data);
          if (res.method === 'bitsocial_message' && res.params?.data) {
            this.handleIncomingEnvelope(res.params.data);
          }
        } catch {
          // ignore
        }
      };
      this.ws.onerror = () => {
        // Quietly failover to BroadcastChannel if local RPC is not running
      };
    } catch {
      // Local fallback
    }
  }

  // -------------------------------------------------------------
  // Getters
  // -------------------------------------------------------------

  getActivePeers(): EphemeralPeerPresence[] {
    return Array.from(this.activePeers.values());
  }

  getActivePeer(peerId: string): EphemeralPeerPresence | undefined {
    return this.activePeers.get(peerId);
  }

  getIsConnected(): boolean {
    return this.isConnected;
  }
}
