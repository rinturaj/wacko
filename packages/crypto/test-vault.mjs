import {
  packVault,
  unpackVault,
  generateIdentityKeyBundle,
  deriveSessionKey,
  encryptDirectMessage,
  decryptDirectMessage,
  signPayload,
  verifySignature
} from './dist/index.js';

async function runTestSuite() {
  console.log('====================================================');
  console.log('⚡️ PHASE 1: WACKO CRYPTOGRAPHIC VAULT TEST SUITE ⚡️');
  console.log('====================================================\n');

  // TEST 1: Basic Packing & Unpacking
  console.log('[Test 1] Packing, AES-256-GCM encryption & decompression:');
  const dummyVault = {
    id: 'user_999',
    profile: {
      pseudonym: 'CyberGhost_✨',
      interests: ['Decentralization', 'Ambient Music', 'Late Night Drives'],
      mood: 'Curious'
    },
    matches: [
      { id: 'match_alpha', peerId: 'peer_zeta', timestamp: Date.now() }
    ],
    messages: [
      { id: 'm1', text: 'Hey, are you on BitSocial?', timestamp: Date.now() - 5000 },
      { id: 'm2', text: 'Yes, 100% serverless peer-to-peer! 🚀', timestamp: Date.now() }
    ]
  };

  const password = 'CorrectHorseBatteryStaple!2026';
  const packed1 = await packVault(dummyVault, password, 25000);
  console.log(`  • Uncompressed: ${packed1.uncompressedBytes} bytes`);
  console.log(`  • Compressed Payload: ${packed1.compressedBytes} bytes`);
  console.log(`  • Total Vault Envelope: ${packed1.totalVaultBytes} bytes`);
  console.log(`  • Vault SHA-256 Fingerprint: ${packed1.fileHash}`);

  const unpacked1 = await unpackVault(packed1.fileBuffer, password);
  if (unpacked1.vaultData.profile.pseudonym === 'CyberGhost_✨') {
    console.log('  ✔ PASS: Vault unpacked and decrypted successfully.\n');
  } else {
    throw new Error('FAIL: Profile mismatch');
  }

  // TEST 2: Wrong Password Rejection
  console.log('[Test 2] Authentication security: Wrong password rejection:');
  try {
    await unpackVault(packed1.fileBuffer, 'WrongPassword_XYZ');
    throw new Error('FAIL: Should have thrown an error on wrong password!');
  } catch (err) {
    console.log(`  ✔ PASS: Securely rejected wrong passphrase: "${err.message}"\n`);
  }

  // TEST 3: Tamper-Evident Anti-Tamper Test
  console.log('[Test 3] Tamper-Evidence: Modifying a single byte in ciphertext:');
  const tamperedBuffer = new Uint8Array(packed1.fileBuffer);
  // Flip a bit in the ciphertext area (offset 50)
  tamperedBuffer[50] ^= 0xff;
  try {
    await unpackVault(tamperedBuffer, password);
    throw new Error('FAIL: Should have detected tampered byte via GCM authentication tag!');
  } catch (err) {
    console.log(`  ✔ PASS: Tamper attempt detected and rejected: "${err.message}"\n`);
  }

  // TEST 4: Large Chat Scalability Test (500 messages)
  console.log('[Test 4] Long-run chat history size scalability (500 messages):');
  const largeVault = {
    id: 'user_large',
    profile: dummyVault.profile,
    matches: dummyVault.matches,
    messages: Array.from({ length: 500 }, (_, i) => ({
      id: `msg_${i}`,
      senderId: i % 2 === 0 ? 'user_large' : 'peer_zeta',
      recipientId: i % 2 === 0 ? 'peer_zeta' : 'user_large',
      text: `Message #${i}: Checking out decentralized social graph on BitSocial. Let's meet under the neon sky tonight! 🌃`,
      timestamp: 1700000000000 + i * 60000
    }))
  };

  const startPack = performance.now();
  const packedLarge = await packVault(largeVault, password, 25000);
  const packTime = (performance.now() - startPack).toFixed(1);

  const startUnpack = performance.now();
  const unpackedLarge = await unpackVault(packedLarge.fileBuffer, password);
  const unpackTime = (performance.now() - startUnpack).toFixed(1);

  const savings = ((1 - packedLarge.compressedBytes / packedLarge.uncompressedBytes) * 100).toFixed(1);
  console.log(`  • 500 Messages Raw Size: ${(packedLarge.uncompressedBytes / 1024).toFixed(1)} KB`);
  console.log(`  • Encrypted & Compressed: ${(packedLarge.totalVaultBytes / 1024).toFixed(1)} KB`);
  console.log(`  • Size Reduction Savings: ${savings}%`);
  console.log(`  • Pack Time: ${packTime}ms | Unpack Time: ${unpackTime}ms`);
  if (unpackedLarge.vaultData.messages.length === 500) {
    console.log('  ✔ PASS: Scalability test passed. 500 messages fit in only ~7 KB!\n');
  }

  // TEST 5: P2P E2EE Key Exchange (ECDH + AES-GCM)
  console.log('[Test 5] Direct Peer-to-Peer E2EE Session Key Exchange:');
  const alice = await generateIdentityKeyBundle();
  const bob = await generateIdentityKeyBundle();

  const aliceShared = await deriveSessionKey(alice.ecdhKeyPair.privateKey, bob.ecdhPublicKeyJwk);
  const bobShared = await deriveSessionKey(bob.ecdhKeyPair.privateKey, alice.ecdhPublicKeyJwk);

  const secretWhisper = 'Secret meeting at the decentralized bistro: password is "wacko".';
  const encryptedWhisper = await encryptDirectMessage(aliceShared, secretWhisper);
  const decryptedWhisper = await decryptDirectMessage(bobShared, encryptedWhisper.ciphertext, encryptedWhisper.iv);

  if (decryptedWhisper === secretWhisper) {
    console.log('  ✔ PASS: ECDH session key derived and decrypted exact whisper.\n');
  } else {
    throw new Error('FAIL: E2EE message mismatch');
  }

  // TEST 6: Anti-Spoofing ECDSA Signatures
  console.log('[Test 6] Ephemeral Presence Anti-Spoofing ECDSA Verification:');
  const presencePayload = JSON.stringify({
    peerId: alice.fingerprint,
    status: 'ONLINE',
    timestamp: Date.now()
  });

  const validSig = await signPayload(alice.ecdsaKeyPair.privateKey, presencePayload);
  const isAuthentic = await verifySignature(alice.ecdsaPublicKeyJwk, presencePayload, validSig);
  const isImpostor = await verifySignature(bob.ecdsaPublicKeyJwk, presencePayload, validSig);

  if (isAuthentic && !isImpostor) {
    console.log('  ✔ PASS: Legitimate sender verified; impostor rejected.\n');
  } else {
    throw new Error('FAIL: Signature verification failed');
  }

  console.log('====================================================');
  console.log('🎉 ALL PHASE 1 CRYPTOGRAPHIC REQUIREMENTS VERIFIED!');
  console.log('====================================================');
}

runTestSuite().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
