import { BitSocialP2PClient } from './dist/index.js';
import { generateIdentityKeyBundle } from '@wacko/crypto';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runProtocolTests() {
  console.log('========================================================');
  console.log('⚡️ PHASE 2: BITSOCIAL P2P PROTOCOL & GHOST MODE TEST ⚡️');
  console.log('========================================================\n');

  // Generate cryptographic identities for 2 strangers: Alice & Bob
  console.log('[Setup] Generating cryptographic keys for Alice and Bob...');
  const aliceIdentity = await generateIdentityKeyBundle();
  const bobIdentity = await generateIdentityKeyBundle();

  const aliceProfile = {
    id: aliceIdentity.fingerprint,
    pseudonym: 'Alice_Stargazer',
    interests: ['Cyberpunk', 'Late Night Drives', 'Ambient Music'],
    mood: 'Curious',
    reputationScore: 100,
    createdAt: Date.now()
  };

  const bobProfile = {
    id: bobIdentity.fingerprint,
    pseudonym: 'Bob_CyberNomad',
    interests: ['Cyberpunk', 'Ambient Music', 'Philosophy'],
    mood: 'Curious',
    reputationScore: 100,
    createdAt: Date.now()
  };

  // Initialize BitSocial P2P Clients
  // Using short TTL for test speed: 1.5s TTL, 500ms heartbeat
  const testTopic = `bitsocial:wacko:test_${Date.now()}`;
  const aliceClient = new BitSocialP2PClient({
    discoveryTopic: testTopic,
    heartbeatIntervalMs: 600,
    ttlSeconds: 2
  });

  const bobClient = new BitSocialP2PClient({
    discoveryTopic: testTopic,
    heartbeatIntervalMs: 600,
    ttlSeconds: 2
  });

  // TEST 1: Stranger Discovery over BitSocial Swarm
  console.log('\n[Test 1] Real-time Stranger Discovery over BitSocial Topic:');
  let bobDiscoveredAlice = false;
  let aliceDiscoveredBob = false;

  aliceClient.on('peer_discovered', (peer) => {
    if (peer.peerId === bobIdentity.fingerprint) {
      aliceDiscoveredBob = true;
      console.log(`  ✔ Alice discovered stranger: ${peer.pseudonym} (Mood: ${peer.mood})`);
    }
  });

  bobClient.on('peer_discovered', (peer) => {
    if (peer.peerId === aliceIdentity.fingerprint) {
      bobDiscoveredAlice = true;
      console.log(`  ✔ Bob discovered stranger: ${peer.pseudonym} (Mood: ${peer.mood})`);
    }
  });

  await aliceClient.connect(aliceIdentity, aliceProfile);
  await bobClient.connect(bobIdentity, bobProfile);

  // Allow pubsub announcement propagation
  await sleep(400);

  if (bobDiscoveredAlice && aliceDiscoveredBob) {
    console.log('  ✔ PASS: Bi-directional peer discovery over BitSocial swarm succeeded.\n');
  } else {
    throw new Error(`FAIL: Discovery incomplete. AliceFoundBob: ${aliceDiscoveredBob}, BobFoundAlice: ${bobDiscoveredAlice}`);
  }

  // TEST 2: Double-Blind Match Handshake
  console.log('[Test 2] Double-Blind Mutual Match Handshake:');
  let matchEstablished = false;

  bobClient.on('match_signal_received', (signal) => {
    if (signal.type === 'HEART' && signal.fromPeerId === aliceIdentity.fingerprint) {
      console.log(`  ✔ Bob received HEART signal from ${signal.profileSummary.pseudonym}`);
      // Bob reciprocates with ACCEPT
      const alicePeer = bobClient.getActivePeer(aliceIdentity.fingerprint);
      if (alicePeer) {
        bobClient.sendMatchSignal('ACCEPT', alicePeer);
      }
    }
  });

  aliceClient.on('match_signal_received', (signal) => {
    if (signal.type === 'ACCEPT' && signal.fromPeerId === bobIdentity.fingerprint) {
      console.log(`  ✔ Alice received ACCEPT signal from ${signal.profileSummary.pseudonym}`);
      matchEstablished = true;
    }
  });

  const targetBob = aliceClient.getActivePeer(bobIdentity.fingerprint);
  if (!targetBob) throw new Error('Bob not found in Alice active peers');

  await aliceClient.sendMatchSignal('HEART', targetBob);
  await sleep(400);

  if (matchEstablished) {
    console.log('  ✔ PASS: Double-Blind mutual match confirmed.\n');
  } else {
    throw new Error('FAIL: Mutual match could not be established');
  }

  // TEST 3: End-to-End Encrypted (E2EE) Direct Messaging
  console.log('[Test 3] End-to-End Encrypted Direct Messaging over BitSocial:');
  let bobReceivedDecrypted = '';

  bobClient.on('message_received', (msg) => {
    if (msg.senderId === aliceIdentity.fingerprint) {
      bobReceivedDecrypted = msg.text;
      console.log(`  ✔ Bob received & decrypted E2EE message: "${msg.text}"`);
    }
  });

  const secretMessage = 'Hey Bob, checking out the BitSocial dating swarm! 🌌';
  await aliceClient.sendDirectMessage(
    bobIdentity.fingerprint,
    bobIdentity.ecdhPublicKeyJwk,
    secretMessage
  );

  await sleep(400);

  if (bobReceivedDecrypted === secretMessage) {
    console.log('  ✔ PASS: Direct E2EE messaging delivered and verified.\n');
  } else {
    throw new Error(`FAIL: Direct message mismatch. Got "${bobReceivedDecrypted}"`);
  }

  // TEST 4: Option A - "Non-Existing Mode" (Immediate Disconnect / Logout)
  console.log('[Test 4] Option A - Non-Existing Mode on User Logout:');
  let bobObservedAliceLeave = false;

  bobClient.on('peer_left', (peerId) => {
    if (peerId === aliceIdentity.fingerprint) {
      bobObservedAliceLeave = true;
      console.log('  ✔ Bob observed Alice disconnect: Alice completely vanished from active peers.');
    }
  });

  // Alice logs out
  await aliceClient.disconnect();
  await sleep(400);

  const isAliceInBobPeers = !!bobClient.getActivePeer(aliceIdentity.fingerprint);
  if (bobObservedAliceLeave && !isAliceInBobPeers) {
    console.log('  ✔ PASS: Alice immediately ceased to exist on the network upon logout.\n');
  } else {
    throw new Error('FAIL: Alice was not removed upon disconnect');
  }

  // Clean up Bob
  await bobClient.disconnect();

  console.log('========================================================');
  console.log('🎉 ALL PHASE 2 PROTOCOL & GHOST MODE TESTS PASSED!');
  console.log('========================================================');
}

runProtocolTests().catch((err) => {
  console.error('\n❌ PROTOCOL TEST FAILED:', err);
  process.exit(1);
});
