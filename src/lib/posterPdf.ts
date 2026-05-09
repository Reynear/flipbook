import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import type { PosterSchema } from "$lib/posterSchema";

const A4_PORTRAIT: [number, number] = [210, 297];

export async function createPosterPdfFileFromElement(
  element: HTMLElement,
  fileName: string,
  schemaFallback?: PosterSchema,
): Promise<File> {
  try {
    const dataUrl = await toPng(element, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: "#ffffff",
    });

    const { width: imageWidth, height: imageHeight } =
      await readImageDimensions(dataUrl);
    const [pageWidth, pageHeight] = A4_PORTRAIT;

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const scale = Math.min(pageWidth / imageWidth, pageHeight / imageHeight);
    const drawWidth = imageWidth * scale;
    const drawHeight = imageHeight * scale;
    const x = (pageWidth - drawWidth) / 2;
    const y = (pageHeight - drawHeight) / 2;

    pdf.addImage(
      dataUrl,
      "PNG",
      x,
      y,
      drawWidth,
      drawHeight,
      undefined,
      "FAST",
    );

    const blob = pdf.output("blob");
    return new File([blob], fileName, { type: "application/pdf" });
  } catch (error) {
    if (!schemaFallback) {
      throw error;
    }
    return createPosterPdfFileFromSchema(schemaFallback, fileName);
  }
}

export function createPosterPdfFileFromSchema(
  schema: PosterSchema,
  fileName: string,
): File {
  const [pageWidth, pageHeight] = A4_PORTRAIT;
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const sorted = [...schema.elements].sort((a, b) => a.zIndex - b.zIndex);

  const bgColor = parseColor(schema.backgroundColor);
  pdf.setFillColor(bgColor.r, bgColor.g, bgColor.b);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");

  for (const element of sorted) {
    const x = (element.x / 100) * pageWidth;
    const y = (element.y / 100) * pageHeight;
    const w = (element.width / 100) * pageWidth;
    const h = (element.height / 100) * pageHeight;

    if (element.type === "shape") {
      const fill = parseColor(element.backgroundColor ?? "#111827");
      const stroke = parseColor(element.borderColor ?? "#111827");
      const borderWidth = Math.max(0, element.borderWidth ?? 0);

      pdf.setFillColor(fill.r, fill.g, fill.b);
      if (borderWidth > 0) {
        pdf.setDrawColor(stroke.r, stroke.g, stroke.b);
        pdf.setLineWidth(Math.max(0.2, borderWidth * 0.2));
        pdf.rect(x, y, w, h, "FD");
      } else {
        pdf.rect(x, y, w, h, "F");
      }
      continue;
    }
    const font = element.fontWeight === "bold" ? "bold" : "normal";
    const fontSizePx = Math.max(10, element.fontSize ?? 48);
    const fontSizeMm = Math.max(
      6,
      (fontSizePx / schema.width) * pageWidth * 2.2,
    );
    const lineHeight = Math.max(1, element.lineHeight ?? 1.1);
    const text = (element.text ?? "").trim();
    if (!text) continue;

    const color = parseColor(element.color ?? "#111827");
    pdf.setTextColor(color.r, color.g, color.b);
    pdf.setFont("helvetica", font);
    pdf.setFontSize(fontSizeMm);

    const maxWidth = Math.max(10, w);
    const lines = pdf.splitTextToSize(text, maxWidth);
    const maxLines = Math.max(1, Math.floor(h / (fontSizeMm * lineHeight)));
    const cropped = lines.slice(0, maxLines);

    const align = element.align ?? "center";
    const anchorX = getTextAnchorX(align, x, w);
    const anchorY = y + fontSizeMm;

    pdf.text(cropped, anchorX, anchorY, {
      align: align as "left" | "center" | "right",
      baseline: "top",
      maxWidth,
      lineHeightFactor: lineHeight,
    });
  }

  const blob = pdf.output("blob");
  return new File([blob], fileName, { type: "application/pdf" });
}

function readImageDimensions(
  dataUrl: string,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.width, height: image.height });
    image.onerror = () =>
      reject(new Error("Unable to read generated poster image."));
    image.src = dataUrl;
  });
}

function parseColor(raw: string): { r: number; g: number; b: number } {
  const value = raw.trim();
  if (value.startsWith("#")) {
    const hex =
      value.length === 4
        ? `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`
        : value;
    const r = Number.parseInt(hex.slice(1, 3), 16);
    const g = Number.parseInt(hex.slice(3, 5), 16);
    const b = Number.parseInt(hex.slice(5, 7), 16);
    if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) {
      return { r, g, b };
    }
  }

  const rgb = value.match(/^rgb\((\d{1,3}),\s?(\d{1,3}),\s?(\d{1,3})\)$/);
  if (rgb) {
    return {
      r: clamp(Number(rgb[1])),
      g: clamp(Number(rgb[2])),
      b: clamp(Number(rgb[3])),
    };
  }

  return { r: 17, g: 24, b: 39 };
}

function getTextAnchorX(
  align: "left" | "center" | "right",
  x: number,
  width: number,
): number {
  if (align === "left") {
    return x;
  }
  if (align === "right") {
    return x + width;
  }
  return x + width / 2;
}

function clamp(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(255, Math.max(0, Math.round(value)));
}
