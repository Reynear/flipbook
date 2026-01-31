"use client";

import { useState, useRef, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import { Upload, FileText, X, AlertCircle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

interface PDFUploaderProps {
  onUploadComplete: (fileId: string, pageCount: number) => void;
  disabled?: boolean;
  maxSize?: number;
  anonymousId: string;
}

type UploadState = "idle" | "selected" | "uploading" | "processing" | "success" | "error";

export function PDFUploader({
  onUploadComplete,
  disabled = false,
  maxSize = 20 * 1024 * 1024,
  anonymousId,
}: PDFUploaderProps) {
  const [state, setState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const validateFile = useMutation(api.files.validateFile);

  const resetUploader = useCallback(() => {
    setState("idle");
    setProgress(0);
    setError(null);
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const validatePDF = useCallback(
    (file: File): string | null => {
      if (file.type !== "application/pdf") {
        return "Please select a PDF file";
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
      const validationError = validatePDF(file);
      if (validationError) {
        setError(validationError);
        setState("error");
        return;
      }

      setFileName(file.name);
      setState("selected");
      setError(null);

      try {
        setState("uploading");
        setProgress(0);

        const uploadUrl = await generateUploadUrl({ anonymousId });
        setProgress(10);

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
          xhr.setRequestHeader("Content-Type", file.type);
          xhr.send(file);
        });

        setProgress(85);
        setState("processing");

        const response = JSON.parse(xhr.responseText);
        const storageId = response.storageId;

        await validateFile({
          fileId: storageId,
          fileSize: file.size,
          mimeType: file.type,
        });

        setProgress(92);

        const pageCount = await countPages(file);
        setProgress(100);
        setState("success");

        setTimeout(() => {
          onUploadComplete(storageId, pageCount);
        }, 500);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
        setState("error");
      }
    },
    [generateUploadUrl, validateFile, validatePDF, onUploadComplete, anonymousId]
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

  return (
    <div className="w-full max-w-xl mx-auto">
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative transition-all duration-150 ease-brutal",
          disabled
            ? "upload-zone-disabled"
            : isDragging
              ? "upload-zone-active"
              : state === "error"
                ? "border-3 border-solid border-brand-red bg-brand-red/10 p-12 flex flex-col items-center justify-center gap-4 text-center cursor-pointer"
                : state === "success"
                  ? "border-3 border-solid border-success bg-success/10 p-12 flex flex-col items-center justify-center gap-4 text-center shadow-brutal"
                  : isUploading
                    ? "border-3 border-solid border-brand-blue bg-brand-blue/5 p-12 flex flex-col items-center justify-center gap-4 text-center shadow-brutal"
                    : "upload-zone hover:-translate-y-1 hover:-translate-x-1 hover:shadow-brutal hover:border-solid hover:bg-brand-yellow/10"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
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
                {isDragging ? "Drop it here" : "Upload PDF"}
              </p>
              <p className="mt-2 text-small font-medium text-brutal-black/70">
                Drag & drop or click to browse
              </p>
              <p className="mt-3 text-xs font-bold uppercase tracking-widest text-brutal-black/50">
                PDF only • Max {Math.round(maxSize / (1024 * 1024))}MB
              </p>
            </div>
          </>
        )}

        {isUploading && (
          <>
            <div className="relative p-4 border-3 border-brutal-black bg-brand-yellow">
              <FileText className="w-10 h-10 text-brutal-black" strokeWidth={3} />
            </div>
            <div className="w-full">
              <p className="text-body font-bold text-brutal-black truncate max-w-xs mx-auto">
                {fileName}
              </p>
              <p className="mt-1 text-small font-bold uppercase tracking-wider text-brand-blue">
                {state === "uploading" && `Uploading... ${progress}%`}
                {state === "processing" && "Processing PDF..."}
                {state === "selected" && "Starting upload..."}
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
