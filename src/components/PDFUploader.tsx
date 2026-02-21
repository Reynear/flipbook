"use client";

import { useState, useRef, useCallback, type JSX } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import {
  Upload,
  FileText,
  X,
  AlertCircle,
  CheckCircle,
  Image as ImageIcon,
} from "lucide-react";
import { jsPDF } from "jspdf";
import { cn } from "@/lib/utils";

GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

interface PDFUploaderProps {
  onUploadComplete: (fileId: string, pageCount: number) => void | Promise<void>;
  disabled?: boolean;
  maxSize?: number;
  sessionToken: string;
}

type UploadState = "idle" | "selected" | "uploading" | "processing" | "success" | "error";
type UploadKind = "pdf" | "image";
const FILE_INPUT_ACCEPT =
  ".pdf,application/pdf,image/png,image/jpeg,image/webp,image/gif";
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function stripFileExtension(fileName: string): string {
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Unable to read image file."));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to decode image."));
    image.src = dataUrl;
  });
}

async function convertImageToPdf(file: File): Promise<File> {
  const imageDataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(imageDataUrl);

  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Unable to process image.");
  }
  context.drawImage(image, 0, 0);
  const pngDataUrl = canvas.toDataURL("image/png");

  const isLandscape = image.naturalWidth > image.naturalHeight;
  const pageWidth = isLandscape ? 297 : 210;
  const pageHeight = isLandscape ? 210 : 297;

  const pdf = new jsPDF({
    orientation: isLandscape ? "landscape" : "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const scale = Math.min(
    pageWidth / image.naturalWidth,
    pageHeight / image.naturalHeight,
  );
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  const x = (pageWidth - drawWidth) / 2;
  const y = (pageHeight - drawHeight) / 2;

  pdf.addImage(
    pngDataUrl,
    "PNG",
    x,
    y,
    drawWidth,
    drawHeight,
    undefined,
    "FAST",
  );

  const blob = pdf.output("blob");
  const name = `${stripFileExtension(file.name) || "image"}.pdf`;
  return new File([blob], name, { type: "application/pdf" });
}

function getUploaderSurfaceClassName(params: {
  disabled: boolean;
  isDragging: boolean;
  state: UploadState;
  isUploading: boolean;
}): string {
  if (params.disabled) {
    return "upload-zone-disabled";
  }
  if (params.isDragging) {
    return "upload-zone-active";
  }
  if (params.state === "error") {
    return "border-3 border-solid border-brand-red bg-brand-red/10 p-12 flex flex-col items-center justify-center gap-4 text-center cursor-pointer";
  }
  if (params.state === "success") {
    return "border-3 border-solid border-success bg-success/10 p-12 flex flex-col items-center justify-center gap-4 text-center shadow-brutal";
  }
  if (params.isUploading) {
    return "border-3 border-solid border-brand-blue bg-brand-blue/5 p-12 flex flex-col items-center justify-center gap-4 text-center shadow-brutal";
  }
  return "upload-zone hover:-translate-y-1 hover:-translate-x-1 hover:shadow-brutal hover:border-solid hover:bg-brand-yellow/10";
}

function getUploadStatusLabel(
  state: UploadState,
  progress: number,
  uploadKind: UploadKind | null,
): string {
  if (state === "uploading") {
    return `Uploading... ${progress}%`;
  }
  if (state === "processing") {
    if (uploadKind === "image") {
      return "Converting image to PDF...";
    }
    return "Processing PDF...";
  }
  if (state === "selected") {
    return "Starting upload...";
  }
  return "";
}

export function PDFUploader({
  onUploadComplete,
  disabled = false,
  maxSize = 20 * 1024 * 1024,
  sessionToken,
}: PDFUploaderProps): JSX.Element {
  const [state, setState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploadKind, setUploadKind] = useState<UploadKind | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const validateFile = useMutation(api.files.validateFile);

  const resetUploader = useCallback(() => {
    setState("idle");
    setProgress(0);
    setError(null);
    setFileName(null);
    setUploadKind(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const validateUploadFile = useCallback(
    (file: File): string | null => {
      if (
        file.type !== "application/pdf" &&
        !ALLOWED_IMAGE_MIME_TYPES.has(file.type)
      ) {
        return "Please select a PDF, JPG, PNG, WEBP, or GIF file";
      }
      if (file.size > maxSize) {
        return `File size exceeds ${Math.round(maxSize / (1024 * 1024))}MB limit`;
      }
      return null;
    },
    [maxSize]
  );

  const countPages = async (file: File): Promise<number> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await getDocument({ data: arrayBuffer }).promise;
    return pdf.numPages;
  };

  const handleUpload = useCallback(
    async (file: File) => {
      const validationError = validateUploadFile(file);
      if (validationError) {
        setError(validationError);
        setState("error");
        return;
      }

      const kind: UploadKind =
        file.type === "application/pdf" ? "pdf" : "image";

      setFileName(file.name);
      setUploadKind(kind);
      setState("selected");
      setError(null);

      try {
        let fileToUpload = file;
        let pageCount = 1;

        if (kind === "image") {
          setState("processing");
          setProgress(5);
          fileToUpload = await convertImageToPdf(file);
          if (fileToUpload.size > maxSize) {
            throw new Error(
              `Converted PDF exceeds ${Math.round(maxSize / (1024 * 1024))}MB limit`,
            );
          }
        }

        setState("uploading");
        setProgress(10);

        const uploadUrl = await generateUploadUrl({ sessionToken });

        const xhr = new XMLHttpRequest();
        
        await new Promise<void>((resolve, reject) => {
          xhr.upload.addEventListener("progress", (event) => {
            if (event.lengthComputable) {
              const percentComplete = Math.round((event.loaded / event.total) * 70) + 10;
              setProgress(percentComplete);
            }
          });

          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error("Upload failed"));
            }
          });

          xhr.addEventListener("error", () => reject(new Error("Upload failed")));
          xhr.open("POST", uploadUrl);
          xhr.setRequestHeader("Content-Type", fileToUpload.type);
          xhr.send(fileToUpload);
        });

        setProgress(85);

        const response = JSON.parse(xhr.responseText);
        const storageId = response.storageId;

        await validateFile({
          sessionToken,
          fileId: storageId,
        });

        setProgress(92);

        if (kind === "pdf") {
          setState("processing");
          pageCount = await countPages(fileToUpload);
        }

        setProgress(100);
        setState("success");

        await onUploadComplete(storageId, pageCount);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
        setState("error");
      }
    },
    [generateUploadUrl, validateFile, validateUploadFile, onUploadComplete, sessionToken, maxSize]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) setIsDragging(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;

      const file = e.dataTransfer.files[0];
      if (file) handleUpload(file);
    },
    [disabled, handleUpload]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleUpload(file);
    },
    [handleUpload]
  );

  const handleClick = useCallback(() => {
    if (!disabled && state === "idle") {
      fileInputRef.current?.click();
    }
  }, [disabled, state]);

  const isUploading = state === "uploading" || state === "processing" || state === "selected";
  const isDropzoneInteractive = !disabled && state === "idle";
  const uploaderSurfaceClassName = getUploaderSurfaceClassName({
    disabled,
    isDragging,
    state,
    isUploading,
  });

  return (
    <div className="w-full max-w-xl mx-auto">
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onKeyDown={(event) => {
          if (!isDropzoneInteractive) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleClick();
          }
        }}
        role="button"
        tabIndex={isDropzoneInteractive ? 0 : -1}
        aria-disabled={!isDropzoneInteractive}
        className={cn(
          "relative transition-all duration-150 ease-brutal",
          uploaderSurfaceClassName,
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={FILE_INPUT_ACCEPT}
          onChange={handleFileSelect}
          disabled={disabled || state !== "idle"}
          className="hidden"
        />

        {state === "idle" && (
          <>
            <div
              className={cn(
                "p-4 border-3 border-brutal-black bg-brand-blue transition-all duration-150 ease-brutal",
                isDragging && "-translate-y-1 -translate-x-1 shadow-brutal-sm"
              )}
            >
              <Upload
                className={cn(
                  "w-10 h-10 text-brutal-white transition-transform duration-150 ease-brutal",
                  isDragging && "scale-110"
                )}
                strokeWidth={3}
              />
            </div>
            <div>
              <p className="text-h4 font-bold uppercase tracking-wider text-brutal-black">
                {isDragging ? "Drop it here" : "Upload PDF or image"}
              </p>
              <p className="mt-2 text-small font-medium text-brutal-black/70">
                Drag & drop or click to browse
              </p>
              <p className="mt-3 text-xs font-bold uppercase tracking-widest text-brutal-black/50">
                PDF/JPG/PNG/WEBP/GIF • Max {Math.round(maxSize / (1024 * 1024))}MB
              </p>
            </div>
          </>
        )}

        {isUploading && (
          <>
            <div className="relative p-4 border-3 border-brutal-black bg-brand-yellow">
              {uploadKind === "image" ? (
                <ImageIcon className="w-10 h-10 text-brutal-black" strokeWidth={3} />
              ) : (
                <FileText className="w-10 h-10 text-brutal-black" strokeWidth={3} />
              )}
            </div>
            <div className="w-full">
              <p className="text-body font-bold text-brutal-black truncate max-w-xs mx-auto">
                {fileName}
              </p>
              <p className="mt-1 text-small font-bold uppercase tracking-wider text-brand-blue">
                {getUploadStatusLabel(state, progress, uploadKind)}
              </p>
            </div>
            <div className="progress-bar w-full max-w-xs">
              <div
                className="progress-bar-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
          </>
        )}

        {state === "success" && (
          <>
            <div className="p-4 border-3 border-brutal-black bg-success">
              <CheckCircle className="w-10 h-10 text-brutal-white" strokeWidth={3} />
            </div>
            <div>
              <p className="text-h4 font-bold uppercase tracking-wider text-brutal-black">
                Upload Complete!
              </p>
              <p className="mt-2 text-small font-medium text-brutal-black/70 truncate max-w-xs">
                {fileName}
              </p>
            </div>
          </>
        )}

        {state === "error" && (
          <>
            <div className="p-4 border-3 border-brutal-black bg-brand-red">
              <AlertCircle className="w-10 h-10 text-brutal-white" strokeWidth={3} />
            </div>
            <div>
              <p className="text-h4 font-bold uppercase tracking-wider text-brutal-black">
                Upload Failed
              </p>
              <p className="mt-2 text-small font-bold text-brand-red">
                {error}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                resetUploader();
              }}
              className="btn-outline btn-sm"
            >
              <X className="w-4 h-4" strokeWidth={3} />
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
