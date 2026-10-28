/**
 * Wacko Svelte 5 Reactive Store
 * Manages decrypted memory state, BitSocial P2P client, and vault file operations.
 */

import type {
  UserProfile,
  WackoVaultData,
  MatchContact,
  ChatMessage,
  EphemeralPeerPresence,
  MatchSignal,
  CompatibilityResult
} from '@wacko/core';
import { MatchingEngine, AntiSpamEngine, VaultArchiver } from '@wacko/core';
import type {
  IdentityKeyBundle,
  PackedVaultResult
} from '@wacko/crypto';
import {
  generateIdentityKeyBundle,
  packVault,
  unpackVault
} from '@wacko/crypto';
import { BitSocialP2PClient } from '@wacko/protocol';
import type { WackoVaultRecord } from '@wacko/storage';
import { storageManager } from '@wacko/storage';

export interface PeerWithScore extends EphemeralPeerPresence {
  compatibility: CompatibilityResult;
}

class WackoStateManager {
  // Session State
  isLoggedIn = $state(false);
  isConnecting = $state(false);
  p2pStatus = $state<'connected' | 'disconnected' | 'connecting'>('disconnected');

  // Vault data in memory
  vault = $state<WackoVaultData | null>(null);
  activePassphrase = $state<string>('');
  currentFileHash = $state<string>('');
  lastPackedStats = $state<{
    uncompressedBytes: number;
    compressedBytes: number;
    totalVaultBytes: number;
    savingsPercent: number;
  } | null>(null);

  // Active P2P Client
  p2pClient: BitSocialP2PClient;
  identityBundle: IdentityKeyBundle | null = null;

  // Discovery & Match Celebration
  discoveredPeers = $state<PeerWithScore[]>([]);
  sentLikes = $state<Set<string>>(new Set());
  newMatchCelebration = $state<MatchContact | null>(null);
  isSolvingPoW = $state(false);

  // Chat State
  activeConversationId = $state<string | null>(null);
  unreadCounts = $state<Record<string, number>>({});

  // Browser IndexedDB Stored Vault
  savedVaultRecord = $state<WackoVaultRecord | null>(null);

  constructor() {
    const relayRpcUrl =
      (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_BITSOCIAL_RPC_URL) ||
      undefined;
    this.p2pClient = new BitSocialP2PClient(relayRpcUrl ? { rpcUrl: relayRpcUrl } : {});
    this.setupProtocolListeners();

    // Check if an encrypted vault was stored in IndexedDB from a previous session
    this.checkSavedVault();

    // Listen to tab close / unload to broadcast immediate goodbye (non-existing mode)
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        if (this.isLoggedIn) {
          this.p2pClient.disconnect();
        }
      });
    }
  }

  async checkSavedVault(): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      this.savedVaultRecord = await storageManager.getLatestEncryptedVault();
    } catch (err) {
      console.warn('Could not check saved vault in IndexedDB:', err);
    }
  }

  private setupProtocolListeners() {
    this.p2pClient.on('connection_status', (status) => {
      this.p2pStatus = status;
      this.isConnecting = status === 'connecting';
    });

    this.p2pClient.on('peer_discovered', (peer) => {
      this.addOrUpdatePeer(peer);
    });

    this.p2pClient.on('peer_updated', (peer) => {
      this.addOrUpdatePeer(peer);
    });

    this.p2pClient.on('peer_left', (peerId) => {
      this.discoveredPeers = this.discoveredPeers.filter((p) => p.peerId !== peerId);
    });

    this.p2pClient.on('match_signal_received', (signal) => {
      this.handleMatchSignal(signal);
    });

    this.p2pClient.on('message_received', (message) => {
      this.handleIncomingMessage(message);
    });
  }

  private addOrUpdatePeer(peer: EphemeralPeerPresence) {
    if (!this.vault) return;
    if (peer.peerId === this.vault.profile.id) return;

    // Check if already in matches
    const isAlreadyMatched = this.vault.matches.some((m) => m.peerId === peer.peerId);
    if (isAlreadyMatched) return;

    const compatibility = MatchingEngine.calculateCompatibility(
      this.vault.profile,
      peer
    );

    const peerWithScore: PeerWithScore = {
      ...peer,
      compatibility
    };

    const index = this.discoveredPeers.findIndex((p) => p.peerId === peer.peerId);
    if (index >= 0) {
      this.discoveredPeers[index] = peerWithScore;
    } else {
      this.discoveredPeers = [...this.discoveredPeers, peerWithScore].sort(
        (a, b) => b.compatibility.score - a.compatibility.score
      );
    }
  }

  private handleMatchSignal(signal: MatchSignal) {
    if (!this.vault) return;

    if (signal.type === 'HEART' || signal.type === 'ACCEPT') {
      // Check if we liked them or if this completes a mutual match
      const alreadyMatched = this.vault.matches.some((m) => m.peerId === signal.fromPeerId);
      if (!alreadyMatched) {
        const newMatch: MatchContact = {
          id: [this.vault.profile.id, signal.fromPeerId].sort().join('_'),
          peerId: signal.fromPeerId,
          pseudonym: signal.profileSummary.pseudonym,
          interests: signal.profileSummary.interests,
          mood: signal.profileSummary.mood,
          matchedAt: signal.timestamp,
          peerEcdhKeyJwk: signal.fromEcdhPublicKeyJwk,
          peerEcdsaKeyJwk: signal.fromEcdsaPublicKeyJwk
        };

        this.vault.matches = [newMatch, ...this.vault.matches];

        // Trigger celebratory celebration modal
        this.newMatchCelebration = newMatch;

        // Remove from stranger discovery deck
        this.discoveredPeers = this.discoveredPeers.filter((p) => p.peerId !== signal.fromPeerId);

        // If we haven't sent back ACCEPT yet, send it
        if (!this.sentLikes.has(signal.fromPeerId)) {
          const peer = this.p2pClient.getActivePeer(signal.fromPeerId);
          if (peer) {
            this.p2pClient.sendMatchSignal('ACCEPT', peer).catch(console.error);
          }
        }
      }
    }
  }

  private handleIncomingMessage(message: ChatMessage) {
    if (!this.vault) return;

    // Append to message list
    this.vault.messages = [...this.vault.messages, message];

    // Update match timestamp
    const matchIndex = this.vault.matches.findIndex((m) => m.id === message.conversationId);
    if (matchIndex >= 0) {
      this.vault.matches[matchIndex].lastMessageAt = message.timestamp;
    }

    // Increment unread count if not currently viewing this conversation
    if (this.activeConversationId !== message.conversationId) {
      this.unreadCounts[message.conversationId] =
        (this.unreadCounts[message.conversationId] || 0) + 1;
    }
  }

  // -------------------------------------------------------------
  // Sign Up Flow
  // -------------------------------------------------------------

  async signup(
    pseudonym: string,
    mood: string,
    interests: string[],
    passphrase: string
  ): Promise<PackedVaultResult> {
    this.isConnecting = true;

    // 1. Generate cryptographic keys
    const identityBundle = await generateIdentityKeyBundle();
    this.identityBundle = identityBundle;

    // Export private keys to JWK to store inside the encrypted vault
    const ecdhPrivJwk = await window.crypto.subtle.exportKey(
      'jwk',
      identityBundle.ecdhKeyPair.privateKey
    );
    const ecdsaPrivJwk = await window.crypto.subtle.exportKey(
      'jwk',
      identityBundle.ecdsaKeyPair.privateKey
    );

    const userProfile: UserProfile = {
      id: identityBundle.fingerprint,
      pseudonym: pseudonym.trim() || 'Anonymous Stranger',
      interests,
      mood,
      reputationScore: 100,
      createdAt: Date.now()
    };

    const initialVault: WackoVaultData = {
      version: 1,
      profile: userProfile,
      keys: {
        ecdh: {
          privateKeyJwk: ecdhPrivJwk,
          publicKeyJwk: identityBundle.ecdhPublicKeyJwk
        },
        ecdsa: {
          privateKeyJwk: ecdsaPrivJwk,
          publicKeyJwk: identityBundle.ecdsaPublicKeyJwk
        }
      },
      matches: [],
      messages: [],
      settings: {
        maxMessagesPerContact: 50,
        autoPruneInactiveDays: 7,
        discoveryTopic: 'bitsocial:wacko:discovery'
      },
      updatedAt: Date.now()
    };

    // 2. Pack, compress and encrypt vault
    const packed = await packVault(initialVault, passphrase);
    this.vault = initialVault;
    this.activePassphrase = passphrase;
    this.currentFileHash = packed.fileHash;

    const savings =
      packed.uncompressedBytes > 0
        ? ((1 - packed.compressedBytes / packed.uncompressedBytes) * 100)
        : 0;

    this.lastPackedStats = {
      uncompressedBytes: packed.uncompressedBytes,
      compressedBytes: packed.compressedBytes,
      totalVaultBytes: packed.totalVaultBytes,
      savingsPercent: Math.round(savings * 10) / 10
    };

    // 3. Auto-download the hash identity file
    downloadVaultFile(packed.fileBuffer, packed.fileHash);

    // 4. Save to browser IndexedDB for 1-click loading next time
    try {
      await storageManager.saveEncryptedVault(packed.fileBuffer, packed.fileHash, userProfile.pseudonym);
      this.savedVaultRecord = await storageManager.getLatestEncryptedVault();
    } catch (err) {
      console.warn('Could not save vault to IndexedDB:', err);
    }

    // 5. Enter the BitSocial network
    await this.p2pClient.connect(identityBundle, userProfile);
    this.isLoggedIn = true;
    this.isConnecting = false;

    return packed;
  }

  // -------------------------------------------------------------
  // Login Flow (Load Encrypted Hash File)
  // -------------------------------------------------------------

  async loginWithVaultFile(fileBuffer: Uint8Array, passphrase: string): Promise<void> {
    this.isConnecting = true;

    // 1. Unpack, decrypt and decompress vault
    const unpacked = await unpackVault<WackoVaultData>(fileBuffer, passphrase);
    const vaultData = unpacked.vaultData;

    // 2. Re-hydrate WebCrypto keys from exported JWKs
    const ecdhPrivKey = await window.crypto.subtle.importKey(
      'jwk',
      vaultData.keys.ecdh.privateKeyJwk,
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveKey', 'deriveBits']
    );

    const ecdhPubKey = await window.crypto.subtle.importKey(
      'jwk',
      vaultData.keys.ecdh.publicKeyJwk,
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      []
    );

    const ecdsaPrivKey = await window.crypto.subtle.importKey(
      'jwk',
      vaultData.keys.ecdsa.privateKeyJwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign']
    );

    const ecdsaPubKey = await window.crypto.subtle.importKey(
      'jwk',
      vaultData.keys.ecdsa.publicKeyJwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['verify']
    );

    this.identityBundle = {
      ecdhKeyPair: { privateKey: ecdhPrivKey, publicKey: ecdhPubKey },
      ecdhPublicKeyJwk: vaultData.keys.ecdh.publicKeyJwk,
      ecdsaKeyPair: { privateKey: ecdsaPrivKey, publicKey: ecdsaPubKey },
      ecdsaPublicKeyJwk: vaultData.keys.ecdsa.publicKeyJwk,
      fingerprint: vaultData.profile.id
    };

    this.vault = vaultData;
    this.activePassphrase = passphrase;
    this.currentFileHash = unpacked.fileHash;

    // 3. Cache encrypted vault in browser IndexedDB
    try {
      await storageManager.saveEncryptedVault(fileBuffer, unpacked.fileHash, vaultData.profile.pseudonym);
      this.savedVaultRecord = await storageManager.getLatestEncryptedVault();
    } catch (err) {
      console.warn('Could not cache vault in IndexedDB:', err);
    }

    // 4. Connect to BitSocial P2P mesh
    await this.p2pClient.connect(this.identityBundle, vaultData.profile);
    this.isLoggedIn = true;
    this.isConnecting = false;
  }

  // -------------------------------------------------------------
  // Profile & Vibe Live Updating
  // -------------------------------------------------------------

  async updateProfileVibe(mood: UserProfile['mood'], interests?: string[]): Promise<void> {
    if (!this.vault) return;
    this.vault.profile.mood = mood;
    if (interests) {
      this.vault.profile.interests = interests;
    }
    this.vault.updatedAt = Date.now();

    // Broadcast updated presence to BitSocial P2P mesh
    await this.p2pClient.updateProfile(this.vault.profile);

    // Re-score discovered peers based on new synergy
    this.recalculatePeerScores();

    // Cache updated vault in IndexedDB
    try {
      if (this.activePassphrase) {
        const packed = await packVault(this.vault, this.activePassphrase);
        await storageManager.saveEncryptedVault(packed.fileBuffer, packed.fileHash, this.vault.profile.pseudonym);
        this.currentFileHash = packed.fileHash;
      }
    } catch (err) {
      console.warn('Could not update cached vault after mood update:', err);
    }
  }

  recalculatePeerScores(): void {
    if (!this.vault) return;
    this.discoveredPeers = this.discoveredPeers.map((peer) => {
      const compatibility = MatchingEngine.calculateCompatibility(
        this.vault!.profile,
        peer
      );
      return {
        ...peer,
        compatibility
      };
    }).sort((a, b) => b.compatibility.score - a.compatibility.score);
  }

  // -------------------------------------------------------------
  // Mingle & Matching Actions
  // -------------------------------------------------------------

  async likeStranger(peer: EphemeralPeerPresence): Promise<void> {
    if (!this.vault) return;
    this.sentLikes.add(peer.peerId);

    // Anti-Spam Proof-of-Work Shield (BitSocial Protocol)
    this.isSolvingPoW = true;
    try {
      const challenge = AntiSpamEngine.generateChallenge(peer.peerId, 2);
      await AntiSpamEngine.solveChallenge(challenge);
      await this.p2pClient.sendMatchSignal('HEART', peer);
    } finally {
      this.isSolvingPoW = false;
    }
  }

  dismissCelebration(): void {
    this.newMatchCelebration = null;
  }

  openCelebrationChat(): string | null {
    if (!this.newMatchCelebration) return null;
    const convId = this.newMatchCelebration.id;
    this.activeConversationId = convId;
    this.newMatchCelebration = null;
    return convId;
  }

  exportHistoricalArchive(olderThanDays = 30): number {
    if (!this.vault) return 0;
    const cutoffTimestamp = Date.now() - olderThanDays * 86400000;
    const { activeVault, archiveBundle } = VaultArchiver.splitForArchive(
      this.vault,
      cutoffTimestamp
    );

    this.vault.messages = activeVault.messages;
    this.vault.updatedAt = Date.now();

    // Trigger archive JSON download
    if (typeof window !== 'undefined') {
      const blob = new Blob([JSON.stringify(archiveBundle, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wacko-archive-${archiveBundle.vaultId.slice(0, 8)}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    return archiveBundle.messageCount;
  }

  passStranger(peerId: string): void {
    this.discoveredPeers = this.discoveredPeers.filter((p) => p.peerId !== peerId);
  }

  // -------------------------------------------------------------
  // Messaging Actions
  // -------------------------------------------------------------

  async sendChatMessage(conversationId: string, text: string): Promise<void> {
    if (!this.vault || !text.trim()) return;

    const match = this.vault.matches.find((m) => m.id === conversationId);
    if (!match) throw new Error('Match conversation not found');

    const sentMessage = await this.p2pClient.sendDirectMessage(
      match.peerId,
      match.peerEcdhKeyJwk,
      text.trim(),
      conversationId
    );

    this.vault.messages = [...this.vault.messages, sentMessage];
    match.lastMessageAt = sentMessage.timestamp;
  }

  selectConversation(convId: string | null): void {
    this.activeConversationId = convId;
    if (convId) {
      this.unreadCounts[convId] = 0;
    }
  }

  // -------------------------------------------------------------
  // Vault Size Management & Export
  // -------------------------------------------------------------

  async pruneHistory(): Promise<number> {
    if (!this.vault) return 0;
    const max = this.vault.settings.maxMessagesPerContact || 50;
    const { prunedMessages, removedCount } = MatchingEngine.pruneVaultMessages(
      this.vault.messages,
      max
    );
    this.vault.messages = prunedMessages;
    return removedCount;
  }

  async exportUpdatedVault(passphrase?: string): Promise<PackedVaultResult> {
    if (!this.vault) throw new Error('No active vault');
    const pass = passphrase || this.activePassphrase;
    if (!pass) throw new Error('Passphrase required to encrypt vault');

    this.vault.updatedAt = Date.now();
    const packed = await packVault(this.vault, pass);

    this.currentFileHash = packed.fileHash;
    const savings =
      packed.uncompressedBytes > 0
        ? ((1 - packed.compressedBytes / packed.uncompressedBytes) * 100)
        : 0;

    this.lastPackedStats = {
      uncompressedBytes: packed.uncompressedBytes,
      compressedBytes: packed.compressedBytes,
      totalVaultBytes: packed.totalVaultBytes,
      savingsPercent: Math.round(savings * 10) / 10
    };

    downloadVaultFile(packed.fileBuffer, packed.fileHash);

    // Update encrypted vault in browser IndexedDB
    try {
      await storageManager.saveEncryptedVault(packed.fileBuffer, packed.fileHash, this.vault.profile.pseudonym);
      this.savedVaultRecord = await storageManager.getLatestEncryptedVault();
    } catch (err) {
      console.warn('Could not update vault in IndexedDB:', err);
    }

    return packed;
  }

  async loginWithSavedVault(passphrase: string): Promise<void> {
    if (!this.savedVaultRecord) {
      throw new Error('No encrypted vault found in browser storage');
    }
    await this.loginWithVaultFile(this.savedVaultRecord.fileBuffer, passphrase);
  }

  async clearBrowserStorage(): Promise<void> {
    await storageManager.clearAll();
    this.savedVaultRecord = null;
  }

  // -------------------------------------------------------------
  // Logout / "Go Ghost" (100% Non-Existing Mode)
  // -------------------------------------------------------------

  async logout(): Promise<void> {
    // 1. Broadcast immediate offline presence and close all BitSocial connections
    await this.p2pClient.disconnect();

    // 2. Wipe memory
    this.vault = null;
    this.identityBundle = null;
    this.activePassphrase = '';
    this.currentFileHash = '';
    this.discoveredPeers = [];
    this.sentLikes.clear();
    this.activeConversationId = null;
    this.unreadCounts = {};
    this.isLoggedIn = false;
  }
}

// -------------------------------------------------------------
// Download Helper
// -------------------------------------------------------------

export function downloadVaultFile(buffer: Uint8Array, fileHash: string): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([buffer as unknown as BlobPart], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const shortHash = fileHash.slice(0, 10);
  a.href = url;
  a.download = `wacko-identity-${shortHash}.wacko`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const wackoState = new WackoStateManager();
