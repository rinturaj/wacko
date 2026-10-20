export interface UserProfile {
    id: string;
    pseudonym: string;
    age?: number;
    bio?: string;
    interests: string[];
    mood: string;
    avatarCid?: string;
    reputationScore: number;
    createdAt: number;
}
export interface StoredKeyPairJwk {
    ecdh: {
        privateKeyJwk: JsonWebKey;
        publicKeyJwk: JsonWebKey;
    };
    ecdsa: {
        privateKeyJwk: JsonWebKey;
        publicKeyJwk: JsonWebKey;
    };
}
export interface MatchContact {
    id: string;
    peerId: string;
    pseudonym: string;
    interests: string[];
    mood: string;
    avatarCid?: string;
    matchedAt: number;
    lastMessageAt?: number;
    peerEcdhKeyJwk: JsonWebKey;
    peerEcdsaKeyJwk: JsonWebKey;
}
export interface ChatMessage {
    id: string;
    conversationId: string;
    senderId: string;
    recipientId: string;
    text: string;
    timestamp: number;
    mediaCid?: string;
    status?: 'sending' | 'sent' | 'delivered';
}
export interface EncryptedMessagePayload {
    id: string;
    conversationId: string;
    senderId: string;
    recipientId: string;
    ciphertext: string;
    iv: string;
    timestamp: number;
    signature: string;
}
export interface WackoVaultData {
    version: number;
    profile: UserProfile;
    keys: StoredKeyPairJwk;
    matches: MatchContact[];
    messages: ChatMessage[];
    archivedCids?: string[];
    settings: {
        maxMessagesPerContact: number;
        autoPruneInactiveDays: number;
        discoveryTopic: string;
    };
    updatedAt: number;
}
export interface EphemeralPeerPresence {
    peerId: string;
    pseudonym: string;
    interests: string[];
    mood: string;
    avatarCid?: string;
    timestamp: number;
    ttlSeconds: number;
    ecdhPublicKeyJwk: JsonWebKey;
    ecdsaPublicKeyJwk: JsonWebKey;
    status: 'ONLINE' | 'OFFLINE';
    signature: string;
}
export interface MatchSignal {
    type: 'HEART' | 'PASS' | 'ACCEPT';
    fromPeerId: string;
    toPeerId: string;
    timestamp: number;
    fromEcdhPublicKeyJwk: JsonWebKey;
    fromEcdsaPublicKeyJwk: JsonWebKey;
    profileSummary: {
        pseudonym: string;
        interests: string[];
        mood: string;
    };
    signature: string;
}
//# sourceMappingURL=models.d.ts.map