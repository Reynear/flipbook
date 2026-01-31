"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Check } from "lucide-react";

const TERMS_STORAGE_KEY = "flipbook_terms_accepted";

export default function TermsGatePage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(TERMS_STORAGE_KEY) === "true") {
      router.replace("/dashboard");
    }
  }, [router]);

  const handleAccept = () => {
    if (!checked) return;
    localStorage.setItem(TERMS_STORAGE_KEY, "true");
    router.replace("/dashboard");
  };

  return (
    <div className="min-h-screen bg-brutal-cream flex flex-col">
      <header className="sticky top-0 z-50 bg-brutal-cream border-b-2 border-brutal-black">
        <div className="container-brutal py-4 flex items-center gap-3">
          <div className="p-2 bg-brand-yellow border-2 border-brutal-black shadow-brutal">
            <BookOpen className="w-5 h-5 text-brutal-black" />
          </div>
          <span className="text-h4 font-bold uppercase tracking-wider">Flipbook</span>
        </div>
      </header>

      <main className="flex-1 flex items-center">
        <div className="container-brutal max-w-2xl py-12">
          <div className="card">
            <h1 className="text-h2 uppercase mb-3">Agree to Terms</h1>
            <p className="text-body text-brutal-black/70 mb-6">
              Before using Flipbook, please review and accept the Terms of Service.
            </p>

            <div className="card bg-brutal-white border-2 border-brutal-black mb-6">
              <p className="text-body text-brutal-black/80">
                You can read the full terms here:
              </p>
              <Link href="/terms" className="btn-outline btn-sm mt-4 inline-flex">
                View Terms of Service
              </Link>
            </div>

            <label className="flex items-start gap-3 mb-6">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                className="mt-1 accent-brand-blue"
              />
              <span className="text-body text-brutal-black/80">
                I agree to the Terms of Service.
              </span>
            </label>

            <button
              type="button"
              onClick={handleAccept}
              disabled={!checked}
              className="btn-primary w-full"
            >
              <Check className="w-4 h-4" />
              Continue to Dashboard
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
