export interface UserProfile {
    id: string;
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
    ciphertext: string;
    iv: string;
    timestamp: number;
}
//# sourceMappingURL=models.d.ts.map