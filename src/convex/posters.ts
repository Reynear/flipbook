"use node";

import { v } from "convex/values";
import { createOpenAI } from "@ai-sdk/openai";
import type { ModelMessage } from "ai";
import { type as ark } from "arktype";
import { Agent } from "@convex-dev/agent";
import {
  action,
  internalAction,
  type ActionCtx,
} from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { components, internal } from "./_generated/api";
import { hashSessionToken } from "./lib/session";

const MAX_REFINEMENT_LENGTH = 400;
const DEFAULT_POSTER_WIDTH = 1000;
const DEFAULT_POSTER_HEIGHT = 1414;

type PosterElementType = "text" | "shape";
type HorizontalAlign = "left" | "center" | "right";
type FlexJustifyContent = "flex-start" | "center" | "flex-end";
type PosterGenerationStatus = "queued" | "running" | "succeeded" | "failed";
type PosterGenerationStage =
  | "queued"
  | "requesting_model"
  | "model_output_received"
  | "validating_output"
  | "normalizing_schema"
  | "rendering_markup"
  | "completed"
  | "failed";
type PosterGenerationPatch = {
  status?: PosterGenerationStatus;
  stage?: PosterGenerationStage;
  progress?: number;
  errorMessage?: string;
  resultTitle?: string;
  resultSchema?: string;
  resultHtml?: string;
  resultCss?: string;
  resultModel?: string;
  resultGeneratedAt?: number;
  startedAt?: number;
  completedAt?: number;
};

type PosterElement = {
  id: string;
  type: PosterElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  opacity: number;
  text?: string;
  fontSize?: number;
  fontWeight?: "normal" | "bold";
  color?: string;
  align?: HorizontalAlign;
  lineHeight?: number;
  letterSpacing?: number;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
};

type PosterSchema = {
  version: 1;
  title: string;
  width: number;
  height: number;
  backgroundColor: string;
  elements: PosterElement[];
};

const posterElementValidator = ark({
  id: "string",
  type: "'text' | 'shape'",
  x: "number | string",
  y: "number | string",
  width: "number | string",
  height: "number | string",
  zIndex: "number | string?",
  opacity: "number | string?",
  text: "string?",
  fontSize: "number | string?",
  fontWeight: "'normal' | 'bold'?",
  color: "string?",
  align: "'left' | 'center' | 'right'?",
  lineHeight: "number | string?",
  letterSpacing: "number | string?",
  backgroundColor: "string?",
  borderColor: "string?",
  borderWidth: "number | string?",
  borderRadius: "number | string?",
});

const posterOutputValidator = ark({
  title: "string",
  backgroundColor: "string",
  elements: posterElementValidator.array(),
});

const posterElementRefinementValidator = ark({
  element: posterElementValidator,
});

type ModelPromptInput = {
  systemPrompt: string;
  userPrompt: string;
  referenceImages: {
    url: string;
    mediaType: string;
  }[];
};

function buildGeneratePosterPrompts(
  prompt: string,
  referenceImages: { url: string; mediaType: string }[],
): ModelPromptInput {
  let referenceImageInstruction = "";
  if (referenceImages.length > 0) {
    referenceImageInstruction =
      `Use the ${referenceImages.length} uploaded reference image(s) for style and composition guidance. `;
  }

  return {
    systemPrompt:
      "Return ONLY valid JSON. Design a single-page print poster layout with stable element IDs. " +
      "No markdown. No script tags. No URLs. Use text and shape elements only.",
    userPrompt:
      `Create a visually strong poster from this request: "${prompt}". ` +
      referenceImageInstruction +
      "Output schema: { title, backgroundColor, elements: PosterElement[] }. " +
      "Each element needs: id, type(text|shape), x, y, width, height as percentages (0-100). " +
      "For text: text, fontSize, fontWeight(normal|bold), color, align(left|center|right), lineHeight, letterSpacing. " +
      "For shape: backgroundColor, borderColor, borderWidth, borderRadius. " +
      "Include 4-10 elements total.",
    referenceImages,
  };
}

async function callModelObject(
  ctx: ActionCtx,
  sessionTokenHash: string,
  input: ModelPromptInput,
): Promise<unknown> {
  await ctx.runMutation(internal.posterInternal.consumeLlmQuota, {
    sessionTokenHash,
  });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const baseUrl = normalizeOpenAIBaseUrl(
    process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
  );
  const model = getModel();
  const timeoutMs = Number(process.env.OPENAI_TIMEOUT_MS ?? "90000");
  const maxAttempts = 2;
  const openai = createOpenAI({
    apiKey,
    baseURL: baseUrl,
  });
  const posterAgent = new Agent(components.agent, {
    name: "Poster Designer",
    languageModel: openai.chat(model),
    instructions:
      "You are a poster design agent. Produce concise, valid JSON only.",
  });
  const { threadId } = await posterAgent.createThread(ctx, {
    userId: sessionTokenHash,
    title: "Poster Generation",
  });
  const threadOpts = { userId: sessionTokenHash, threadId };
  const prompt = buildModelPrompt(input);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const { object } = await posterAgent.generateObject(ctx, threadOpts, {
        output: "no-schema",
        system: input.systemPrompt,
        prompt,
        maxRetries: 0,
        abortSignal: controller.signal,
      });
      return object;
    } catch (error) {
      const isAbort =
        error instanceof Error &&
        (error.name === "AbortError" ||
          /aborted|timed out|timeout/i.test(error.message));

      if (isAbort && attempt < maxAttempts) {
        continue;
      }

      if (isAbort) {
        throw new Error(
          `Model request timed out after ${timeoutMs}ms. Try again or set OPENAI_TIMEOUT_MS higher.`,
        );
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error("Model request failed after retries.");
}

function buildModelPrompt(input: ModelPromptInput): ModelMessage[] {
  const content: Array<
    { type: "text"; text: string } | { type: "image"; image: URL; mediaType: string }
  > = [{ type: "text", text: input.userPrompt }];

  for (const referenceImage of input.referenceImages) {
    try {
      content.push({
        type: "image",
        image: new URL(referenceImage.url),
        mediaType: referenceImage.mediaType,
      });
    } catch {
      continue;
    }
  }

  return [
    {
      role: "user",
      content,
    },
  ];
}

export const runPosterGeneration = internalAction({
  args: {
    generationId: v.id("posterGenerations"),
  },
  handler: async (ctx, args) => {
    const generation = await ctx.runQuery(
      internal.posterGenerations.getPosterGenerationInternal,
      { generationId: args.generationId },
    );
    if (!generation) {
      return;
    }
    if (generation.status === "succeeded" || generation.status === "failed") {
      return;
    }

    const startedAt = generation.startedAt ?? Date.now();
    const update = async (patch: PosterGenerationPatch): Promise<void> => {
      await ctx.runMutation(
        internal.posterGenerations.patchPosterGenerationInternal,
        {
          generationId: args.generationId,
          ...patch,
        },
      );
    };

    if (!generation.ownerSessionTokenHash) {
      await update({
        status: "failed",
        stage: "failed",
        progress: 100,
        errorMessage: "Session token is missing for this generation.",
        completedAt: Date.now(),
      });
      return;
    }

    try {
      await update({
        status: "running",
        stage: "requesting_model",
        progress: 20,
        startedAt,
      });

      const referenceImages = await loadGenerationReferenceImages(
        ctx,
        generation.referenceImageStorageIds ?? [],
      );

      const responseRaw = await callModelObject(
        ctx,
        generation.ownerSessionTokenHash,
        buildGeneratePosterPrompts(generation.prompt, referenceImages),
      );

      await update({
        stage: "model_output_received",
        progress: 60,
      });

      await update({
        stage: "validating_output",
        progress: 72,
      });
      const response = posterOutputValidator(responseRaw);
      if (response instanceof ark.errors) {
        throw new Error(
          `Invalid model output for poster generation: ${response.summary}`,
        );
      }

      await update({
        stage: "normalizing_schema",
        progress: 84,
      });
      const normalized = normalizePosterSchema(response);

      await update({
        stage: "rendering_markup",
        progress: 92,
      });
      const markup = renderPosterMarkup(normalized);

      const generatedAt = Date.now();
      await update({
        status: "succeeded",
        stage: "completed",
        progress: 100,
        resultTitle: normalized.title,
        resultSchema: JSON.stringify(normalized),
        resultHtml: markup.html,
        resultCss: markup.css,
        resultModel: getModel(),
        resultGeneratedAt: generatedAt,
        completedAt: generatedAt,
      });
    } catch (error) {
      await update({
        status: "failed",
        stage: "failed",
        progress: 100,
        errorMessage:
          error instanceof Error ? error.message : "Poster generation failed.",
        completedAt: Date.now(),
      });
    }
  },
});

export const regeneratePosterElement = action({
  args: {
    sessionToken: v.string(),
    posterSchema: v.string(),
    elementId: v.string(),
    refinementPrompt: v.string(),
  },
  handler: async (ctx, args) => {
    const sessionTokenHash = await hashSessionToken(args.sessionToken);
    const refinementPrompt = args.refinementPrompt.trim();
    if (!refinementPrompt) {
      throw new Error("Refinement prompt is required.");
    }
    if (refinementPrompt.length > MAX_REFINEMENT_LENGTH) {
      throw new Error(
        `Refinement prompt must be ${MAX_REFINEMENT_LENGTH} characters or fewer.`,
      );
    }

    const currentSchema = normalizePosterSchema(
      parseJsonString(args.posterSchema),
    );
    const selected = currentSchema.elements.find(
      (element) => element.id === args.elementId,
    );
    if (!selected) {
      throw new Error("Selected element was not found.");
    }

    const responseRaw = await callModelObject(ctx, sessionTokenHash, {
      systemPrompt:
        "Return ONLY valid JSON for one element. No markdown. Keep id/type unchanged unless impossible.",
      userPrompt:
        `Current schema: ${JSON.stringify(currentSchema)}\n` +
        `Selected element: ${JSON.stringify(selected)}\n` +
        `Refinement request: "${refinementPrompt}"\n` +
        "Return: { element: PosterElement }",
      referenceImages: [],
    });
    const response = posterElementRefinementValidator(responseRaw);
    if (response instanceof ark.errors) {
      throw new Error(
        `Invalid model output for element refinement: ${response.summary}`,
      );
    }

    const candidate = normalizeSingleElement(response.element, selected.id);
    const mergedElement: PosterElement = {
      ...selected,
      ...candidate,
      id: selected.id,
      type: selected.type,
    };

    const nextSchema: PosterSchema = {
      ...currentSchema,
      elements: currentSchema.elements.map((element) =>
        element.id === selected.id ? mergedElement : element,
      ),
    };

    const markup = renderPosterMarkup(nextSchema);

    return {
      title: nextSchema.title,
      schema: nextSchema,
      html: markup.html,
      css: markup.css,
      model: getModel(),
      generatedAt: Date.now(),
    };
  },
});

function getModel(): string {
  return process.env.OPENAI_MODEL ?? "gpt-4o-mini";
}

async function loadGenerationReferenceImages(
  ctx: ActionCtx,
  storageIds: Id<"_storage">[],
): Promise<{ url: string; mediaType: string }[]> {
  const references: { url: string; mediaType: string }[] = [];

  for (const storageId of storageIds) {
    const [url, metadata] = await Promise.all([
      ctx.storage.getUrl(storageId),
      ctx.storage.getMetadata(storageId),
    ]);
    const mediaType = metadata?.contentType ?? "";
    if (!url || !mediaType.startsWith("image/")) {
      continue;
    }
    references.push({ url, mediaType });
  }

  return references;
}

function normalizeOpenAIBaseUrl(rawBaseUrl: string): string {
  const trimmed = rawBaseUrl.trim().replace(/\/+$/, "");
  return trimmed
    .replace(/\/chat\/completions$/i, "")
    .replace(/\/responses$/i, "");
}

function parseJsonString(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Poster schema is invalid JSON.");
  }
}

function normalizePosterSchema(value: unknown): PosterSchema {
  const source = (value ?? {}) as Record<string, unknown>;
  const rawElements = Array.isArray(source.elements) ? source.elements : [];
  const title = normalizeText(source.title, "Generated Poster");
  const backgroundColor = normalizeColor(source.backgroundColor, "#f5f5f4");

  const elements = rawElements.map((element, index) =>
    normalizeSingleElement(element, `el_${index + 1}`),
  );

  if (!elements.length) {
    throw new Error("Model response did not include any renderable elements.");
  }

  return {
    version: 1,
    title,
    width: DEFAULT_POSTER_WIDTH,
    height: DEFAULT_POSTER_HEIGHT,
    backgroundColor,
    elements,
  };
}

function normalizeSingleElement(
  value: unknown,
  fallbackId: string,
): PosterElement {
  const source = (value ?? {}) as Record<string, unknown>;
  const type = source.type === "shape" ? "shape" : "text";

  const base: PosterElement = {
    id: normalizeElementId(source.id, fallbackId),
    type,
    x: clampNumber(source.x, 0, 0, 100),
    y: clampNumber(source.y, 0, 0, 100),
    width: clampNumber(source.width, 30, 5, 100),
    height: clampNumber(source.height, type === "shape" ? 20 : 12, 4, 100),
    zIndex: clampNumber(source.zIndex, 1, 0, 20),
    opacity: clampNumber(source.opacity, 1, 0.2, 1),
  };

  if (type === "shape") {
    return {
      ...base,
      backgroundColor: normalizeColor(source.backgroundColor, "#111827"),
      borderColor: normalizeColor(source.borderColor, "#111827"),
      borderWidth: clampNumber(source.borderWidth, 0, 0, 8),
      borderRadius: clampNumber(source.borderRadius, 0, 0, 64),
    };
  }
  return {
    ...base,
    text: normalizeText(source.text, "Poster"),
    fontSize: clampNumber(source.fontSize, 48, 10, 120),
    fontWeight: source.fontWeight === "bold" ? "bold" : "normal",
    color: normalizeColor(source.color, "#111827"),
    align: normalizeAlign(source.align),
    lineHeight: clampNumber(source.lineHeight, 1.1, 0.8, 2),
    letterSpacing: clampNumber(source.letterSpacing, 0, -2, 12),
  };
}

function normalizeText(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const sanitized = value.replace(/[<>]/g, "").trim();
  return sanitized || fallback;
}

function normalizeElementId(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const sanitized = value
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_")
    .slice(0, 40);
  return sanitized || fallback;
}

function normalizeColor(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const color = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(color) || /^#[0-9a-fA-F]{3}$/.test(color)) {
    return color;
  }
  if (/^rgb\(\d{1,3},\s?\d{1,3},\s?\d{1,3}\)$/.test(color)) {
    return color;
  }
  return fallback;
}

function clampNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

function renderPosterMarkup(schema: PosterSchema): { html: string; css: string } {
  const html = [
    '<div class="poster-root">',
    ...schema.elements.map((element) => renderElementHtml(element)),
    "</div>",
  ].join("");

  const css = [
    ".poster-root{position:relative;width:100%;height:100%;overflow:hidden;}",
    `.poster-root{background:${schema.backgroundColor};}`,
    ".poster-element{position:absolute;box-sizing:border-box;white-space:pre-wrap;word-break:break-word;}",
    ".poster-text{display:flex;align-items:center;}",
    ...schema.elements.map((element) => renderElementCss(element)),
  ].join("");

  return { html, css };
}

function renderElementHtml(element: PosterElement): string {
  const classes =
    element.type === "shape"
      ? "poster-element poster-shape"
      : "poster-element poster-text";

  if (element.type === "text") {
    return `<div class="${classes}" data-element-id="${element.id}">${escapeHtml(
      element.text ?? "",
    )}</div>`;
  }
  return `<div class="${classes}" data-element-id="${element.id}"></div>`;
}

function renderElementCss(element: PosterElement): string {
  const base = [
    `[data-element-id="${element.id}"]{`,
    `left:${element.x}%;top:${element.y}%;width:${element.width}%;height:${element.height}%;`,
    `z-index:${element.zIndex};opacity:${element.opacity};`,
  ];

  if (element.type === "shape") {
    base.push(
      `background:${element.backgroundColor};`,
      `border:${element.borderWidth ?? 0}px solid ${element.borderColor ?? "transparent"};`,
      `border-radius:${element.borderRadius ?? 0}px;`,
    );
  } else {
    const align = element.align ?? "center";
    const justifyContent = alignToJustifyContent(align);

    base.push(
      `color:${element.color};`,
      `font-size:${element.fontSize}px;`,
      `font-weight:${element.fontWeight};`,
      `line-height:${element.lineHeight};`,
      `letter-spacing:${element.letterSpacing}px;`,
      `justify-content:${justifyContent};`,
      `text-align:${align};`,
    );
  }

  base.push("}");
  return base.join("");
}

function normalizeAlign(value: unknown): HorizontalAlign {
  if (value === "left" || value === "right") {
    return value;
  }
  return "center";
}

function alignToJustifyContent(align: HorizontalAlign): FlexJustifyContent {
  if (align === "left") {
    return "flex-start";
  }
  if (align === "right") {
    return "flex-end";
  }
  return "center";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
