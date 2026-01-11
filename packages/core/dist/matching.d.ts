import { UserProfile } from './models';
export declare class MatchingEngine {
    findMatches(user: UserProfile, candidates: UserProfile[]): UserProfile[];
    calculateCompatibility(userA: UserProfile, userB: UserProfile): number;
}
//# sourceMappingURL=matching.d.ts.map