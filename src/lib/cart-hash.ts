// Cart integrity hashing — prevents localStorage tampering
// A determined attacker could reverse-engineer the key from client JS,
// but this stops casual DevTools editing of cart prices/quantities.

const CART_SECRET = "BB-KZN-Biltong-2025-Hmac-Sig";

/**
 * Compute a simple HMAC-like hash of the cart data.
 * Uses a fast djb2 + FNV-1a inspired mixing with the secret key
 * so the hash can't be reproduced without knowing the key.
 */
export function hashCartData(data: string): string {
  const payload = data + "|" + CART_SECRET;
  let h1 = 0x811c9dc5 >>> 0; // FNV offset basis
  let h2 = 5381; // djb2 seed

  for (let i = 0; i < payload.length; i++) {
    const c = payload.charCodeAt(i);
    // FNV-1a
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    // djb2
    h2 = ((h2 << 5) + h2 + c) >>> 0;
  }

  // Mix both hashes together
  const combined = (h1 >>> 0) ^ (h2 >>> 0);
  return combined.toString(16).padStart(8, "0");
}

/**
 * Verify that stored cart data matches its hash.
 * Returns true if integrity is valid, false if tampered.
 */
export function verifyCartIntegrity(
  data: string,
  storedHash: string | undefined
): boolean {
  if (!storedHash) return false;
  return hashCartData(data) === storedHash;
}
