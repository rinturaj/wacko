<br />
<div align="center">
  <img src="https://github.com/rinturaj/wacko/blob/main/src/assets/icon/Wacko_icon.png?raw=true" width="220" />
</div>
<br/>
<div align="center">
  ⚡️ <b> WACKO </b> ⚡️
  <p><b>Decentralized Dating for Strangers powered by the BitSocial Protocol</b></p>
  <p>Zero Centralized Servers • Pure Client-Side Cryptography • Complete Ephemeral Privacy</p>
</div>
<br />

---

## ⚡️ Key Architecture Highlights

### 1. Powered by BitSocial Protocol (`https://bitsocial.net/`)
- **Serverless P2P Network**: Operates over decentralized libp2p pubsub swarms and IPFS content addressing without central servers, domain takedowns, or platform bans.
- **Option A: Non-Existing Mode (Ghost Mode)**:
  - When you are **logged in**, your browser runs a node and broadcasts an ephemeral, signed heartbeat (TTL: 45 seconds).
  - When you **log out or close the tab**, an immediate goodbye tombstone is sent, swarm connections are severed, and in-memory keys are wiped.
  - To the outside network, you **completely cease to exist** when offline. No servers or relays store offline profiles.

### 2. Encrypted Hash Identity File (`.wacko`)
- **Signup**: Generates in-memory cryptographic keypairs (ECDH for key exchange + ECDSA for anti-spoofing).
- **Encryption**: Derives a 256-bit AES key using `PBKDF2` (SHA-256 with 600,000 iterations) from your master passphrase.
- **Envelope**:
  ```
  [0..3]   MAGIC "WACK" (4 bytes)
  [4..5]   VERSION (uint16)
  [6..9]   ITERATIONS / 1000 (uint32)
  [10..25] PBKDF2 SALT (16 bytes)
  [26..37] AES-GCM IV (12 bytes)
  [38..]   AES-256-GCM Ciphertext (includes 16-byte GCM authentication tag)
  ```
- **Login**: Upload your `.wacko` file and enter your passphrase. The app decrypts the vault, validates the GCM tag, and restores your identity, keys, and chat history.

### 3. Long-Run File Size Reduction Mechanisms
- **Gzip Stream Pipeline**: Payload is compressed using the browser's native `CompressionStream('gzip')` before encryption, yielding **75% to 90%+ file size reduction**.
- **Rolling Window Pruning**: Keeps a rolling window of recent messages (default: 50 messages per contact), keeping the active vault file under 50 KB even after months of chatting.
- **Zero Raw Media Embedding**: In accordance with the BitSocial text-only protocol, images are encrypted with ephemeral symmetric keys and stored on decentralized IPFS, storing only 32-byte CIDs in the vault.

---

## 📁 Monorepo Structure

- `apps/wacko-web`: SvelteKit PWA with rich cyber-romantic dark UI, stranger deck, and live E2EE chat.
- `apps/wacko-extension`: Chrome Extension companion (Manifest v3).
- `packages/core`: Data models (`WackoVaultData`, `EphemeralPeerPresence`, `MatchSignal`) and the `MatchingEngine` (compatibility scoring and vault pruning).
- `packages/crypto`: `packVault()`, `unpackVault()`, Gzip compression pipeline, ECDH shared session key derivation, and ECDSA signature verification.
- `packages/protocol`: `BitSocialP2PClient` implementing Gossipsub discovery topics, ephemeral presence heartbeats, and E2EE direct messaging.
- `packages/storage`: Encrypted local persistence fallback.

---

## 🚀 Getting Started with Turborepo

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Start Application (Instant)
```bash
pnpm dev
# or
pnpm start
```
This runs `turbo dev --filter=wacko-web` and launches the application at **[http://localhost:5173](http://localhost:5173)**.

### 3. Run All Tests
```bash
pnpm test
```
Runs the full suite of cryptographic tests (`@wacko/crypto`) and BitSocial P2P protocol tests (`@wacko/protocol`) with Turbo caching.

### 4. Build All Packages
```bash
pnpm build
```

> **Pro Tip**: To test live stranger discovery and messaging locally, open two browser tabs or an incognito window. Each tab acts as an independent stranger on the local BitSocial mesh!

---

## 🛡️ Privacy & Security Guarantees
- **No Central Database**: Neither identities nor messages touch a central server.
- **Double-Blind Matching**: Signals are signed with ECDSA and encrypted with ECDH shared keys.
- **Tamper-Evident**: Any byte modification to the `.wacko` vault file causes AES-GCM decryption to fail immediately.
