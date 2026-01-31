"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, ExternalLink, Share2, Trash2 } from "lucide-react";
import { cn, formatFileSize } from "@/lib/utils";

interface Flipbook {
  _id: string;
  title: string;
  pageCount: number;
  fileSize: number;
  createdAt: number;
  fileUrl: string | null;
}

interface FlipbookCardProps {
  flipbook: Flipbook;
  onDelete?: (id: string) => void;
  onShare?: (id: string) => void;
}

export function FlipbookCard({ flipbook, onDelete, onShare }: FlipbookCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = () => {
    if (showDeleteConfirm) {
      onDelete?.(flipbook._id);
      setShowDeleteConfirm(false);
    } else {
      setShowDeleteConfirm(true);
    }
  };

  const handleShare = () => {
    onShare?.(flipbook._id);
  };

  const formattedDate = new Date(flipbook.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div
      className={cn(
        "card-hover",
        "flex flex-col overflow-hidden",
        "hover:-translate-y-1 hover:-translate-x-1",
        "w-full p-0"
      )}
      onMouseLeave={() => setShowDeleteConfirm(false)}
    >
      <Link
        href={`/flipbook/${flipbook._id}`}
        className="relative aspect-[4/3] bg-brutal-gray border-b-2 border-brutal-black flex items-center justify-center"
      >
        <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,0,0,0.03)_10px,rgba(0,0,0,0.03)_20px)]" />
        <FileText
          className="w-16 h-16 text-brutal-black/30"
          strokeWidth={2}
        />
      </Link>

      <div className="flex flex-col flex-1 p-4 bg-brutal-white">
        <Link
          href={`/flipbook/${flipbook._id}`}
          className="block mb-3"
        >
          <h3
            className="font-bold uppercase tracking-wider text-brutal-black truncate"
            title={flipbook.title}
          >
            {flipbook.title}
          </h3>
        </Link>

        <div className="flex items-center gap-2 mb-4">
          <span className="badge-free">{flipbook.pageCount} PG</span>
          <span className="badge-free">{formattedDate}</span>
        </div>

        <div className="flex items-center gap-2 mt-auto pt-3 border-t-2 border-brutal-black">
          <Link
            href={`/flipbook/${flipbook._id}`}
            className="btn btn-sm bg-brand-blue text-brutal-white shadow-brutal hover:-translate-y-0.5 hover:-translate-x-0.5 hover:shadow-brutal-md active:translate-x-0 active:translate-y-0 active:shadow-brutal-sm flex-1"
          >
            <ExternalLink className="w-4 h-4" />
            <span>View</span>
          </Link>

          <button
            type="button"
            onClick={handleShare}
            className="btn btn-outline btn-sm btn-icon"
            title="Share"
          >
            <Share2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleDelete}
            className={cn(
              "btn btn-sm btn-icon",
              showDeleteConfirm
                ? "btn-danger"
                : "btn-outline hover:bg-brand-red hover:text-brutal-white hover:border-brand-red"
            )}
            title={showDeleteConfirm ? "Click again to confirm" : "Delete"}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
