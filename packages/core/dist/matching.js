export class MatchingEngine {
    findMatches(user, candidates) {
        // Simple intersection-based matching for now
        return candidates.filter(candidate => {
            if (candidate.id === user.id)
                return false;
            const shared = user.interests.filter(i => candidate.interests.includes(i));
            return shared.length > 0;
        });
    }
    calculateCompatibility(userA, userB) {
        const shared = userA.interests.filter(i => userB.interests.includes(i));
        return shared.length;
    }
}
