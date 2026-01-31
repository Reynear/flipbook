"use client";

import { ArrowLeft, Check } from "lucide-react";
import Link from "next/link";
import { MAX_FLIPBOOKS_ANONYMOUS } from "@/lib/utils";
import { Footer } from "@/components/Footer";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-brutal-cream">
      <header className="sticky top-0 z-50 bg-brutal-cream border-b-2 border-brutal-black">
        <div className="container-brutal py-4">
          <Link
            href="/"
            className="btn-ghost btn-sm inline-flex"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
        </div>
      </header>

      <main className="section">
        <div className="container-brutal">
          <div className="section-header text-center">
            <span className="badge-secondary mb-4">Simple Limits</span>
            <h1 className="text-display uppercase">
              Free<br />Forever
            </h1>
            <p className="mt-6 text-h4 font-normal max-w-2xl mx-auto">
              No accounts, no upgrades. Upload and share instantly.
            </p>
          </div>

          <div className="max-w-xl mx-auto">
            <div className="card-pricing">
              <div className="mb-6">
                <span className="badge-free mb-4">Free</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-display">$0</span>
                </div>
                <div className="text-body text-brutal-black/60">Forever free</div>
              </div>

              <div className="divider mb-6" />

              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-start gap-3">
                  <div className="p-1 bg-success mt-0.5">
                    <Check className="w-3 h-3 text-brutal-white" strokeWidth={3} />
                  </div>
                  <span>{MAX_FLIPBOOKS_ANONYMOUS} Flipbooks</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="p-1 bg-success mt-0.5">
                    <Check className="w-3 h-3 text-brutal-white" strokeWidth={3} />
                  </div>
                  <span>20MB per PDF</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="p-1 bg-success mt-0.5">
                    <Check className="w-3 h-3 text-brutal-white" strokeWidth={3} />
                  </div>
                  <span>Shareable Links</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="p-1 bg-success mt-0.5">
                    <Check className="w-3 h-3 text-brutal-white" strokeWidth={3} />
                  </div>
                  <span>QR Code Export</span>
                </li>
              </ul>

              <Link href="/dashboard" className="btn-outline w-full">
                Get Started
              </Link>
            </div>
          </div>

          <div className="mt-16 text-center">
            <p className="text-body text-brutal-black/60 max-w-lg mx-auto">
              All flipbooks are shareable by link, mobile-friendly, and ready in seconds.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
