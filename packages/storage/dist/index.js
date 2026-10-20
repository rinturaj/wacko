/**
 * @wacko/storage
 * Encrypted IndexedDB persistence layer.
 * Stores AES-256-GCM encrypted .wacko vault files locally in the browser,
 * allowing instant 1-click loading on return visits without compromising security.
 */
import { openDB } from 'idb';
const DB_NAME = 'wacko-encrypted-storage';
const DB_VERSION = 1;
export class StorageManager {
    constructor() {
        this.dbPromise = null;
    }
    getDB() {
        if (!this.dbPromise) {
            if (typeof indexedDB === 'undefined') {
                throw new Error('IndexedDB is not supported in this environment');
            }
            this.dbPromise = openDB(DB_NAME, DB_VERSION, {
                upgrade(db) {
                    const vaultStore = db.createObjectStore('vaults', { keyPath: 'fileHash' });
                    vaultStore.createIndex('by-savedAt', 'savedAt');
                    db.createObjectStore('meta');
                }
            });
        }
        return this.dbPromise;
    }
    /**
     * Saves an encrypted .wacko binary buffer to browser IndexedDB.
     */
    async saveEncryptedVault(fileBuffer, fileHash, pseudonymHint = 'Anonymous Stranger') {
        const db = await this.getDB();
        const record = {
            fileHash,
            fileBuffer,
            pseudonymHint,
            savedAt: Date.now(),
            byteLength: fileBuffer.byteLength
        };
        const tx = db.transaction(['vaults', 'meta'], 'readwrite');
        await tx.objectStore('vaults').put(record);
        await tx.objectStore('meta').put(fileHash, 'latest_vault_hash');
        await tx.done;
    }
    /**
     * Retrieves the most recently saved encrypted vault from IndexedDB.
     */
    async getLatestEncryptedVault() {
        try {
            const db = await this.getDB();
            const latestHash = await db.get('meta', 'latest_vault_hash');
            if (latestHash) {
                const record = await db.get('vaults', latestHash);
                if (record)
                    return record;
            }
            // Fallback: query newest by index
            const all = await db.getAllFromIndex('vaults', 'by-savedAt');
            return all.length > 0 ? all[all.length - 1] : null;
        }
        catch (err) {
            console.warn('Could not read from IndexedDB:', err);
            return null;
        }
    }
    /**
     * Lists all encrypted vaults stored in this browser.
     */
    async getAllEncryptedVaults() {
        try {
            const db = await this.getDB();
            return await db.getAllFromIndex('vaults', 'by-savedAt');
        }
        catch (err) {
            console.warn('Could not list vaults from IndexedDB:', err);
            return [];
        }
    }
    /**
     * Deletes a specific saved vault from IndexedDB.
     */
    async deleteEncryptedVault(fileHash) {
        const db = await this.getDB();
        const tx = db.transaction(['vaults', 'meta'], 'readwrite');
        await tx.objectStore('vaults').delete(fileHash);
        const latestHash = await tx.objectStore('meta').get('latest_vault_hash');
        if (latestHash === fileHash) {
            await tx.objectStore('meta').delete('latest_vault_hash');
        }
        await tx.done;
    }
    /**
     * Clears all encrypted vaults stored in the browser.
     */
    async clearAll() {
        const db = await this.getDB();
        const tx = db.transaction(['vaults', 'meta'], 'readwrite');
        await tx.objectStore('vaults').clear();
        await tx.objectStore('meta').clear();
        await tx.done;
    }
}
export const storageManager = new StorageManager();
