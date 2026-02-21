import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  anonymousSessions: defineTable({
    tokenHash: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    flipbookIds: v.optional(v.array(v.id("flipbooks"))),
    createdAt: v.number(),
    lastActiveAt: v.number(),
  }).index("by_token_hash", ["tokenHash"]),

  flipbooks: defineTable({
    ownerSessionTokenHash: v.optional(v.string()),
    anonymousId: v.optional(v.string()),
    fileId: v.id("_storage"),
    title: v.string(),
    pageCount: v.number(),
    fileSize: v.number(),
    isPublic: v.boolean(),
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
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner_session_token_hash", ["ownerSessionTokenHash"])
    .index("by_file_id", ["fileId"])
    .index("by_created", ["createdAt"]),

  uploadedFiles: defineTable({
    fileId: v.id("_storage"),
    ownerSessionTokenHash: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_file_id", ["fileId"])
    .index("by_owner_session_token_hash", ["ownerSessionTokenHash"]),

  uploadRateLimits: defineTable({
    sessionTokenHash: v.optional(v.string()),
    identifier: v.optional(v.string()),
    uploadCount: v.number(),
    windowStart: v.number(),
  }).index("by_session_token_hash", ["sessionTokenHash"]),

  generationRateLimits: defineTable({
    sessionTokenHash: v.optional(v.string()),
    identifier: v.optional(v.string()),
    generationCount: v.number(),
    windowStart: v.number(),
  }).index("by_session_token_hash", ["sessionTokenHash"]),

  posterGenerations: defineTable({
    ownerSessionTokenHash: v.optional(v.string()),
    anonymousId: v.optional(v.string()),
    prompt: v.string(),
    referenceImageStorageIds: v.optional(v.array(v.id("_storage"))),
    status: v.union(
      v.literal("queued"),
      v.literal("running"),
      v.literal("succeeded"),
      v.literal("failed"),
    ),
    stage: v.union(
      v.literal("queued"),
      v.literal("requesting_model"),
      v.literal("model_output_received"),
      v.literal("validating_output"),
      v.literal("normalizing_schema"),
      v.literal("rendering_markup"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    progress: v.number(),
    errorMessage: v.optional(v.string()),
    resultTitle: v.optional(v.string()),
    resultSchema: v.optional(v.string()),
    resultHtml: v.optional(v.string()),
    resultCss: v.optional(v.string()),
    resultModel: v.optional(v.string()),
    resultGeneratedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  })
    .index("by_owner_session_token_hash", ["ownerSessionTokenHash"])
    .index("by_owner_status", ["ownerSessionTokenHash", "status"])
    .index("by_created", ["createdAt"]),
});
