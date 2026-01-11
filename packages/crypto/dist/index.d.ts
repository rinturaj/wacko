export declare class CryptoManager {
    static generateKeyPair(): Promise<CryptoKeyPair>;
    static encrypt(publicKey: CryptoKey, data: string): Promise<{
        ciphertext: string;
        iv: string;
    }>;
    static exportKey(key: CryptoKey): Promise<JsonWebKey>;
}
export declare function generateLocalKey(): Promise<CryptoKey>;
export declare function encryptLocal(key: CryptoKey, data: string): Promise<{
    ciphertext: ArrayBuffer;
    iv: Uint8Array;
}>;
export declare function decryptLocal(key: CryptoKey, ciphertext: ArrayBuffer, iv: Uint8Array): Promise<string>;
//# sourceMappingURL=index.d.ts.map