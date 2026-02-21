import { ConvexError, v } from "convex/values";
import { mutation, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { ensureSessionTokenHash } from "./lib/session";

const MAX_PDF_FILE_SIZE = 20 * 1024 * 1024;
const MAX_IMAGE_FILE_SIZE = 10 * 1024 * 1024;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000;
const MAX_UPLOADS_PER_HOUR_PER_SESSION = 20;
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

async function assertFileIsOwnedBySession(
  ctx: MutationCtx,
  fileId: Id<"_storage">,
  ownerSessionTokenHash: string,
) {
  const ownership = await ctx.db
    .query("uploadedFiles")
    .withIndex("by_file_id", (q) => q.eq("fileId", fileId))
    .unique();

  if (!ownership || ownership.ownerSessionTokenHash !== ownerSessionTokenHash) {
    throw new ConvexError("Unauthorized.");
  }

  return ownership;
}

async function claimUploadedFileOwnership(
  ctx: MutationCtx,
  fileId: Id<"_storage">,
  ownerSessionTokenHash: string,
) {
  const existingOwnership = await ctx.db
    .query("uploadedFiles")
    .withIndex("by_file_id", (q) => q.eq("fileId", fileId))
    .unique();

  if (existingOwnership) {
    if (existingOwnership.ownerSessionTokenHash !== ownerSessionTokenHash) {
      throw new ConvexError("Unauthorized.");
    }

    await ctx.db.patch(existingOwnership._id, {
      updatedAt: Date.now(),
    });

    return existingOwnership;
  }

  const linkedFlipbooks = await ctx.db
    .query("flipbooks")
    .withIndex("by_file_id", (q) => q.eq("fileId", fileId))
    .collect();

  if (
    linkedFlipbooks.some(
      (flipbook) => flipbook.ownerSessionTokenHash !== ownerSessionTokenHash,
    )
  ) {
    throw new ConvexError("Unauthorized.");
  }

  const now = Date.now();
  const ownershipId = await ctx.db.insert("uploadedFiles", {
    fileId,
    ownerSessionTokenHash,
    createdAt: now,
    updatedAt: now,
  });

  return {
    _id: ownershipId,
  };
}

export const generateUploadUrl = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const sessionTokenHash = await ensureSessionTokenHash(ctx, args.sessionToken);
    const now = Date.now();

    const rateLimit = await ctx.db
      .query("uploadRateLimits")
      .withIndex("by_session_token_hash", (q) =>
        q.eq("sessionTokenHash", sessionTokenHash),
      )
      .unique();

    if (rateLimit) {
      const windowExpired = now - rateLimit.windowStart > RATE_LIMIT_WINDOW;

      if (windowExpired) {
        await ctx.db.patch(rateLimit._id, {
          uploadCount: 1,
          windowStart: now,
        });
      } else if (rateLimit.uploadCount >= MAX_UPLOADS_PER_HOUR_PER_SESSION) {
        throw new ConvexError("Rate limit exceeded. Try again later.");
      } else {
        await ctx.db.patch(rateLimit._id, {
          uploadCount: rateLimit.uploadCount + 1,
        });
      }
    } else {
      await ctx.db.insert("uploadRateLimits", {
        sessionTokenHash,
        uploadCount: 1,
        windowStart: now,
      });
    }

    return await ctx.storage.generateUploadUrl();
  },
});

export const validateFile = mutation({
  args: {
    sessionToken: v.string(),
    fileId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const ownerSessionTokenHash = await ensureSessionTokenHash(
      ctx,
      args.sessionToken,
    );
    const ownership = await claimUploadedFileOwnership(
      ctx,
      args.fileId,
      ownerSessionTokenHash,
    );
    const metadata = await ctx.storage.getMetadata(args.fileId);

    if (!metadata) {
      await ctx.db.delete(ownership._id);
      throw new ConvexError("Uploaded file could not be resolved.");
    }

    if (metadata.size > MAX_PDF_FILE_SIZE) {
      await ctx.storage.delete(args.fileId);
      await ctx.db.delete(ownership._id);
      throw new ConvexError(
        `File size exceeds ${MAX_PDF_FILE_SIZE / (1024 * 1024)}MB limit`,
      );
    }

    if (metadata.contentType !== "application/pdf") {
      await ctx.storage.delete(args.fileId);
      await ctx.db.delete(ownership._id);
      throw new ConvexError("Only PDF files are allowed.");
    }

    return {
      valid: true,
      fileSize: metadata.size,
      mimeType: metadata.contentType,
    };
  },
});

export const validateImageFile = mutation({
  args: {
    sessionToken: v.string(),
    fileId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const ownerSessionTokenHash = await ensureSessionTokenHash(
      ctx,
      args.sessionToken,
    );
    const ownership = await claimUploadedFileOwnership(
      ctx,
      args.fileId,
      ownerSessionTokenHash,
    );
    const metadata = await ctx.storage.getMetadata(args.fileId);

    if (!metadata) {
      await ctx.db.delete(ownership._id);
      throw new ConvexError("Uploaded image could not be resolved.");
    }

    if (metadata.size > MAX_IMAGE_FILE_SIZE) {
      await ctx.storage.delete(args.fileId);
      await ctx.db.delete(ownership._id);
      throw new ConvexError(
        `Image size exceeds ${MAX_IMAGE_FILE_SIZE / (1024 * 1024)}MB limit`,
      );
    }

    if (!ALLOWED_IMAGE_MIME_TYPES.has(metadata.contentType ?? "")) {
      await ctx.storage.delete(args.fileId);
      await ctx.db.delete(ownership._id);
      throw new ConvexError("Only JPG, PNG, WEBP, or GIF images are allowed.");
    }

    const url = await ctx.storage.getUrl(args.fileId);
    if (!url) {
      await ctx.storage.delete(args.fileId);
      await ctx.db.delete(ownership._id);
      throw new ConvexError("Uploaded image could not be resolved.");
    }

    return {
      valid: true,
      url,
      fileSize: metadata.size,
      mimeType: metadata.contentType,
    };
  },
});

export const deleteUploadedFile = mutation({
  args: {
    sessionToken: v.string(),
    fileId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const ownerSessionTokenHash = await ensureSessionTokenHash(
      ctx,
      args.sessionToken,
    );
    const ownership = await assertFileIsOwnedBySession(
      ctx,
      args.fileId,
      ownerSessionTokenHash,
    );

    await ctx.storage.delete(args.fileId);
    await ctx.db.delete(ownership._id);

    return { deleted: true };
  },
});
