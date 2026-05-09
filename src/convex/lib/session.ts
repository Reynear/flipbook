import { ConvexError } from "convex/values";
import type { MutationCtx } from "../_generated/server";

const SESSION_TOKEN_REGEX = /^sess_[a-f0-9]{64}$/;

export function assertValidSessionToken(sessionToken: string): void {
  if (!SESSION_TOKEN_REGEX.test(sessionToken)) {
    throw new ConvexError("Invalid session token.");
  }
}

export async function hashSessionToken(sessionToken: string): Promise<string> {
  assertValidSessionToken(sessionToken);
  const bytes = new TextEncoder().encode(sessionToken);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

export async function ensureSessionTokenHash(
  ctx: MutationCtx,
  sessionToken: string,
): Promise<string> {
  const tokenHash = await hashSessionToken(sessionToken);
  const now = Date.now();

  const existingSession = await ctx.db
    .query("anonymousSessions")
    .withIndex("by_token_hash", (q) => q.eq("tokenHash", tokenHash))
    .unique();

  if (!existingSession) {
    await ctx.db.insert("anonymousSessions", {
      tokenHash,
      createdAt: now,
      lastActiveAt: now,
    });
    return tokenHash;
  }

  await ctx.db.patch(existingSession._id, {
    lastActiveAt: now,
  });

  return tokenHash;
}
