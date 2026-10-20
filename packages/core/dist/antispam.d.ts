/**
 * BitSocial Anti-Spam & Anti-Bot Challenge Engine
 * Implements pluggable Proof-of-Work (PoW / Hashcash) challenges
 * to protect P2P discovery swarms and stranger messaging from automated spam bots.
 */
export interface AntiSpamChallenge {
    challengeId: string;
    recipientPeerId: string;
    difficulty: number;
    prefix: string;
    timestamp: number;
    expiresAt: number;
}
export interface ChallengeSolution {
    challengeId: string;
    nonce: number;
    hash: string;
    solvedAt: number;
}
export declare class AntiSpamEngine {
    /**
     * Generates a challenge that a stranger must solve before their message/match request is accepted.
     */
    static generateChallenge(recipientPeerId: string, difficulty?: number, validityMs?: number): AntiSpamChallenge;
    /**
     * Fast client-side Proof-of-Work solver.
     * Runs in ~5-25ms on modern devices, negligible for a single user, but eliminates bot mass-spam.
     */
    static solveChallenge(challenge: AntiSpamChallenge): Promise<ChallengeSolution>;
    /**
     * Instant verification of a PoW solution (1 hash check, < 0.1ms).
     */
    static verifySolution(challenge: AntiSpamChallenge, solution: ChallengeSolution): Promise<boolean>;
}
//# sourceMappingURL=antispam.d.ts.map