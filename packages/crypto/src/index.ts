/**
 * @wacko/crypto
 * Cryptographic engine for Wacko:
 * - PBKDF2 (600,000 iterations) + AES-256-GCM encrypted vault packaging
 * - Native Gzip/Deflate compression pipeline (CompressionStream) for 80%+ file size reduction
 * - ECDH (P-256) for zero-server P2P End-to-End Encrypted (E2EE) session key exchange
 * - ECDSA (P-256) for signed ephemeral heartbeats & anti-spoofing
 */

const getCrypto = (): Crypto => {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
    return globalThis.crypto;
  }
  throw new Error('WebCrypto API is not available in this environment');
};

const MAGIC_BYTES = new Uint8Array([0x57, 0x41, 0x43, 0x4b]); // "WACK"
const CURRENT_VAULT_VERSION = 1;
const DEFAULT_PBKDF2_ITERATIONS = 600000;

export interface PackedVaultResult {
  fileBuffer: Uint8Array;
  fileHash: string; // SHA-256 hex fingerprint for identity
  uncompressedBytes: number;
  compressedBytes: number;
  totalVaultBytes: number;
}

export interface UnpackedVaultResult<T = any> {
  vaultData: T;
  fileHash: string;
  version: number;
}

// -------------------------------------------------------------
// Compression Utilities (Native Streams with Fallback)
// -------------------------------------------------------------

export async function compressData(data: Uint8Array): Promise<Uint8Array> {
  if (typeof CompressionStream !== 'undefined') {
    const stream = new Blob([data]).stream().pipeThrough(new CompressionStream('gzip'));
    const response = new Response(stream);
    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  }
  // If CompressionStream is not available, return uncompressed data
  return data;
}

export async function decompressData(data: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream !== 'undefined') {
    try {
      const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('gzip'));
      const response = new Response(stream);
      const buffer = await response.arrayBuffer();
      return new Uint8Array(buffer);
    } catch {
      // In case data was not compressed
      return data;
    }
  }
  return data;
}

// -------------------------------------------------------------
// Key Derivation (PBKDF2 -> AES-256-GCM)
// -------------------------------------------------------------

export async function deriveKeyFromPassword(
  password: string,
  salt: Uint8Array,
  iterations = DEFAULT_PBKDF2_ITERATIONS
): Promise<CryptoKey> {
  const crypto = getCrypto();
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  const baseKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations,
      hash: 'SHA-256'
    },
    baseKey,
    {
      name: 'AES-GCM',
      length: 256
    },
    false,
    ['encrypt', 'decrypt']
  );
}

// -------------------------------------------------------------
// Vault Packaging & Unpackaging (Hash Identity File)
// -------------------------------------------------------------

/**
 * Packs user data into a compressed, AES-256-GCM encrypted binary vault file.
 * Format:
 * [0..3]   MAGIC "WACK"
 * [4..5]   VERSION (uint16 big-endian)
 * [6..9]   ITERATIONS / 1000 (uint32 big-endian)
 * [10..25] SALT (16 bytes)
 * [26..37] IV (12 bytes)
 * [38..]   AES-256-GCM Ciphertext (includes 16-byte auth tag)
 */
export async function packVault(
  vaultData: object,
  passphrase: string,
  iterations = DEFAULT_PBKDF2_ITERATIONS
): Promise<PackedVaultResult> {
  const crypto = getCrypto();
  const encoder = new TextEncoder();

  // 1. Serialize and compress JSON
  const jsonStr = JSON.stringify(vaultData);
  const rawBytes = encoder.encode(jsonStr);
  const compressedBytes = await compressData(rawBytes);

  // 2. Derive encryption key from passphrase
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKeyFromPassword(passphrase, salt, iterations);

  // 3. Encrypt compressed payload
  const ciphertextBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as BufferSource
    },
    key,
    compressedBytes as unknown as BufferSource
  );
  const ciphertext = new Uint8Array(ciphertextBuffer);

  // 4. Assemble binary envelope
  const headerLength = 38; // 4 (magic) + 2 (ver) + 4 (iter) + 16 (salt) + 12 (iv)
  const totalLength = headerLength + ciphertext.byteLength;
  const result = new Uint8Array(totalLength);
  const view = new DataView(result.buffer);

  // Magic
  result.set(MAGIC_BYTES, 0);
  // Version
  view.setUint16(4, CURRENT_VAULT_VERSION, false);
  // Iterations / 1000
  view.setUint32(6, Math.floor(iterations / 1000), false);
  // Salt
  result.set(salt, 10);
  // IV
  result.set(iv, 26);
  // Ciphertext
  result.set(ciphertext, headerLength);

  // 5. Calculate SHA-256 fingerprint of the vault
  const hashBuffer = await crypto.subtle.digest('SHA-256', result);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const fileHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  return {
    fileBuffer: result,
    fileHash,
    uncompressedBytes: rawBytes.byteLength,
    compressedBytes: compressedBytes.byteLength,
    totalVaultBytes: result.byteLength
  };
}

/**
 * Unpacks and decrypts the .wacko vault file using the user's passphrase.
 */
export async function unpackVault<T = any>(
  fileBuffer: Uint8Array,
  passphrase: string
): Promise<UnpackedVaultResult<T>> {
  const crypto = getCrypto();
  const headerLength = 38;

  if (fileBuffer.byteLength < headerLength + 16) {
    throw new Error('Invalid vault file: file is too small or truncated');
  }

  // 1. Verify Magic Header
  for (let i = 0; i < 4; i++) {
    if (fileBuffer[i] !== MAGIC_BYTES[i]) {
      throw new Error('Invalid vault file format: missing WACK header signature');
    }
  }

  // 2. Read Header fields
  const view = new DataView(fileBuffer.buffer, fileBuffer.byteOffset, fileBuffer.byteLength);
  const version = view.getUint16(4, false);
  if (version > CURRENT_VAULT_VERSION) {
    throw new Error(`Unsupported vault version ${version}. Max supported is ${CURRENT_VAULT_VERSION}`);
  }

  const iterationsK = view.getUint32(6, false);
  const iterations = iterationsK * 1000;
  const salt = fileBuffer.slice(10, 26);
  const iv = fileBuffer.slice(26, 38);
  const ciphertext = fileBuffer.slice(headerLength);

  // 3. Derive key and decrypt
  const key = await deriveKeyFromPassword(passphrase, salt, iterations);

  let decryptedBuffer: ArrayBuffer;
  try {
    decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv as unknown as BufferSource
      },
      key,
      ciphertext as unknown as BufferSource
    );
  } catch {
    throw new Error('Decryption failed: incorrect passphrase or corrupted file');
  }

  // 4. Decompress payload
  const decompressedBytes = await decompressData(new Uint8Array(decryptedBuffer));
  const decoder = new TextDecoder();
  const jsonStr = decoder.decode(decompressedBytes);

  let vaultData: T;
  try {
    vaultData = JSON.parse(jsonStr);
  } catch {
    throw new Error('Corrupted vault contents: payload is not valid JSON');
  }

  // 5. Compute file fingerprint
  const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer as unknown as BufferSource);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const fileHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  return {
    vaultData,
    fileHash,
    version
  };
}

// -------------------------------------------------------------
// Asymmetric Key Pairs & E2EE Direct Messaging (ECDH + ECDSA)
// -------------------------------------------------------------

export interface IdentityKeyBundle {
  // ECDH for peer-to-peer key exchange
  ecdhKeyPair: CryptoKeyPair;
  ecdhPublicKeyJwk: JsonWebKey;
  // ECDSA for signed presence & message integrity
  ecdsaKeyPair: CryptoKeyPair;
  ecdsaPublicKeyJwk: JsonWebKey;
  fingerprint: string;
}

export async function generateIdentityKeyBundle(): Promise<IdentityKeyBundle> {
  const crypto = getCrypto();

  // 1. ECDH Key Pair for E2EE Direct Message key agreement
  const ecdhKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  );

  // 2. ECDSA Key Pair for authenticating heartbeats and messages
  const ecdsaKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  );

  const ecdhPublicKeyJwk = await crypto.subtle.exportKey('jwk', ecdhKeyPair.publicKey);
  const ecdsaPublicKeyJwk = await crypto.subtle.exportKey('jwk', ecdsaKeyPair.publicKey);

  // Fingerprint is SHA-256 of concatenated public keys
  const fingerprintPayload = new TextEncoder().encode(
    JSON.stringify({ ecdh: ecdhPublicKeyJwk, ecdsa: ecdsaPublicKeyJwk })
  );
  const digest = await crypto.subtle.digest('SHA-256', fingerprintPayload);
  const fingerprint = Array.from(new Uint8Array(digest))
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return {
    ecdhKeyPair,
    ecdhPublicKeyJwk,
    ecdsaKeyPair,
    ecdsaPublicKeyJwk,
    fingerprint
  };
}

export async function deriveSessionKey(
  myPrivateKey: CryptoKey,
  peerPublicKeyJwk: JsonWebKey
): Promise<CryptoKey> {
  const crypto = getCrypto();
  const peerPublicKey = await crypto.subtle.importKey(
    'jwk',
    peerPublicKeyJwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  return await crypto.subtle.deriveKey(
    { name: 'ECDH', public: peerPublicKey },
    myPrivateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptDirectMessage(
  sessionKey: CryptoKey,
  messageText: string
): Promise<{ ciphertext: string; iv: string }> {
  const crypto = getCrypto();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(messageText);

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    sessionKey,
    encoded
  );

  return {
    ciphertext: bufferToBase64(new Uint8Array(encrypted)),
    iv: bufferToBase64(iv)
  };
}

export async function decryptDirectMessage(
  sessionKey: CryptoKey,
  ciphertextBase64: string,
  ivBase64: string
): Promise<string> {
  const crypto = getCrypto();
  const ciphertext = base64ToBuffer(ciphertextBase64);
  const iv = base64ToBuffer(ivBase64);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    sessionKey,
    ciphertext as unknown as BufferSource
  );

  return new TextDecoder().decode(decrypted);
}

export async function signPayload(privateKey: CryptoKey, payloadString: string): Promise<string> {
  const crypto = getCrypto();
  const data = new TextEncoder().encode(payloadString);
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: { name: 'SHA-256' } },
    privateKey,
    data
  );
  return bufferToBase64(new Uint8Array(signature));
}

export async function verifySignature(
  publicKeyJwk: JsonWebKey,
  payloadString: string,
  signatureBase64: string
): Promise<boolean> {
  const crypto = getCrypto();
  const publicKey = await crypto.subtle.importKey(
    'jwk',
    publicKeyJwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['verify']
  );
  const signature = base64ToBuffer(signatureBase64);
  const data = new TextEncoder().encode(payloadString);

  return await crypto.subtle.verify(
    { name: 'ECDSA', hash: { name: 'SHA-256' } },
    publicKey,
    signature as unknown as BufferSource,
    data
  );
}

// -------------------------------------------------------------
// Base64 helpers
// -------------------------------------------------------------

function bufferToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
