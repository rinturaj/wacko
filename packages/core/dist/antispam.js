/**
 * BitSocial Anti-Spam & Anti-Bot Challenge Engine
 * Implements pluggable Proof-of-Work (PoW / Hashcash) challenges
 * to protect P2P discovery swarms and stranger messaging from automated spam bots.
 */
export class AntiSpamEngine {
    /**
     * Generates a challenge that a stranger must solve before their message/match request is accepted.
     */
    static generateChallenge(recipientPeerId, difficulty = 3, validityMs = 60000) {
        const timestamp = Date.now();
        const prefix = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
        return {
            challengeId: `pow_${timestamp}_${Math.random().toString(36).slice(2, 8)}`,
            recipientPeerId,
            difficulty,
            prefix,
            timestamp,
            expiresAt: timestamp + validityMs
        };
    }
    /**
     * Fast client-side Proof-of-Work solver.
     * Runs in ~5-25ms on modern devices, negligible for a single user, but eliminates bot mass-spam.
     */
    static async solveChallenge(challenge) {
        const targetPrefix = '0'.repeat(challenge.difficulty);
        let nonce = 0;
        const encoder = new TextEncoder();
        // Fast SHA-256 loop
        while (true) {
            const candidateStr = `${challenge.prefix}:${challenge.recipientPeerId}:${nonce}`;
            const buffer = encoder.encode(candidateStr);
            // Use subtle crypto if available, or fast bitwise hash
            const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', buffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
            if (hashHex.startsWith(targetPrefix)) {
                return {
                    challengeId: challenge.challengeId,
                    nonce,
                    hash: hashHex,
                    solvedAt: Date.now()
                };
            }
            nonce++;
            // Safety limit
            if (nonce > 500000) {
                throw new Error('PoW difficulty exceeded maximum search space');
            }
        }
    }
    /**
     * Instant verification of a PoW solution (1 hash check, < 0.1ms).
     */
    static async verifySolution(challenge, solution) {
        // 1. Verify expiration
        if (Date.now() > challenge.expiresAt) {
            return false;
        }
        if (challenge.challengeId !== solution.challengeId) {
            return false;
        }
        // 2. Check difficulty requirement
        const targetPrefix = '0'.repeat(challenge.difficulty);
        if (!solution.hash.startsWith(targetPrefix)) {
            return false;
        }
        // 3. Re-compute hash and verify match
        const candidateStr = `${challenge.prefix}:${challenge.recipientPeerId}:${solution.nonce}`;
        const buffer = new TextEncoder().encode(candidateStr);
        const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const computedHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
        return computedHash === solution.hash;
    }
}
