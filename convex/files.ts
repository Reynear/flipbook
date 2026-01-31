import { v } from "convex/values";
import { mutation } from "./_generated/server";

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000;
const MAX_UPLOADS_PER_HOUR_ANON = 20;

export const generateUploadUrl = mutation({
  args: { anonymousId: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();

    const identifier = args.anonymousId;
    const maxUploads = MAX_UPLOADS_PER_HOUR_ANON;

    const rateLimit = await ctx.db
      .query("uploadRateLimits")
      .withIndex("by_identifier", (q) => q.eq("identifier", identifier))
      .unique();

    if (rateLimit) {
      const windowExpired = now - rateLimit.windowStart > RATE_LIMIT_WINDOW;

      if (windowExpired) {
        await ctx.db.patch(rateLimit._id, {
          uploadCount: 1,
          windowStart: now,
        });
      } else if (rateLimit.uploadCount >= maxUploads) {
        throw new Error("Rate limit exceeded. Try again later.");
      } else {
        await ctx.db.patch(rateLimit._id, {
          uploadCount: rateLimit.uploadCount + 1,
        });
      }
    } else {
      await ctx.db.insert("uploadRateLimits", {
        identifier,
        uploadCount: 1,
        windowStart: now,
      });
    }

    return await ctx.storage.generateUploadUrl();
  },
});

export const validateFile = mutation({
  args: {
    fileId: v.id("_storage"),
    fileSize: v.number(),
    mimeType: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.fileSize > MAX_FILE_SIZE) {
      await ctx.storage.delete(args.fileId);
      throw new Error(`File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`);
    }

    if (args.mimeType !== "application/pdf") {
      await ctx.storage.delete(args.fileId);
      throw new Error("Only PDF files are allowed");
    }

    return { valid: true };
  },
});
