export interface UserProfile {
  id: string; // Public Key Fingerprint
  pseudonym: string;
  interests: string[];
  mood: string;
  reputationScore: number;
}

export interface Match {
  id: string;
  peerId: string;
  timestamp: number;
  sharedInterests: string[];
}

export interface EncryptedMessage {
  id: string;
  senderId: string;
  ciphertext: string; // Base64
  iv: string; // Base64
  timestamp: number;
}
