"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { PDFUploader } from "@/components/PDFUploader";
import { FlipbookCard } from "@/components/FlipbookCard";
import { QRCodeDisplay } from "@/components/QRCodeDisplay";
import { generateFlipbookUrl, MAX_FLIPBOOKS_ANONYMOUS } from "@/lib/utils";
import { getAnonymousId } from "@/lib/anonymous";
import { BookOpen, Plus, X, Lock } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";
import Link from "next/link";
import { Footer } from "@/components/Footer";

function DashboardContent() {
  const [showUploader, setShowUploader] = useState(false);
  const [qrModal, setQrModal] = useState<{ url: string; title: string } | null>(null);
  const [anonymousId, setAnonymousId] = useState<string>("");

  const anonymousFlipbooks = useQuery(
    api.flipbooks.listByAnonymousId,
    anonymousId ? { anonymousId } : "skip"
  );
  const createFlipbook = useMutation(api.flipbooks.create);
  const deleteFlipbook = useMutation(api.flipbooks.remove);

  useEffect(() => {
    setAnonymousId(getAnonymousId());
  }, []);

  const handleUploadComplete = async (fileId: string, pageCount: number) => {
    if (!anonymousId) return;
    const title = `Flipbook ${new Date().toLocaleDateString()}`;
    await createFlipbook({
      fileId: fileId as Id<"_storage">,
      title,
      pageCount,
      fileSize: 0,
      anonymousId,
    });
    setShowUploader(false);
  };

  const handleDelete = async (id: string) => {
    if (!anonymousId) return;
    await deleteFlipbook({
      id: id as Id<"flipbooks">,
      anonymousId,
    });
  };

  const handleShare = (id: string) => {
    const flipbook = anonymousFlipbooks?.find((f) => f._id === id);
    if (flipbook) {
      setQrModal({
        url: generateFlipbookUrl(id),
        title: flipbook.title,
      });
    }
  };

  if (!anonymousId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brutal-cream">
        <div className="text-h3 font-bold uppercase tracking-wider animate-pulse">Loading...</div>
      </div>
    );
  }

  const canUpload = !anonymousFlipbooks || anonymousFlipbooks.length < MAX_FLIPBOOKS_ANONYMOUS;

  return (
    <div className="min-h-screen bg-brutal-cream">
      <header className="sticky top-0 z-50 bg-brutal-cream border-b-2 border-brutal-black">
        <div className="container-brutal py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="p-2 bg-brand-yellow border-2 border-brutal-black shadow-brutal transition-all duration-150 ease-brutal group-hover:-translate-y-0.5 group-hover:-translate-x-0.5 group-hover:shadow-brutal-md">
              <BookOpen className="w-6 h-6 text-brutal-black" />
            </div>
            <span className="text-h4 font-bold uppercase tracking-wider">Flipbook</span>
          </Link>
        </div>
      </header>

      <main className="container-brutal py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-h2 uppercase">Your Flipbooks</h1>
            <p className="text-body text-brutal-black/60 mt-1">
              <span className="flex items-center gap-2">
                <span className="badge-free">Anonymous</span>
                {anonymousFlipbooks?.length ?? 0} / {MAX_FLIPBOOKS_ANONYMOUS} flipbooks
              </span>
            </p>
          </div>
          <button
            onClick={() => setShowUploader(true)}
            disabled={!canUpload}
            className="btn-primary"
          >
            <Plus className="w-5 h-5" />
            New Flipbook
          </button>
        </div>

        {showUploader && (
          <div className="mb-8">
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-h3 uppercase">Upload PDF</h2>
                <button
                  onClick={() => setShowUploader(false)}
                  className="btn-ghost btn-icon"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {canUpload ? (
                <PDFUploader onUploadComplete={handleUploadComplete} anonymousId={anonymousId} />
              ) : (
                <div className="text-center py-8">
                  <Lock className="w-12 h-12 mx-auto mb-4 text-brutal-black/50" />
                  <h3 className="text-h4 uppercase mb-2">Limit Reached</h3>
                  <p className="text-body">
                    You&apos;ve reached the {MAX_FLIPBOOKS_ANONYMOUS} flipbook limit.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {anonymousFlipbooks && anonymousFlipbooks.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {anonymousFlipbooks.map((flipbook) => (
              <FlipbookCard
                key={flipbook._id}
                flipbook={flipbook}
                onDelete={handleDelete}
                onShare={handleShare}
              />
            ))}
          </div>
        ) : (
          <div className="card text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 bg-brutal-gray border-2 border-brutal-black flex items-center justify-center">
              <BookOpen className="w-10 h-10 text-brutal-black/30" />
            </div>
            <h3 className="text-h3 uppercase mb-2">No Flipbooks Yet</h3>
            <p className="text-body text-brutal-black/60 mb-6">
              Upload your first PDF to create a flipbook.
            </p>
            {!showUploader && (
              <button
                onClick={() => setShowUploader(true)}
                className="btn-primary"
              >
                <Plus className="w-5 h-5" />
                Create Flipbook
              </button>
            )}
          </div>
        )}
      </main>

      {qrModal && (
        <QRCodeDisplay
          url={qrModal.url}
          title={qrModal.title}
          isOpen={true}
          onClose={() => setQrModal(null)}
        />
      )}

      <Footer />
    </div>
  );
}

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brutal-cream">
        <div className="text-h3 font-bold uppercase tracking-wider animate-pulse">Loading...</div>
      </div>
    );
  }

  return <DashboardContent />;
}
