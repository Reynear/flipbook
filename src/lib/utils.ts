import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { browser } from "$app/environment";
import { PUBLIC_APP_URL } from "$env/static/public";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const MAX_FILE_SIZE = 20 * 1024 * 1024;
export const MAX_FLIPBOOKS_ANONYMOUS = 20;

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function generateFlipbookUrl(id: string): string {
  const baseUrl = browser ? window.location.origin : PUBLIC_APP_URL;
  if (!baseUrl) {
    throw new Error("PUBLIC_APP_URL must be set.");
  }
  return `${baseUrl}/flipbook/${id}`;
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
