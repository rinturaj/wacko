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
import { UserProfile, EphemeralPeerPresence, MatchSignal, ChatMessage } from '@wacko/core';
import { IdentityKeyBundle } from '@wacko/crypto';
export type ProtocolEventMap = {
    peer_discovered: (peer: EphemeralPeerPresence) => void;
    peer_updated: (peer: EphemeralPeerPresence) => void;
    peer_left: (peerId: string) => void;
    match_signal_received: (signal: MatchSignal) => void;
    message_received: (message: ChatMessage) => void;
    connection_status: (status: 'connected' | 'disconnected' | 'connecting') => void;
};
export interface BitSocialConfig {
    rpcUrl?: string;
    discoveryTopic?: string;
    heartbeatIntervalMs?: number;
    ttlSeconds?: number;
}
export declare class BitSocialP2PClient {
    private config;
    private identity;
    private profile;
    private isConnected;
    private heartbeatTimer;
    private sweepTimer;
    private activePeers;
    private sessionKeys;
    private listeners;
    private ws;
    private broadcastChannel;
    constructor(config?: BitSocialConfig);
    on<K extends keyof ProtocolEventMap>(event: K, listener: ProtocolEventMap[K]): () => void;
    off<K extends keyof ProtocolEventMap>(event: K, listener: ProtocolEventMap[K]): void;
    private emit;
    connect(identity: IdentityKeyBundle, profile: UserProfile): Promise<void>;
    disconnect(): Promise<void>;
    updateProfile(updated: Partial<UserProfile>): Promise<void>;
    private broadcastPresence;
    private sweepInactivePeers;
    sendMatchSignal(type: 'HEART' | 'PASS' | 'ACCEPT', targetPeer: EphemeralPeerPresence): Promise<void>;
    sendDirectMessage(recipientPeerId: string, recipientEcdhJwk: JsonWebKey, text: string, conversationId?: string): Promise<ChatMessage>;
    private publishEnvelope;
    private handleIncomingEnvelope;
    private handlePresence;
    private handleMatchSignal;
    private handleDirectMessage;
    private tryConnectWebSocketRPC;
    getActivePeers(): EphemeralPeerPresence[];
    getActivePeer(peerId: string): EphemeralPeerPresence | undefined;
    getIsConnected(): boolean;
}
//# sourceMappingURL=index.d.ts.map