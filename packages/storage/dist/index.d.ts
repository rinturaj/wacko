export declare class StorageManager {
    private dbPromise;
    constructor();
    saveUser(user: any, key: CryptoKey): Promise<void>;
    getUser(id: string, key: CryptoKey): Promise<null>;
}
//# sourceMappingURL=index.d.ts.map