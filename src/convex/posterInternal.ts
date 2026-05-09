import { ConvexError, v } from "convex/values";
import { internalMutation } from "./_generated/server";

const LLM_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const MAX_LLM_CALLS_PER_WINDOW = 30;

export const consumeLlmQuota = internalMutation({
  args: {
    sessionTokenHash: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("generationRateLimits")
      .withIndex("by_session_token_hash", (q) =>
        q.eq("sessionTokenHash", args.sessionTokenHash),
      )
      .unique();

    if (!existing) {
      await ctx.db.insert("generationRateLimits", {
        sessionTokenHash: args.sessionTokenHash,
        generationCount: 1,
        windowStart: now,
      });
      return;
    }

    const expired = now - existing.windowStart > LLM_RATE_LIMIT_WINDOW_MS;
    if (expired) {
      await ctx.db.patch(existing._id, {
        generationCount: 1,
        windowStart: now,
      });
      return;
    }

    if (existing.generationCount >= MAX_LLM_CALLS_PER_WINDOW) {
      throw new ConvexError("LLM rate limit exceeded. Try again later.");
    }

    await ctx.db.patch(existing._id, {
      generationCount: existing.generationCount + 1,
    });
  },
});
