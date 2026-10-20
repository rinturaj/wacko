import {
  MatchingEngine,
  AntiSpamEngine,
  VaultArchiver
} from './dist/index.js';

async function runCoreTests() {
  console.log('====================================================');
  console.log('⚡️ PHASE 3: WACKO CORE ENGINE & ANTI-SPAM TESTS ⚡️');
  console.log('====================================================\n');

  // TEST 1: Matching & Compatibility Scoring
  console.log('[Test 1] Compatibility Scoring Algorithm:');
  const userA = {
    interests: ['Cyberpunk', 'Ambient Music', 'Stargazing', 'Coffee Culture'],
    mood: 'Curious'
  };

  const userB_HighMatch = {
    interests: ['Cyberpunk', 'Ambient Music', 'Late Night Drives'],
    mood: 'Curious'
  };

  const userC_LowMatch = {
    interests: ['Gardening', 'Corporate Finance'],
    mood: 'Wild'
  };

  const scoreHigh = MatchingEngine.calculateCompatibility(userA, userB_HighMatch);
  const scoreLow = MatchingEngine.calculateCompatibility(userA, userC_LowMatch);

  console.log(`  • User A & B Score: ${scoreHigh.score}% (${scoreHigh.reasons.join(', ')})`);
  console.log(`  • User A & C Score: ${scoreLow.score}% (${scoreLow.reasons.join(', ') || 'Low shared vibe'})`);

  if (scoreHigh.score > 60 && scoreLow.score < 30) {
    console.log('  ✔ PASS: Dynamic matching engine distinguishes high and low compatibility.\n');
  } else {
    throw new Error('FAIL: Compatibility calculation unexpected');
  }

  // TEST 2: Message History Rolling Window Pruning
  console.log('[Test 2] Vault Message Rolling Window Pruner:');
  const dummyMessages = Array.from({ length: 85 }, (_, i) => ({
    id: `msg_${i}`,
    conversationId: 'conv_alpha',
    senderId: 'peer_1',
    recipientId: 'peer_2',
    text: `Chat message #${i}`,
    timestamp: 1700000000000 + i * 1000
  }));

  const { prunedMessages, removedCount } = MatchingEngine.pruneVaultMessages(dummyMessages, 50);
  console.log(`  • Original messages: ${dummyMessages.length}`);
  console.log(`  • Retained messages: ${prunedMessages.length}`);
  console.log(`  • Pruned count: ${removedCount}`);

  if (prunedMessages.length === 50 && removedCount === 35) {
    console.log('  ✔ PASS: Correctly kept latest 50 messages and pruned 35 older ones.\n');
  } else {
    throw new Error('FAIL: Message pruning unexpected count');
  }

  // TEST 3: Vault Archiving & Splitting
  console.log('[Test 3] Vault Archiving & Compaction Engine:');
  const sampleVault = {
    version: 1,
    profile: { id: 'peer_alice', pseudonym: 'Alice', interests: [], mood: 'Chill', reputationScore: 100, createdAt: 1700000000000 },
    keys: { ecdh: {}, ecdsa: {} },
    matches: [],
    messages: [
      { id: 'old_1', conversationId: 'c1', senderId: 'p1', recipientId: 'p2', text: 'Old message from 2025', timestamp: 1000 },
      { id: 'old_2', conversationId: 'c1', senderId: 'p1', recipientId: 'p2', text: 'Old message from 2025', timestamp: 2000 },
      { id: 'new_1', conversationId: 'c1', senderId: 'p1', recipientId: 'p2', text: 'Fresh active message', timestamp: 50000 }
    ],
    settings: { maxMessagesPerContact: 50, autoPruneInactiveDays: 7, discoveryTopic: 'test' },
    updatedAt: Date.now()
  };

  const splitResult = VaultArchiver.splitForArchive(sampleVault, 10000);
  console.log(`  • Active vault messages remaining: ${splitResult.activeVault.messages.length}`);
  console.log(`  • Archived messages bundled: ${splitResult.archiveBundle.messageCount}`);

  if (splitResult.activeVault.messages.length === 1 && splitResult.archiveBundle.messageCount === 2) {
    console.log('  ✔ PASS: Vault successfully split into lightweight active vault + archive bundle.\n');
  } else {
    throw new Error('FAIL: Vault archiving split failed');
  }

  // TEST 4: BitSocial Proof-of-Work (PoW) Anti-Spam Challenge
  console.log('[Test 4] BitSocial Anti-Spam Proof-of-Work Challenge:');
  const challenge = AntiSpamEngine.generateChallenge('peer_alice_target', 3);
  console.log(`  • Challenge generated (ID: ${challenge.challengeId}, Difficulty: ${challenge.difficulty} zeros)`);

  const startTime = performance.now();
  const solution = await AntiSpamEngine.solveChallenge(challenge);
  const solveDuration = (performance.now() - startTime).toFixed(1);
  console.log(`  • PoW Solution found in ${solveDuration}ms (Nonce: ${solution.nonce}, Hash: ${solution.hash})`);

  // Verify legitimate solution
  const isValid = await AntiSpamEngine.verifySolution(challenge, solution);
  if (!isValid) throw new Error('FAIL: Legitimate PoW solution failed verification');
  console.log('  ✔ Legitimate solution successfully verified.');

  // Verify forged solution rejection
  const forgedSolution = { ...solution, nonce: solution.nonce + 999 };
  const isForgedValid = await AntiSpamEngine.verifySolution(challenge, forgedSolution);
  if (isForgedValid) throw new Error('FAIL: Forged solution was accepted!');
  console.log('  ✔ Forged solution successfully rejected.');

  console.log('  ✔ PASS: Anti-Spam Proof-of-Work shield fully validated.\n');

  console.log('====================================================');
  console.log('🎉 ALL PHASE 3 CORE ENGINE REQUIREMENTS VERIFIED!');
  console.log('====================================================');
}

runCoreTests().catch((err) => {
  console.error('\n❌ CORE TEST FAILED:', err);
  process.exit(1);
});
