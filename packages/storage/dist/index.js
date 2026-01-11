import { openDB } from 'idb';
export class StorageManager {
    constructor() {
        this.dbPromise = openDB('wacko-db', 1, {
            upgrade(db) {
                db.createObjectStore('users', { keyPath: 'id' });
                const messageStore = db.createObjectStore('messages', { keyPath: 'id' });
                messageStore.createIndex('by-timestamp', 'timestamp');
            },
        });
    }
    async saveUser(user, key) {
        // Encrypt user data here
        // const { ciphertext, iv } = await encryptLocal(key, JSON.stringify(user));
        // await (await this.dbPromise).put('users', { id: user.id, encryptedData: ciphertext, iv });
        console.log('User saved (stub)');
    }
    async getUser(id, key) {
        // const record = await (await this.dbPromise).get('users', id);
        // if (!record) return null;
        // const decrypted = await decryptLocal(key, record.encryptedData, record.iv);
        // return JSON.parse(decrypted);
        return null;
    }
}
