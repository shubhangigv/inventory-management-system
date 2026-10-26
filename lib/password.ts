import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

// Passwords are hashed with scrypt (built into Node, no extra dependency).
// scrypt is deliberately slow and memory-hungry, so guessing passwords from a
// stolen database is expensive. Settings follow the OWASP Password Storage
// Cheat Sheet (N=2^16, r=8, p=2: about 64 MB and ~100 ms per hash).
//
// Stored format: scrypt$N$r$p$salt$hash (salt and hash in base64). Keeping the
// settings in the string means they can be raised later without breaking
// existing passwords.

const N = 2 ** 16;
const r = 8;
const p = 2;
const KEY_LENGTH = 32;

function derive(password: string, salt: Buffer, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // maxmem must exceed 128 * N * r bytes, or Node refuses to run scrypt.
    scrypt(password.normalize("NFKC"), salt, KEY_LENGTH, { ...options, maxmem: 256 * 1024 * 1024 }, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt, { N, r, p });
  return ["scrypt", N, r, p, salt.toString("base64"), key.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, n, blockSize, parallel, salt, hash] = stored.split("$");
  if (algorithm !== "scrypt" || !salt || !hash) return false;

  const expected = Buffer.from(hash, "base64");
  const key = await derive(password, Buffer.from(salt, "base64"), {
    N: Number(n),
    r: Number(blockSize),
    p: Number(parallel),
  });
  // Constant-time comparison: how long it takes doesn't reveal how many bytes matched.
  return key.length === expected.length && timingSafeEqual(key, expected);
}

/**
 * Checked against when the email doesn't exist, so a wrong email takes as long
 * as a wrong password and response times don't reveal which accounts exist.
 */
export const DUMMY_PASSWORD_HASH =
  "scrypt$65536$8$2$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
