import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

// Database sessions. The browser's cookie holds a random token; the Session
// row is keyed by the token's SHA-256 hash. Reading the database on every
// request costs one indexed lookup, and in return a session can be ended at
// once: logging out, deactivating a user or resetting a password deletes rows.

export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Starts a session and returns the token for the cookie. */
export async function createSession(userId: string) {
  // 32 random bytes: far too many possibilities to guess.
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  // Housekeeping: expired rows can never be used again.
  await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  await prisma.session.create({ data: { id: hashToken(token), userId, expiresAt } });
  return { token, expiresAt };
}

/** The user behind a cookie token, or null if the session is unknown, expired or the user was deactivated. */
export async function validateSession(token: string) {
  const session = await prisma.session.findUnique({
    where: { id: hashToken(token) },
    select: {
      id: true,
      expiresAt: true,
      user: { select: { id: true, name: true, email: true, role: true, isActive: true } },
    },
  });
  if (!session || session.expiresAt <= new Date() || !session.user.isActive) return null;

  const { id, name, email, role } = session.user;
  return { sessionId: session.id, user: { id, name, email, role } };
}

export async function deleteSession(token: string) {
  await prisma.session.deleteMany({ where: { id: hashToken(token) } });
}
