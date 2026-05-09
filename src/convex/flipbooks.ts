import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { ensureSessionTokenHash, hashSessionToken } from "./lib/session";

const MAX_FLIPBOOKS_PER_SESSION = 20;

function toPublicFlipbook(flipbook: Doc<"flipbooks">, fileUrl: string | null) {
  return {
    _id: flipbook._id,
    _creationTime: flipbook._creationTime,
    title: flipbook.title,
    pageCount: flipbook.pageCount,
    fileSize: flipbook.fileSize,
    isPublic: flipbook.isPublic,
    sourceType: flipbook.sourceType,
    posterSchema: flipbook.posterSchema,
    posterHtml: flipbook.posterHtml,
    posterCss: flipbook.posterCss,
    generationMeta: flipbook.generationMeta,
    createdAt: flipbook.createdAt,
    updatedAt: flipbook.updatedAt,
    fileUrl,
  };
}

export const create = mutation({
  args: {
    sessionToken: v.string(),
    fileId: v.id("_storage"),
    title: v.string(),
    pageCount: v.number(),
    fileSize: v.number(),
    sourceType: v.optional(
      v.union(v.literal("upload"), v.literal("generated_poster")),
    ),
    posterSchema: v.optional(v.string()),
    posterHtml: v.optional(v.string()),
    posterCss: v.optional(v.string()),
    generationMeta: v.optional(
      v.object({
        model: v.string(),
        generatedAt: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const ownerSessionTokenHash = await ensureSessionTokenHash(
      ctx,
      args.sessionToken,
    );

    const existingFlipbooks = await ctx.db
      .query("flipbooks")
      .withIndex("by_owner_session_token_hash", (q) =>
        q.eq("ownerSessionTokenHash", ownerSessionTokenHash),
      )
      .collect();

    if (existingFlipbooks.length >= MAX_FLIPBOOKS_PER_SESSION) {
      throw new ConvexError(
        `Anonymous users limited to ${MAX_FLIPBOOKS_PER_SESSION} flipbooks.`,
      );
    }

    const uploadedFile = await ctx.db
      .query("uploadedFiles")
      .withIndex("by_file_id", (q) => q.eq("fileId", args.fileId))
      .unique();

    if (!uploadedFile || uploadedFile.ownerSessionTokenHash !== ownerSessionTokenHash) {
      throw new ConvexError("Uploaded file does not belong to this session.");
    }

    const now = Date.now();
    return await ctx.db.insert("flipbooks", {
      ownerSessionTokenHash,
      fileId: args.fileId,
      title: args.title,
      pageCount: args.pageCount,
      fileSize: args.fileSize,
      isPublic: true,
      sourceType: args.sourceType ?? "upload",
      posterSchema: args.posterSchema,
      posterHtml: args.posterHtml,
      posterCss: args.posterCss,
      generationMeta: args.generationMeta,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const savePosterSource = mutation({
  args: {
    id: v.id("flipbooks"),
    sessionToken: v.string(),
    posterSchema: v.string(),
    posterHtml: v.string(),
    posterCss: v.string(),
    generationMeta: v.object({
      model: v.string(),
      generatedAt: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const ownerSessionTokenHash = await ensureSessionTokenHash(
      ctx,
      args.sessionToken,
    );
    const flipbook = await ctx.db.get(args.id);
    if (!flipbook) {
      throw new ConvexError("Flipbook not found.");
    }
    if (flipbook.ownerSessionTokenHash !== ownerSessionTokenHash) {
      throw new ConvexError("Unauthorized.");
    }

    await ctx.db.patch(args.id, {
      sourceType: "generated_poster",
      posterSchema: args.posterSchema,
      posterHtml: args.posterHtml,
      posterCss: args.posterCss,
      generationMeta: args.generationMeta,
      updatedAt: Date.now(),
    });
  },
});

export const get = query({
  args: { id: v.id("flipbooks") },
  handler: async (ctx, args) => {
    const flipbook = await ctx.db.get(args.id);
    if (!flipbook || !flipbook.isPublic) {
      return null;
    }

    const fileUrl = await ctx.storage.getUrl(flipbook.fileId);
    return toPublicFlipbook(flipbook, fileUrl);
  },
});

export const listBySession = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const ownerSessionTokenHash = await hashSessionToken(args.sessionToken);

    const flipbooks = await ctx.db
      .query("flipbooks")
      .withIndex("by_owner_session_token_hash", (q) =>
        q.eq("ownerSessionTokenHash", ownerSessionTokenHash),
      )
      .order("desc")
      .collect();

    return Promise.all(
      flipbooks.map(async (flipbook) => {
        const fileUrl = await ctx.storage.getUrl(flipbook.fileId);
        return toPublicFlipbook(flipbook, fileUrl);
      }),
    );
  },
});

export const remove = mutation({
  args: { id: v.id("flipbooks"), sessionToken: v.string() },
  handler: async (ctx, args) => {
    const ownerSessionTokenHash = await ensureSessionTokenHash(
      ctx,
      args.sessionToken,
    );
    const flipbook = await ctx.db.get(args.id);
    if (!flipbook) {
      throw new ConvexError("Flipbook not found.");
    }

    if (flipbook.ownerSessionTokenHash !== ownerSessionTokenHash) {
      throw new ConvexError("Unauthorized.");
    }

    await ctx.storage.delete(flipbook.fileId);
    await ctx.db.delete(args.id);

    const uploadedFile = await ctx.db
      .query("uploadedFiles")
      .withIndex("by_file_id", (q) => q.eq("fileId", flipbook.fileId))
      .unique();
    if (uploadedFile) {
      await ctx.db.delete(uploadedFile._id);
    }
  },
});

export const updateTitle = mutation({
  args: { id: v.id("flipbooks"), title: v.string(), sessionToken: v.string() },
  handler: async (ctx, args) => {
    const ownerSessionTokenHash = await ensureSessionTokenHash(
      ctx,
      args.sessionToken,
    );
    const flipbook = await ctx.db.get(args.id);
    if (!flipbook) {
      throw new ConvexError("Flipbook not found.");
    }

    if (flipbook.ownerSessionTokenHash !== ownerSessionTokenHash) {
      throw new ConvexError("Unauthorized.");
    }

    await ctx.db.patch(args.id, {
      title: args.title,
      updatedAt: Date.now(),
    });
  },
});
