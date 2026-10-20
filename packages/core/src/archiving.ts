import type { WackoVaultData, ChatMessage } from './models.js';

export interface WackoArchiveBundle {
  vaultId: string;
  createdAt: number;
  periodStart: number;
  periodEnd: number;
  messageCount: number;
  messages: ChatMessage[];
}

export class VaultArchiver {
  /**
   * Splits a vault into an active lightweight vault and an exportable historical archive.
   * Keeps only recent messages in the active vault while bundling older conversations.
   */
  static splitForArchive(
    vault: WackoVaultData,
    olderThanTimestamp: number
  ): { activeVault: WackoVaultData; archiveBundle: WackoArchiveBundle } {
    const activeMessages: ChatMessage[] = [];
    const archivedMessages: ChatMessage[] = [];

    let periodStart = Infinity;
    let periodEnd = 0;

    for (const msg of vault.messages) {
      if (msg.timestamp < olderThanTimestamp) {
        archivedMessages.push(msg);
        if (msg.timestamp < periodStart) periodStart = msg.timestamp;
        if (msg.timestamp > periodEnd) periodEnd = msg.timestamp;
      } else {
        activeMessages.push(msg);
      }
    }

    const archiveBundle: WackoArchiveBundle = {
      vaultId: vault.profile.id,
      createdAt: Date.now(),
      periodStart: periodStart === Infinity ? Date.now() : periodStart,
      periodEnd: periodEnd === 0 ? Date.now() : periodEnd,
      messageCount: archivedMessages.length,
      messages: archivedMessages
    };

    const activeVault: WackoVaultData = {
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
