import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const MAX_FLIPBOOKS_ANONYMOUS = 20;

export const create = mutation({
  args: {
    fileId: v.id("_storage"),
    title: v.string(),
    pageCount: v.number(),
    fileSize: v.number(),
    anonymousId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const existingAnonymous = await ctx.db
      .query("flipbooks")
      .withIndex("by_anonymous_id", (q) => q.eq("anonymousId", args.anonymousId))
      .collect();

    if (existingAnonymous.length >= MAX_FLIPBOOKS_ANONYMOUS) {
      throw new Error(
        `Anonymous users limited to ${MAX_FLIPBOOKS_ANONYMOUS} flipbooks.`
      );
    }

    const flipbookId = await ctx.db.insert("flipbooks", {
      anonymousId: args.anonymousId,
      fileId: args.fileId,
      title: args.title,
      pageCount: args.pageCount,
      fileSize: args.fileSize,
      isPublic: true,
      createdAt: now,
      updatedAt: now,
    });

    let session = await ctx.db
      .query("anonymousSessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.anonymousId))
      .unique();

    if (session) {
      await ctx.db.patch(session._id, {
        flipbookIds: [...session.flipbookIds, flipbookId],
        lastActiveAt: now,
      });
    } else {
      await ctx.db.insert("anonymousSessions", {
        sessionId: args.anonymousId,
        flipbookIds: [flipbookId],
        createdAt: now,
        lastActiveAt: now,
      });
    }

    return flipbookId;
  },
});

export const get = query({
  args: { id: v.id("flipbooks") },
  handler: async (ctx, args) => {
    const flipbook = await ctx.db.get(args.id);
    if (!flipbook) {
      return null;
    }

    const fileUrl = await ctx.storage.getUrl(flipbook.fileId);
    return { ...flipbook, fileUrl };
  },
});

export const listByAnonymousId = query({
  args: { anonymousId: v.string() },
  handler: async (ctx, args) => {
    const flipbooks = await ctx.db
      .query("flipbooks")
      .withIndex("by_anonymous_id", (q) => q.eq("anonymousId", args.anonymousId))
      .order("desc")
      .collect();

    return Promise.all(
      flipbooks.map(async (flipbook) => {
        const fileUrl = await ctx.storage.getUrl(flipbook.fileId);
        return { ...flipbook, fileUrl };
      })
    );
  },
});

export const remove = mutation({
  args: { id: v.id("flipbooks"), anonymousId: v.string() },
  handler: async (ctx, args) => {
    const flipbook = await ctx.db.get(args.id);
    if (!flipbook) {
      throw new Error("Flipbook not found");
    }

    if (flipbook.anonymousId !== args.anonymousId) {
      throw new Error("Unauthorized");
    }

    await ctx.storage.delete(flipbook.fileId);
    await ctx.db.delete(args.id);
  },
});

export const updateTitle = mutation({
  args: { id: v.id("flipbooks"), title: v.string(), anonymousId: v.string() },
  handler: async (ctx, args) => {
    const flipbook = await ctx.db.get(args.id);
    if (!flipbook) {
      throw new Error("Flipbook not found");
    }

    if (flipbook.anonymousId !== args.anonymousId) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.id, {
      title: args.title,
      updatedAt: Date.now(),
    });
  },
});
