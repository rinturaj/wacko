import { EncryptedMessage } from '@wacko/core';
export declare class RelayClient {
    relayUrl: string;
    constructor(relayUrl: string);
    send(message: EncryptedMessage): Promise<void>;
    subscribe(userId: string, callback: (msg: EncryptedMessage) => void): void;
}
//# sourceMappingURL=index.d.ts.map