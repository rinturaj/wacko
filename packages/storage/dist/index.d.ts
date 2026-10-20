/**
 * @wacko/storage
 * Encrypted IndexedDB persistence layer.
 * Stores AES-256-GCM encrypted .wacko vault files locally in the browser,
 * allowing instant 1-click loading on return visits without compromising security.
 */
export interface WackoVaultRecord {
    fileHash: string;
    fileBuffer: Uint8Array;
    pseudonymHint: string;
    savedAt: number;
    byteLength: number;
}
export declare class StorageManager {
    private dbPromise;
    private getDB;
    /**
     * Saves an encrypted .wacko binary buffer to browser IndexedDB.
     */
    saveEncryptedVault(fileBuffer: Uint8Array, fileHash: string, pseudonymHint?: string): Promise<void>;
    /**
     * Retrieves the most recently saved encrypted vault from IndexedDB.
     */
    getLatestEncryptedVault(): Promise<WackoVaultRecord | null>;
    /**
     * Lists all encrypted vaults stored in this browser.
     */
    getAllEncryptedVaults(): Promise<WackoVaultRecord[]>;
    /**
     * Deletes a specific saved vault from IndexedDB.
     */
    deleteEncryptedVault(fileHash: string): Promise<void>;
    /**
     * Clears all encrypted vaults stored in the browser.
     */
    clearAll(): Promise<void>;
}
export declare const storageManager: StorageManager;
//# sourceMappingURL=index.d.ts.map