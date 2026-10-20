import type { ChatMessage } from './models.js';
export interface CompatibilityResult {
    score: number;
    sharedInterests: string[];
    reasons: string[];
}
export declare class MatchingEngine {
    /**
     * Computes a match compatibility score between two profiles (0 - 100)
     */
    static calculateCompatibility(userA: {
        interests: string[];
        mood?: string;
    }, userB: {
        interests: string[];
        mood?: string;
    }): CompatibilityResult;
    /**
     * Vault Size Optimization: Prunes older messages to maintain a lightweight file size.
     * Keeps only the latest `maxMessages` per conversation.
     */
    static pruneVaultMessages(messages: ChatMessage[], maxMessagesPerContact?: number): {
        prunedMessages: ChatMessage[];
        removedCount: number;
    };
}
//# sourceMappingURL=matching.d.ts.map