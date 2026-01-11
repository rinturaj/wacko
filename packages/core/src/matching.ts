import { UserProfile } from './models';

export class MatchingEngine {
  findMatches(user: UserProfile, candidates: UserProfile[]): UserProfile[] {
    // Simple intersection-based matching for now
    return candidates.filter(candidate => {
      if (candidate.id === user.id) return false;
      const shared = user.interests.filter(i => candidate.interests.includes(i));
      return shared.length > 0;
    });
  }

  calculateCompatibility(userA: UserProfile, userB: UserProfile): number {
    const shared = userA.interests.filter(i => userB.interests.includes(i));
    return shared.length;
  }
}
