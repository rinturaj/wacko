export class MatchingEngine {
    /**
     * Computes a match compatibility score between two profiles (0 - 100)
     */
    static calculateCompatibility(userA, userB) {
        const setA = new Set(userA.interests.map((i) => i.toLowerCase().trim()));
        const setB = new Set(userB.interests.map((i) => i.toLowerCase().trim()));
        const shared = [];
        for (const item of setA) {
            if (setB.has(item)) {
                shared.push(item);
            }
        }
        const totalUnique = new Set([...setA, ...setB]).size;
        const jaccard = totalUnique > 0 ? shared.length / totalUnique : 0;
        // Base score from shared interests (up to 75 points)
        let score = Math.min(Math.round(jaccard * 100 * 1.5), 75);
        const reasons = [];
        if (shared.length > 0) {
            reasons.push(`${shared.length} shared interest${shared.length > 1 ? 's' : ''}`);
        }
        // Mood harmony bonus (up to 25 points)
        if (userA.mood && userB.mood) {
            const moodA = userA.mood.toLowerCase();
            const moodB = userB.mood.toLowerCase();
            if (moodA === moodB) {
                score += 25;
                reasons.push('Vibing on the exact same mood');
            }
            else if ((moodA === 'chill' && moodB === 'curious') ||
                (moodA === 'curious' && moodB === 'chill') ||
                (moodA === 'romantic' && moodB === 'curious')) {
                score += 15;
                reasons.push('Complementary energy');
            }
            else {
                score += 5;
            }
        }
        return {
            score: Math.min(Math.max(score, 10), 100),
            sharedInterests: shared,
            reasons
        };
    }
    /**
     * Vault Size Optimization: Prunes older messages to maintain a lightweight file size.
     * Keeps only the latest `maxMessages` per conversation.
     */
    static pruneVaultMessages(messages, maxMessagesPerContact = 50) {
        const grouped = new Map();
        for (const msg of messages) {
            const convId = msg.conversationId || 'default';
            if (!grouped.has(convId)) {
                grouped.set(convId, []);
            }
            grouped.get(convId).push(msg);
        }
        const keptMessages = [];
        let removedCount = 0;
        for (const [, convMsgs] of grouped) {
            // Sort newest last
            convMsgs.sort((a, b) => a.timestamp - b.timestamp);
            if (convMsgs.length > maxMessagesPerContact) {
                const sliceIndex = convMsgs.length - maxMessagesPerContact;
                removedCount += sliceIndex;
                keptMessages.push(...convMsgs.slice(sliceIndex));
            }
            else {
                keptMessages.push(...convMsgs);
            }
        }
        keptMessages.sort((a, b) => a.timestamp - b.timestamp);
        return {
            prunedMessages: keptMessages,
            removedCount
        };
    }
}
