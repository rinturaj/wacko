export class VaultArchiver {
    /**
     * Splits a vault into an active lightweight vault and an exportable historical archive.
     * Keeps only recent messages in the active vault while bundling older conversations.
     */
    static splitForArchive(vault, olderThanTimestamp) {
        const activeMessages = [];
        const archivedMessages = [];
        let periodStart = Infinity;
        let periodEnd = 0;
        for (const msg of vault.messages) {
            if (msg.timestamp < olderThanTimestamp) {
                archivedMessages.push(msg);
                if (msg.timestamp < periodStart)
                    periodStart = msg.timestamp;
                if (msg.timestamp > periodEnd)
                    periodEnd = msg.timestamp;
            }
            else {
                activeMessages.push(msg);
            }
        }
        const archiveBundle = {
            vaultId: vault.profile.id,
            createdAt: Date.now(),
            periodStart: periodStart === Infinity ? Date.now() : periodStart,
            periodEnd: periodEnd === 0 ? Date.now() : periodEnd,
            messageCount: archivedMessages.length,
            messages: archivedMessages
        };
        const activeVault = {
            ...vault,
            messages: activeMessages,
            updatedAt: Date.now()
        };
        return {
            activeVault,
            archiveBundle
        };
    }
}
