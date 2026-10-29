/**
 * Cryptographic utility functions for byte encoding, decoding, and randomness.
 */

export function uint8ArrayToBase64Url(bytes: Uint8Array): string {
  // Convert Uint8Array to binary string
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  // Convert binary to base64, then to base64url
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64UrlToUint8Array(base64Url: string): Uint8Array {
  // Restore standard base64 from base64url
  let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function utf8Encode(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

export function utf8Decode(bytes: Uint8Array): string {
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

export function getRandomBytes(length: number): Uint8Array {
  if (length <= 0 || !Number.isInteger(length)) {
    throw new Error('Length must be a positive integer');
  }
  const buffer = new Uint8Array(length);
  globalThis.crypto.getRandomValues(buffer);
  return buffer;
}

/**
 * Best-effort buffer clearing for sensitive cryptographic buffers.
 * Note: JavaScript GC prevents absolute zeroization guarantees, but
 * zeroing the underlying typed array prevents passive memory residue.
 */
export function wipeBuffer(buffer: Uint8Array): void {
  buffer.fill(0);
}
