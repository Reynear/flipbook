"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import FlipbookViewer from "@/components/FlipbookViewer";
import { QRCodeDisplay } from "@/components/QRCodeDisplay";
import { generateFlipbookUrl } from "@/lib/utils";
import { BookOpen, Share2, ArrowLeft, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Id } from "../../../../convex/_generated/dataModel";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function FlipbookPage({ params }: PageProps) {
  const { id } = use(params);
  const [showQR, setShowQR] = useState(false);

  const flipbook = useQuery(api.flipbooks.get, { id: id as Id<"flipbooks"> });

  if (flipbook === undefined) {
    return (
      <div className="h-screen flex items-center justify-center bg-neutral-900">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
            <Loader2 className="absolute inset-0 m-auto w-5 h-5 text-white animate-pulse" />
          </div>
          <span className="text-sm font-medium text-white/60 uppercase tracking-wider">Loading...</span>
        </div>
      </div>
    );
  }

  if (flipbook === null) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-6 p-4 bg-neutral-900">
        <div className="p-4 bg-red-500/20 border border-red-500/40 rounded-lg">
          <AlertCircle className="w-12 h-12 text-red-400" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white uppercase mb-2">Not Found</h1>
          <p className="text-sm text-white/60 mb-6 max-w-md">
            This flipbook may have been deleted or the link is incorrect.
          </p>
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-black font-medium text-sm rounded hover:bg-white/90 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  const shareUrl = generateFlipbookUrl(id);

  return (
    <div className="h-screen flex flex-col bg-neutral-900">
      <header className="flex-shrink-0 h-12 md:h-14 bg-black/80 backdrop-blur-sm border-b border-white/10 z-50">
        <div className="h-full max-w-screen-2xl mx-auto px-3 md:px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-yellow-400 rounded">
              <BookOpen className="w-4 h-4 text-black" />
            </div>
            <span className="text-sm font-bold text-white uppercase tracking-wider hidden sm:block">
              Flipbook
            </span>
          </div>

          <h1 className="absolute left-1/2 -translate-x-1/2 text-sm font-medium text-white/80 truncate max-w-[40%]">
            {flipbook.title}
          </h1>

          <button
            onClick={() => setShowQR(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-sm font-medium text-white transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>
      </header>

      {flipbook.fileUrl && (
        <FlipbookViewer pdfUrl={flipbook.fileUrl} />
      )}

      <QRCodeDisplay
        url={shareUrl}
        title={flipbook.title}
        isOpen={showQR}
        onClose={() => setShowQR(false)}
      />
    </div>
  );
}
