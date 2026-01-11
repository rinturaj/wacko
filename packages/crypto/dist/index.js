export class CryptoManager {
    static async generateKeyPair() {
        return window.crypto.subtle.generateKey({
            name: "RSA-OAEP",
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256"
        }, true, ["encrypt", "decrypt"]);
    }
    static async encrypt(publicKey, data) {
        const encoder = new TextEncoder();
        const encodedData = encoder.encode(data);
        // RSA-OAEP doesn't use IV but we'll include structure for symmetric upgrades later if needed
        // or if we switch to AES-GCM for messaging.
        // For now, let's assume we use AES-GCM for messages and RSA for key exchange.
        // Actually, for direct message encryption in this mvp context:
        // We typically generate a session key (AES), encrypt that with RSA, and encrypt data with AES.
        // simplified for MVP: RSA for everything (slow but simple) or just AES-GCM with shared secret?
        // Let's stick to a simple AES-GCM mostly for messages.
        // Re-evaluating: "Encrypt before storage" and "End-to-end encrypted chat"
        // We need both.
        // Let's provide a generic AES-GCM encryptor for local storage first.
        return { ciphertext: "TODO", iv: "TODO" };
    }
    static async exportKey(key) {
        return await window.crypto.subtle.exportKey("jwk", key);
    }
}
export async function generateLocalKey() {
    return window.crypto.subtle.generateKey({
        name: "AES-GCM",
        length: 256
    }, true, ["encrypt", "decrypt"]);
}
export async function encryptLocal(key, data) {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const ciphertext = await window.crypto.subtle.encrypt({
        name: "AES-GCM",
        iv: iv
    }, key, encoder.encode(data));
    return { ciphertext, iv };
}
export async function decryptLocal(key, ciphertext, iv) {
    const decrypted = await window.crypto.subtle.decrypt({
        name: "AES-GCM",
        iv: iv
    }, key, ciphertext);
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
}
