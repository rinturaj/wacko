import type { WackoVaultData, ChatMessage } from './models.js';
export interface WackoArchiveBundle {
    vaultId: string;
    createdAt: number;
    periodStart: number;
    periodEnd: number;
    messageCount: number;
    messages: ChatMessage[];
}
export declare class VaultArchiver {
    /**
     * Splits a vault into an active lightweight vault and an exportable historical archive.
     * Keeps only recent messages in the active vault while bundling older conversations.
     */
    static splitForArchive(vault: WackoVaultData, olderThanTimestamp: number): {
        activeVault: WackoVaultData;
        archiveBundle: WackoArchiveBundle;
    };
}
//# sourceMappingURL=archiving.d.ts.map