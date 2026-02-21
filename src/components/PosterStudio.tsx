"use client";

import {
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useState,
  type JSX,
  type CSSProperties,
} from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
  Wand2,
  Download,
  Sparkles,
  RefreshCcw,
  MousePointer2,
  X,
  Paperclip,
  ArrowUp,
} from "lucide-react";
import Image from "next/image";
import { createPosterPdfFileFromElement } from "@/lib/posterPdf";
import {
  PosterElement,
  PosterSchema,
  normalizePosterSchema,
  posterSchemaToMarkup,
} from "@/lib/posterSchema";

type PosterResult = {
  title: string;
  schema: PosterSchema;
  model: string;
  generatedAt: number;
  html: string;
  css: string;
};

type ReferenceImage = {
  storageId: Id<"_storage">;
  url: string;
  fileName: string;
};
type LocalBusyState =
  | "idle"
  | "regenerating"
  | "exporting"
  | "uploading_references";
type BusyState = LocalBusyState | "generating";
type PosterElementLayerProps = {
  element: PosterElement;
  selected: boolean;
  interactive?: boolean;
};

const MAX_REFERENCE_IMAGES = 4;

type GenerationStage =
  | "queued"
  | "requesting_model"
  | "model_output_received"
  | "validating_output"
  | "normalizing_schema"
  | "rendering_markup"
  | "completed"
  | "failed";

type GenerationSnapshot = {
  stage: GenerationStage;
  progress: number;
};

const STAGE_LABELS: Record<GenerationStage, string> = {
  queued: "Queued",
  requesting_model: "Generating layout",
  model_output_received: "Processing model output",
  validating_output: "Validating poster data",
  normalizing_schema: "Normalizing layout",
  rendering_markup: "Building preview",
  completed: "Done",
  failed: "Failed",
};

interface PosterStudioProps {
  sessionToken: string;
  onCreated?: (flipbookId: string) => void;
  onClose?: () => void;
}

export function PosterStudio({
  sessionToken,
  onCreated,
  onClose,
}: PosterStudioProps): JSX.Element {
  const startPosterGeneration = useMutation(
    api.posterGenerations.startPosterGeneration,
  );
  const regeneratePosterElement = useAction(
    api.posters.regeneratePosterElement,
  );
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const validateFile = useMutation(api.files.validateFile);
  const validateImageFile = useMutation(api.files.validateImageFile);
  const deleteUploadedFile = useMutation(api.files.deleteUploadedFile);
  const createFlipbook = useMutation(api.flipbooks.create);

  const [prompt, setPrompt] = useState("");
  const [refinementPrompt, setRefinementPrompt] = useState("");
  const [poster, setPoster] = useState<PosterResult | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(
    null,
  );
  const [localBusyState, setLocalBusyState] =
    useState<LocalBusyState>("idle");
  const [activeGenerationId, setActiveGenerationId] = useState<
    Id<"posterGenerations"> | null
  >(null);
  const [generationSnapshot, setGenerationSnapshot] =
    useState<GenerationSnapshot | null>(null);
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);
  const activeGeneration = useQuery(
    api.posterGenerations.getPosterGeneration,
    activeGenerationId
      ? {
        generationId: activeGenerationId,
        sessionToken,
      }
      : "skip",
  );

  const isGenerating =
    activeGenerationId !== null &&
    (activeGeneration === undefined ||
      activeGeneration === null ||
      activeGeneration.status === "queued" ||
      activeGeneration.status === "running");
  const busyState: BusyState = isGenerating ? "generating" : localBusyState;

  const stageLabel = generationSnapshot
    ? STAGE_LABELS[generationSnapshot.stage]
    : STAGE_LABELS.queued;
  const progressValue = generationSnapshot
    ? clampProgress(generationSnapshot.progress)
    : 5;

  const selectedElement = useMemo(
    () => {
      if (!selectedElementId || !poster) {
        return null;
      }

      return (
        poster.schema.elements.find(
          (element) => element.id === selectedElementId,
        ) ?? null
      );
    },
    [poster, selectedElementId],
  );

  const deleteReferenceImage = useCallback(
    async (storageId: Id<"_storage">) => {
      await deleteUploadedFile({ sessionToken, fileId: storageId });
    },
    [deleteUploadedFile, sessionToken],
  );

  const deleteReferenceImagesBestEffort = useCallback(
    async (storageIds: Id<"_storage">[]) => {
      for (const storageId of storageIds) {
        try {
          await deleteReferenceImage(storageId);
        } catch (error) {
          console.error("Failed to delete reference image", error);
        }
      }
    },
    [deleteReferenceImage],
  );

  useEffect(() => {
    if (!activeGenerationId || !activeGeneration) {
      return;
    }

    setGenerationSnapshot({
      stage: activeGeneration.stage as GenerationStage,
      progress: activeGeneration.progress,
    });

    if (activeGeneration.status === "succeeded") {
      try {
        if (
          typeof activeGeneration.resultSchema !== "string" ||
          typeof activeGeneration.resultTitle !== "string" ||
          typeof activeGeneration.resultHtml !== "string" ||
          typeof activeGeneration.resultCss !== "string" ||
          typeof activeGeneration.resultModel !== "string" ||
          typeof activeGeneration.resultGeneratedAt !== "number"
        ) {
          throw new Error("Generation completed without a valid poster payload.");
        }

        const schema = normalizePosterSchema(
          parseGenerationSchema(activeGeneration.resultSchema),
        );
        setPoster({
          title: activeGeneration.resultTitle,
          schema,
          html: activeGeneration.resultHtml,
          css: activeGeneration.resultCss,
          model: activeGeneration.resultModel,
          generatedAt: activeGeneration.resultGeneratedAt,
        });
        setRefinementPrompt("");
        setSelectedElementId(null);
        setReferenceImages([]);
        void deleteReferenceImagesBestEffort(
          activeGeneration.referenceImageStorageIds ?? [],
        );
      } catch (error) {
        setError(
          error instanceof Error ? error.message : "Failed to load generated poster.",
        );
      } finally {
        setActiveGenerationId(null);
        setGenerationSnapshot(null);
      }
      return;
    }

    if (activeGeneration.status === "failed") {
      setError(
        activeGeneration.errorMessage ?? "Failed to generate poster.",
      );
      setActiveGenerationId(null);
      setGenerationSnapshot(null);
    }
  }, [
    activeGeneration,
    activeGenerationId,
    deleteReferenceImagesBestEffort,
  ]);

  const handleGenerate = async () => {
    const trimmed = prompt.trim();
    if (!trimmed) {
      setError("Enter a prompt to generate a poster.");
      return;
    }

    try {
      setError(null);
      setSelectedElementId(null);
      setGenerationSnapshot({
        stage: "queued",
        progress: 5,
      });
      const generationId = await startPosterGeneration({
        sessionToken,
        prompt: trimmed,
        referenceImageStorageIds:
          referenceImages.length > 0
            ? referenceImages.map((image) => image.storageId)
            : undefined,
      });
      setActiveGenerationId(generationId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate poster.",
      );
      setGenerationSnapshot(null);
    }
  };

  const handleSelect = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!previewRef.current) return;
    const target = (event.target as HTMLElement).closest<HTMLElement>(
      "[data-element-id]",
    );
    if (!target || !previewRef.current.contains(target)) return;
    setSelectedElementId(target.dataset.elementId ?? null);
  };

  const handleRegenerateElement = async () => {
    if (!poster || !selectedElementId) {
      setError("Select an element before regenerating.");
      return;
    }
    const trimmed = refinementPrompt.trim();
    if (!trimmed) {
      setError("Add a refinement prompt for the selected element.");
      return;
    }

    try {
      setLocalBusyState("regenerating");
      setError(null);
      const result = await regeneratePosterElement({
        sessionToken,
        posterSchema: JSON.stringify(poster.schema),
        elementId: selectedElementId,
        refinementPrompt: trimmed,
      });

      const schema = normalizePosterSchema(result.schema);
      const markup = posterSchemaToMarkup(schema);
      setPoster({
        title: typeof result.title === "string" ? result.title : poster.title,
        schema,
        model: typeof result.model === "string" ? result.model : poster.model,
        generatedAt:
          typeof result.generatedAt === "number"
            ? result.generatedAt
            : Date.now(),
        html: markup.html,
        css: markup.css,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to regenerate element.",
      );
    } finally {
      setLocalBusyState("idle");
    }
  };

  const handleExportPdf = async () => {
    if (!poster) return;

    try {
      setLocalBusyState("exporting");
      setError(null);

      if (!previewRef.current) {
        throw new Error("Poster preview is not ready.");
      }

      const fileName = `${slugify(poster.title || "generated-poster")}.pdf`;
      const pdfFile = await createPosterPdfFileFromElement(
        previewRef.current,
        fileName,
        poster.schema,
      );

      const uploadUrl = await generateUploadUrl({ sessionToken });
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": pdfFile.type,
        },
        body: pdfFile,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload generated PDF.");
      }

      const uploadPayload = (await uploadResponse.json()) as {
        storageId?: string;
      };
      if (!uploadPayload.storageId) {
        throw new Error("Upload response did not include a file ID.");
      }

      await validateFile({
        sessionToken,
        fileId: uploadPayload.storageId as Id<"_storage">,
      });

      const createdId = await createFlipbook({
        fileId: uploadPayload.storageId as Id<"_storage">,
        title: poster.title || "Generated Poster",
        pageCount: 1,
        fileSize: pdfFile.size,
        sessionToken,
        sourceType: "generated_poster",
        posterSchema: JSON.stringify(poster.schema),
        posterHtml: poster.html,
        posterCss: poster.css,
        generationMeta: {
          model: poster.model,
          generatedAt: poster.generatedAt,
        },
      });

      onCreated?.(createdId as string);
      onClose?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export poster.");
    } finally {
      setLocalBusyState("idle");
    }
  };

  const uploadReferenceImage = async (file: File): Promise<ReferenceImage> => {
    const uploadUrl = await generateUploadUrl({ sessionToken });
    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Content-Type": file.type,
      },
      body: file,
    });

    if (!uploadResponse.ok) {
      throw new Error("Failed to upload reference image.");
    }

    const uploadPayload = (await uploadResponse.json()) as {
      storageId?: string;
    };
    if (!uploadPayload.storageId) {
      throw new Error("Upload response did not include a file ID.");
    }

    const storageId = uploadPayload.storageId as Id<"_storage">;
    const validation = await validateImageFile({
      sessionToken,
      fileId: storageId,
    });
    if (!validation.url) {
      throw new Error("Reference image URL is unavailable.");
    }

    return {
      storageId,
      url: validation.url,
      fileName: file.name || "reference-image",
    };
  };

  const handleUploadReferenceImages = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length || busyState !== "idle") {
      return;
    }

    const remainingSlots = Math.max(0, MAX_REFERENCE_IMAGES - referenceImages.length);
    if (remainingSlots === 0) {
      setError(`You can attach up to ${MAX_REFERENCE_IMAGES} reference images.`);
      return;
    }

    const filesToUpload = files.slice(0, remainingSlots);
    if (filesToUpload.some((file) => !file.type.startsWith("image/"))) {
      setError("Only image files can be used as references.");
      return;
    }

    try {
      setLocalBusyState("uploading_references");
      setError(null);

      const uploaded: ReferenceImage[] = [];
      for (const file of filesToUpload) {
        uploaded.push(await uploadReferenceImage(file));
      }

      setReferenceImages((current) => [...current, ...uploaded]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to upload reference images.",
      );
    } finally {
      setLocalBusyState("idle");
    }
  };

  const handleRemoveReferenceImage = async (storageId: Id<"_storage">) => {
    if (busyState !== "idle") {
      return;
    }

    try {
      setError(null);
      await deleteReferenceImage(storageId);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to delete reference image.",
      );
      return;
    }

    setReferenceImages((current) =>
      current.filter((image) => image.storageId !== storageId),
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-brutal-cream w-full overflow-hidden">
      <div className="flex-1 overflow-y-auto w-full flex flex-col relative">
        {poster ? (
          <div className="p-4 md:p-8 w-full max-w-7xl mx-auto flex-1">
            <div className="grid lg:grid-cols-[minmax(0,1.5fr)_380px] gap-8">
              <div className="card p-4 md:p-8 flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-h3 uppercase truncate pr-4">{poster.title}</h3>
                  <span className="badge-free shrink-0">
                    {poster.schema.elements.length} Elements
                  </span>
                </div>

                <div
                  ref={previewRef}
                  onClick={handleSelect}
                  onKeyDown={(event) => {
                    if (busyState === "exporting") return;
                    if (event.key === "Escape") {
                      setSelectedElementId(null);
                    }
                  }}
                  role="button"
                  tabIndex={busyState === "exporting" ? -1 : 0}
                  aria-label="Poster preview. Click an element to select it for refinement."
                  className="relative w-full max-w-[600px] mx-auto border-2 border-brutal-black bg-brutal-white shadow-brutal overflow-hidden cursor-crosshair aspect-[1/1.414]"
                  style={{ backgroundColor: poster.schema.backgroundColor }}
                >
                  {poster.schema.elements
                    .slice()
                    .sort((a, b) => a.zIndex - b.zIndex)
                    .map((element) => (
                      <PosterElementLayer
                        key={element.id}
                        element={element}
                        selected={element.id === selectedElementId && busyState !== "exporting"}
                        interactive={busyState !== "exporting"}
                      />
                    ))}
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="card p-4">
                  <div className="flex items-center gap-2 mb-4 text-brutal-black/80">
                    <MousePointer2 className="w-4 h-4" />
                    <h4 className="text-sm font-bold uppercase tracking-wider">
                      Refine Element
                    </h4>
                  </div>

                  {selectedElement ? (
                    <div className="space-y-4">
                      <textarea
                        value={refinementPrompt}
                        onChange={(event) =>
                          setRefinementPrompt(event.target.value)
                        }
                        rows={3}
                        maxLength={400}
                        className="input resize-none w-full text-sm p-3"
                        placeholder="Describe how to change this element..."
                        disabled={busyState !== "idle"}
                      />
                      <button
                        type="button"
                        onClick={handleRegenerateElement}
                        disabled={busyState !== "idle" || !refinementPrompt.trim()}
                        className="btn-outline w-full py-2 text-sm flex items-center justify-center gap-2"
                      >
                        <RefreshCcw className={`w-4 h-4 ${busyState === "regenerating" ? "animate-spin" : ""}`} />
                        {busyState === "regenerating"
                          ? "Regenerating..."
                          : "Regenerate Element"}
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-6 border-2 border-dashed border-brutal-black/20">
                      <p className="text-sm text-brutal-black/60">
                        Select an element to refine it
                      </p>
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t-2 border-brutal-black/10">
                    <p className="text-xs text-brutal-black/50 flex items-center gap-1.5 font-mono">
                      <Wand2 className="w-3 h-3" />
                      {poster.model}
                    </p>
                  </div>
                </div>

              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 w-full min-h-[60vh]">
            <div className="text-center max-w-2xl mx-auto">
              <div className="w-24 h-24 mx-auto mb-8 bg-brand-yellow border-4 border-brutal-black shadow-brutal flex items-center justify-center transition-transform hover:-translate-y-1">
                {busyState === "generating" ? (
                  <RefreshCcw className="w-12 h-12 text-brutal-black animate-spin" />
                ) : (
                  <Sparkles className="w-12 h-12 text-brutal-black" />
                )}
              </div>
              <h2 className="text-h1 uppercase mb-6">Generate Poster</h2>
              <p className="text-h4 font-normal text-brutal-black/70 leading-relaxed">
                Describe the poster you want to generate. Be specific about the theme, style, text, and layout for the best results.
              </p>


              {busyState === "generating" && (
                <div className="mt-10 w-full max-w-xl mx-auto">
                  <div className="mb-3 flex items-center justify-between text-sm font-bold uppercase tracking-wider">
                    <span>{stageLabel}</span>
                    <span>{progressValue}%</span>
                  </div>
                  <div className="progress-bar h-6">
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${progressValue}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 bg-brutal-cream p-4 md:p-6 z-20 relative">
        <div className="max-w-7xl mx-auto">
          {error && (
            <div className="bg-[#ffcccc] border-2 border-brutal-black p-3 mb-4 font-bold">
              {error}
            </div>
          )}
          <div className="relative border-3 border-brutal-black bg-brutal-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all duration-150 p-4 pb-14">
            {referenceImages.length > 0 && (
              <div className="flex flex-wrap gap-3 mb-4">
                {referenceImages.map((image) => (
                  <div
                    key={image.storageId}
                    className="relative border-2 border-brutal-black bg-brutal-cream w-16 h-16 sm:w-20 sm:h-20 overflow-hidden shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                  >
                    <Image
                      src={image.url}
                      alt={image.fileName}
                      fill
                      sizes="80px"
                      className="object-cover"
                      unoptimized
                    />
                    <button
                      type="button"
                      className="absolute top-0.5 right-0.5 h-5 w-5 border-2 border-brutal-black bg-brutal-white flex items-center justify-center hover:bg-brutal-gray transition-colors shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                      onClick={() => {
                        void handleRemoveReferenceImage(image.storageId);
                      }}
                      disabled={busyState !== "idle"}
                    >
                      <X className="w-3 h-3" strokeWidth={3} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <textarea
              value={prompt}
              onChange={(event) => {
                setPrompt(event.target.value);
                event.target.style.height = "auto";
                event.target.style.height = Math.min(event.target.scrollHeight, 150) + "px";
              }}
              rows={1}
              className="w-full bg-transparent outline-none ring-0 focus:outline-none focus:ring-0 resize-none text-lg leading-loose placeholder-brutal-black/50 py-2"
              placeholder="What kind of poster do you want to create?"
              disabled={busyState !== "idle"}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (prompt.trim() && busyState === "idle") {
                    handleGenerate();
                  }
                }
              }}
              style={{ minHeight: "24px" }}
            />

            <div className="absolute left-4 bottom-3 flex items-center gap-3">
              <input
                ref={referenceInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                multiple
                className="hidden"
                onChange={handleUploadReferenceImages}
                disabled={busyState !== "idle"}
              />
              <button
                type="button"
                onClick={() => referenceInputRef.current?.click()}
                disabled={busyState !== "idle" || referenceImages.length >= MAX_REFERENCE_IMAGES}
                className="border-2 border-brutal-black bg-brutal-white font-bold uppercase tracking-wider py-1.5 px-4 flex items-center gap-2 text-brutal-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all disabled:opacity-50 disabled:pointer-events-none"
              >
                {busyState === "uploading_references" ? (
                  <RefreshCcw className="w-4 h-4 animate-spin" strokeWidth={2.5} />
                ) : (
                  <Paperclip className="w-4 h-4" strokeWidth={2.5} />
                )}
                <span className="text-sm">Attach</span>
              </button>
            </div>

            <div className="absolute right-4 bottom-3 flex items-center gap-3">
              {poster && (
                <button
                  type="button"
                  onClick={handleExportPdf}
                  disabled={busyState !== "idle"}
                  className="border-2 border-brutal-black bg-brutal-white font-bold uppercase tracking-wider py-1.5 px-4 flex items-center gap-2 text-brutal-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all disabled:opacity-50 disabled:pointer-events-none"
                  title="Export as PDF"
                >
                  <Download className="w-4 h-4" strokeWidth={2.5} />
                  <span className="hidden sm:inline-block text-sm">Export</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleGenerate}
                disabled={busyState !== "idle" || !prompt.trim()}
                className="bg-brutal-black text-brutal-white flex items-center justify-center w-10 h-10 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.2)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] active:translate-x-[3px] active:translate-y-[3px] transition-all disabled:opacity-50 disabled:pointer-events-none"
              >
                {busyState === "generating" ? (
                  <RefreshCcw className="w-5 h-5 animate-spin" strokeWidth={3} />
                ) : (
                  <ArrowUp className="w-5 h-5" strokeWidth={3} />
                )}
              </button>
            </div>
          </div>

          <div className="mt-4 text-center sm:text-right">
            <p className="text-xs font-bold text-brutal-black/40 uppercase tracking-widest flex items-center justify-end gap-2">
              <span>Press</span>
              <kbd className="font-mono bg-brutal-gray/50 text-brutal-black px-1.5 py-0.5 shadow-[1px_1px_0px_0px_rgba(0,0,0,0.5)]">Return</kbd>
              <span>to send</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PosterElementLayer({
  element,
  selected,
  interactive = true,
}: PosterElementLayerProps): JSX.Element {
  const sharedStyle: CSSProperties = {
    position: "absolute",
    left: `${element.x}%`,
    top: `${element.y}%`,
    width: `${element.width}%`,
    height: `${element.height}%`,
    zIndex: element.zIndex,
    opacity: element.opacity,
  };

  const interactiveClasses = getPosterElementInteractiveClasses(
    interactive,
    selected,
  );

  if (element.type === "shape") {
    return (
      <div
        data-element-id={element.id}
        className={interactiveClasses}
        style={{
          ...sharedStyle,
          backgroundColor: element.backgroundColor,
          borderWidth: element.borderWidth ?? 0,
          borderStyle: "solid",
          borderColor: element.borderColor ?? "transparent",
          borderRadius: element.borderRadius ?? 0,
        }}
      />
    );
  }

  const align = element.align ?? "center";
  const justifyContent = alignToJustifyContent(align);

  return (
    <div
      data-element-id={element.id}
      className={interactiveClasses}
      style={{
        ...sharedStyle,
        color: element.color,
        fontSize: `${element.fontSize ?? 24}px`,
        fontWeight: element.fontWeight ?? "normal",
        lineHeight: element.lineHeight ?? 1.1,
        letterSpacing: `${element.letterSpacing ?? 0}px`,
        textAlign: align,
        display: "flex",
        alignItems: "center",
        justifyContent,
        padding: "2px 4px",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      {element.text}
    </div>
  );
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "generated-poster"
  );
}

function getPosterElementInteractiveClasses(
  interactive: boolean,
  selected: boolean,
): string {
  if (!interactive) {
    return "";
  }
  if (selected) {
    return "transition-all duration-150 cursor-pointer before:absolute before:-inset-1 before:pointer-events-none before:transition-colors outline outline-2 outline-blue-600 outline-offset-1 before:bg-blue-500/20";
  }
  return "transition-all duration-150 cursor-pointer before:absolute before:-inset-1 before:pointer-events-none before:transition-colors hover:outline hover:outline-2 hover:outline-blue-400 hover:outline-offset-1 hover:before:bg-blue-400/10";
}

function alignToJustifyContent(
  align: "left" | "center" | "right",
): "flex-start" | "center" | "flex-end" {
  if (align === "left") {
    return "flex-start";
  }
  if (align === "right") {
    return "flex-end";
  }
  return "center";
}

function parseGenerationSchema(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Generated poster schema is invalid JSON.");
  }
}

function clampProgress(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
