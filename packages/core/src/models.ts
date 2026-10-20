export interface UserProfile {
  id: string; // Public Key Fingerprint
  pseudonym: string;
  age?: number;
  bio?: string;
  interests: string[];
  mood: string;
  avatarCid?: string; // IPFS CID for avatar if uploaded, never raw base64
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
  id: string; // Match / Conversation ID
  peerId: string; // Peer's public fingerprint
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
  mediaCid?: string; // IPFS Content ID for encrypted media
  status?: 'sending' | 'sent' | 'delivered';
}

export interface EncryptedMessagePayload {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  ciphertext: string; // Base64 AES-GCM ciphertext
  iv: string; // Base64 IV
  timestamp: number;
  signature: string; // Signed by sender's ECDSA key
}

export interface WackoVaultData {
  version: number;
  profile: UserProfile;
  keys: StoredKeyPairJwk;
  matches: MatchContact[];
  messages: ChatMessage[];
  archivedCids?: string[]; // CIDs of older historical bundles pinned to IPFS
  settings: {
    maxMessagesPerContact: number; // Rolling window (default 50)
    autoPruneInactiveDays: number; // 7 days default
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
  ttlSeconds: number; // e.g., 45
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
