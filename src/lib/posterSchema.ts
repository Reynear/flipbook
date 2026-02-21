export type PosterElementType = "text" | "shape";
type HorizontalAlign = "left" | "center" | "right";
type FlexJustifyContent = "flex-start" | "center" | "flex-end";

export type PosterElement = {
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

export type PosterSchema = {
  version: 1;
  title: string;
  width: number;
  height: number;
  backgroundColor: string;
  elements: PosterElement[];
};

const DEFAULT_WIDTH = 1000;
const DEFAULT_HEIGHT = 1414;

export function normalizePosterSchema(value: unknown): PosterSchema {
  const source = (value ?? {}) as Record<string, unknown>;
  const rawElements = Array.isArray(source.elements) ? source.elements : [];

  const elements = rawElements.map((element, index) =>
    normalizePosterElement(element, `el_${index + 1}`),
  );

  if (!elements.length) {
    throw new Error("Poster is empty.");
  }

  return {
    version: 1,
    title: normalizeText(source.title, "Generated Poster"),
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    backgroundColor: normalizeColor(source.backgroundColor, "#f5f5f4"),
    elements,
  };
}

export function normalizePosterElement(
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

export function posterSchemaToMarkup(
  schema: PosterSchema,
): { html: string; css: string } {
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
