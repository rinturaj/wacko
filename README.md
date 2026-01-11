<br />
<div align="center">
  <img src="https://github.com/rinturaj/wacko/blob/main/src/assets/icon/Wacko_icon.png?raw=true" width="260" />
</div>
<br/>
<div align="center">
  ⚡️ <b> WACKO <a ><img src="https://img.shields.io/badge/dApps-green" /></a> </b> ⚡️
    <p>Find your crazy partner</p>
<p>Wacko is a revolutionary dating app that uses secure decentralised database technology to give users complete control over their data and privacy. Say goodbye to centralised data storage and hello to secure and anonymous dating experiences

</p>
<p>Join our community and help shape the future of dating with Wacko, a decentralized dating app. Share your ideas and insights to make Wacko the go-to platform for finding true love and connection.</p>
</div>
<br />
<p align="center">
  <a ><img src="https://img.shields.io/github/license/rinturaj/wacko" /></a>
  <a ><img src="https://img.shields.io/github/checks-status/rinturaj/wacko/main" /></a>
  <a ><img src="https://img.shields.io/github/package-json/v/rinturaj/wacko" /></a>
  <a ><img src="https://img.shields.io/github/watchers/rinturaj/wacko" /></a>
  <a ><img src="https://img.shields.io/github/stars/rinturaj/wacko" /></a>
  <a ><img src="https://img.shields.io/github/forks/rinturaj/wacko" /></a>
</p>
<p align="center">
  <a ><img src="https://img.shields.io/github/commit-activity/m/rinturaj/wacko" /></a>
  <a ><img src="https://img.shields.io/github/contributors/rinturaj/wacko" /></a>
  <a ><img src="https://img.shields.io/github/last-commit/rinturaj/wacko" /></a>
   <a ><img src="https://img.shields.io/github/issues/rinturaj/wacko" /></a>
  <a ><img src="https://img.shields.io/github/issues-pr/rinturaj/wacko" /></a>
 
</p>

<p align="center">
 <a ><img src="https://img.shields.io/github/issues-closed-raw/rinturaj/wacko" /></a>
  <a ><img src="https://img.shields.io/github/languages/code-size/rinturaj/wacko" /></a>
  <a ><img src="https://img.shields.io/github/repo-size/rinturaj/wacko" /></a>
  <a ><img src="https://img.shields.io/github/languages/count/rinturaj/wacko" /></a>
  <a ><img src="https://img.shields.io/github/languages/top/rinturaj/wacko" /></a>
 
</p>

<br/>


# Wacko

Wacko is a privacy-first, decentralized dating app.
Strangers first. Truth later.

## Tech Stack
- **Framework**: Svelte (Web & Extension)
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Storage**: Encrypted IndexedDB (`@wacko/storage`)
- **Crypto**: WebCrypto API (`@wacko/crypto`)
- **Monorepo**: pnpm workspaces

## Structure

- `apps/web`: Svelte PWA (The primary dating experience)
- `apps/extension`: Chrome Extension (Manifest v3 companion)
- `packages/core`: Domain models and matching algorithms
- `packages/crypto`: WebCrypto wrappers and key management
- `packages/storage`: Encrypted local persistence
- `packages/protocol`: Relay synchronization logic
- `packages/ui`: Shared UI components and Tailwind config

## Development

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Start Web App:
   ```bash
   pnpm dev --filter web
   ```

3. Build Extension:
   ```bash
   pnpm build --filter extension
   ```
   Load `apps/extension/dist` (or `build`) as unpacked extension in Chrome.

## Privacy
- No centralized database.
- End-to-end encrypted messaging.
- Local-first matching.


