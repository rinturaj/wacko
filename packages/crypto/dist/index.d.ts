/**
 * @wacko/crypto
 * Cryptographic engine for Wacko:
 * - PBKDF2 (600,000 iterations) + AES-256-GCM encrypted vault packaging
 * - Native Gzip/Deflate compression pipeline (CompressionStream) for 80%+ file size reduction
 * - ECDH (P-256) for zero-server P2P End-to-End Encrypted (E2EE) session key exchange
 * - ECDSA (P-256) for signed ephemeral heartbeats & anti-spoofing
 */
export interface PackedVaultResult {
    fileBuffer: Uint8Array;
    fileHash: string;
    uncompressedBytes: number;
    compressedBytes: number;
    totalVaultBytes: number;
}
export interface UnpackedVaultResult<T = any> {
    vaultData: T;
    fileHash: string;
    version: number;
}
export declare function compressData(data: Uint8Array): Promise<Uint8Array>;
export declare function decompressData(data: Uint8Array): Promise<Uint8Array>;
export declare function deriveKeyFromPassword(password: string, salt: Uint8Array, iterations?: number): Promise<CryptoKey>;
/**
 * Packs user data into a compressed, AES-256-GCM encrypted binary vault file.
 * Format:
 * [0..3]   MAGIC "WACK"
 * [4..5]   VERSION (uint16 big-endian)
 * [6..9]   ITERATIONS / 1000 (uint32 big-endian)
 * [10..25] SALT (16 bytes)
 * [26..37] IV (12 bytes)
 * [38..]   AES-256-GCM Ciphertext (includes 16-byte auth tag)
 */
export declare function packVault(vaultData: object, passphrase: string, iterations?: number): Promise<PackedVaultResult>;
/**
 * Unpacks and decrypts the .wacko vault file using the user's passphrase.
 */
export declare function unpackVault<T = any>(fileBuffer: Uint8Array, passphrase: string): Promise<UnpackedVaultResult<T>>;
export interface IdentityKeyBundle {
    ecdhKeyPair: CryptoKeyPair;
    ecdhPublicKeyJwk: JsonWebKey;
    ecdsaKeyPair: CryptoKeyPair;
    ecdsaPublicKeyJwk: JsonWebKey;
    fingerprint: string;
}
export declare function generateIdentityKeyBundle(): Promise<IdentityKeyBundle>;
export declare function deriveSessionKey(myPrivateKey: CryptoKey, peerPublicKeyJwk: JsonWebKey): Promise<CryptoKey>;
export declare function encryptDirectMessage(sessionKey: CryptoKey, messageText: string): Promise<{
    ciphertext: string;
    iv: string;
}>;
export declare function decryptDirectMessage(sessionKey: CryptoKey, ciphertextBase64: string, ivBase64: string): Promise<string>;
export declare function signPayload(privateKey: CryptoKey, payloadString: string): Promise<string>;
export declare function verifySignature(publicKeyJwk: JsonWebKey, payloadString: string, signatureBase64: string): Promise<boolean>;
//# sourceMappingURL=index.d.ts.map