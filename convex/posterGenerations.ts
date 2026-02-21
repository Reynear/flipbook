import { ConvexError, v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { ensureSessionTokenHash, hashSessionToken } from "./lib/session";

const MAX_PROMPT_LENGTH = 800;
const MAX_REFERENCE_IMAGES = 4;

const generationStatusValidator = v.union(
  v.literal("queued"),
  v.literal("running"),
  v.literal("succeeded"),
  v.literal("failed"),
);

const generationStageValidator = v.union(
  v.literal("queued"),
  v.literal("requesting_model"),
  v.literal("model_output_received"),
  v.literal("validating_output"),
  v.literal("normalizing_schema"),
  v.literal("rendering_markup"),
  v.literal("completed"),
  v.literal("failed"),
);

export const startPosterGeneration = mutation({
  args: {
    sessionToken: v.string(),
    prompt: v.string(),
    referenceImageStorageIds: v.optional(v.array(v.id("_storage"))),
  },
  handler: async (ctx, args) => {
    const ownerSessionTokenHash = await ensureSessionTokenHash(
      ctx,
      args.sessionToken,
    );

    const prompt = args.prompt.trim();
    if (!prompt) {
      throw new ConvexError("Prompt is required.");
    }
    if (prompt.length > MAX_PROMPT_LENGTH) {
      throw new ConvexError(
        `Prompt must be ${MAX_PROMPT_LENGTH} characters or fewer.`,
      );
    }

    const referenceImageStorageIds = Array.from(
      new Set(args.referenceImageStorageIds ?? []),
    );
    if (referenceImageStorageIds.length > MAX_REFERENCE_IMAGES) {
      throw new ConvexError(
        `You can upload up to ${MAX_REFERENCE_IMAGES} reference images.`,
      );
    }

    for (const storageId of referenceImageStorageIds) {
      const metadata = await ctx.storage.getMetadata(storageId);
      const mediaType = metadata?.contentType ?? "";
      if (!mediaType.startsWith("image/")) {
        throw new ConvexError("Reference files must be images.");
      }

      const ownership = await ctx.db
        .query("uploadedFiles")
        .withIndex("by_file_id", (q) => q.eq("fileId", storageId))
        .unique();
      if (
        !ownership ||
        ownership.ownerSessionTokenHash !== ownerSessionTokenHash
      ) {
        throw new ConvexError("Reference image does not belong to this session.");
      }
    }

    const queuedGenerations = await ctx.db
      .query("posterGenerations")
      .withIndex("by_owner_status", (q) =>
        q.eq("ownerSessionTokenHash", ownerSessionTokenHash).eq("status", "queued"),
      )
      .collect();
    const runningGenerations = await ctx.db
      .query("posterGenerations")
      .withIndex("by_owner_status", (q) =>
        q.eq("ownerSessionTokenHash", ownerSessionTokenHash).eq("status", "running"),
      )
      .collect();
    if (queuedGenerations.length || runningGenerations.length) {
      throw new ConvexError(
        "A poster generation is already in progress. Wait for it to finish.",
      );
    }

    const storedReferenceImageStorageIds =
      referenceImageStorageIds.length > 0 ? referenceImageStorageIds : undefined;
    const now = Date.now();
    const generationId = await ctx.db.insert("posterGenerations", {
      ownerSessionTokenHash,
      prompt,
      referenceImageStorageIds: storedReferenceImageStorageIds,
      status: "queued",
      stage: "queued",
      progress: 5,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.scheduler.runAfter(0, internal.posters.runPosterGeneration, {
      generationId,
    });

    return generationId;
  },
});

export const getPosterGeneration = query({
  args: {
    generationId: v.id("posterGenerations"),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const ownerSessionTokenHash = await hashSessionToken(args.sessionToken);

    const generation = await ctx.db.get(args.generationId);
    if (!generation) {
      return null;
    }
    if (generation.ownerSessionTokenHash !== ownerSessionTokenHash) {
      throw new ConvexError("Unauthorized.");
    }

    return {
      generationId: generation._id,
      referenceImageStorageIds: generation.referenceImageStorageIds,
      status: generation.status,
      stage: generation.stage,
      progress: generation.progress,
      errorMessage: generation.errorMessage,
      resultTitle: generation.resultTitle,
      resultSchema: generation.resultSchema,
      resultHtml: generation.resultHtml,
      resultCss: generation.resultCss,
      resultModel: generation.resultModel,
      resultGeneratedAt: generation.resultGeneratedAt,
      createdAt: generation.createdAt,
      updatedAt: generation.updatedAt,
      startedAt: generation.startedAt,
      completedAt: generation.completedAt,
    };
  },
});

export const getPosterGenerationInternal = internalQuery({
  args: {
    generationId: v.id("posterGenerations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.generationId);
  },
});

export const patchPosterGenerationInternal = internalMutation({
  args: {
    generationId: v.id("posterGenerations"),
    status: v.optional(generationStatusValidator),
    stage: v.optional(generationStageValidator),
    progress: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    resultTitle: v.optional(v.string()),
    resultSchema: v.optional(v.string()),
    resultHtml: v.optional(v.string()),
    resultCss: v.optional(v.string()),
    resultModel: v.optional(v.string()),
    resultGeneratedAt: v.optional(v.number()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const generation = await ctx.db.get(args.generationId);
    if (!generation) {
      return;
    }

    const patch: Record<string, unknown> = {
      updatedAt: Date.now(),
    };
    if (args.status !== undefined) patch.status = args.status;
    if (args.stage !== undefined) patch.stage = args.stage;
    if (args.progress !== undefined) patch.progress = args.progress;
    if (args.errorMessage !== undefined) patch.errorMessage = args.errorMessage;
    if (args.resultTitle !== undefined) patch.resultTitle = args.resultTitle;
    if (args.resultSchema !== undefined) patch.resultSchema = args.resultSchema;
    if (args.resultHtml !== undefined) patch.resultHtml = args.resultHtml;
    if (args.resultCss !== undefined) patch.resultCss = args.resultCss;
    if (args.resultModel !== undefined) patch.resultModel = args.resultModel;
    if (args.resultGeneratedAt !== undefined) {
      patch.resultGeneratedAt = args.resultGeneratedAt;
    }
    if (args.startedAt !== undefined) patch.startedAt = args.startedAt;
    if (args.completedAt !== undefined) patch.completedAt = args.completedAt;

    await ctx.db.patch(args.generationId, patch);
  },
});
