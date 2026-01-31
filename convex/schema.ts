import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  flipbooks: defineTable({
    anonymousId: v.string(),
    fileId: v.id("_storage"),
    title: v.string(),
    pageCount: v.number(),
    fileSize: v.number(),
    isPublic: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_anonymous_id", ["anonymousId"])
    .index("by_created", ["createdAt"]),

  anonymousSessions: defineTable({
    sessionId: v.string(),
    flipbookIds: v.array(v.id("flipbooks")),
    createdAt: v.number(),
    lastActiveAt: v.number(),
  }).index("by_session_id", ["sessionId"]),

  uploadRateLimits: defineTable({
    identifier: v.string(),
    uploadCount: v.number(),
    windowStart: v.number(),
  }).index("by_identifier", ["identifier"]),
});
