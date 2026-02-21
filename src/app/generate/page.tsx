"use client";

import { useSyncExternalStore, type JSX } from "react";
import Link from "next/link";
import { BookOpen, ArrowLeft } from "lucide-react";
import { PosterStudio } from "@/components/PosterStudio";
import { getSessionToken } from "@/lib/anonymous";
import { useRouter } from "next/navigation";

export default function GeneratePage(): JSX.Element {
  const sessionToken = useSyncExternalStore(
    () => () => {},
    getSessionToken,
    () => "",
  );
  const router = useRouter();

  if (!sessionToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brutal-cream">
        <div className="text-h3 font-bold uppercase tracking-wider animate-pulse">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brutal-cream flex flex-col">
      <header className="sticky top-0 z-50 bg-brutal-cream border-b-2 border-brutal-black shrink-0">
        <div className="container-brutal py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="p-2 hover:bg-brutal-gray/50 border-2 border-transparent hover:border-brutal-black transition-all"
            >
              <ArrowLeft className="w-6 h-6 text-brutal-black" />
            </Link>
            <Link href="/" className="flex items-center gap-3 group">
              <div className="p-2 bg-brand-yellow border-2 border-brutal-black shadow-brutal transition-all duration-150 ease-brutal group-hover:-translate-y-0.5 group-hover:-translate-x-0.5 group-hover:shadow-brutal-md">
                <BookOpen className="w-6 h-6 text-brutal-black" />
              </div>
              <span className="text-h4 font-bold uppercase tracking-wider hidden sm:block">
                Generate
              </span>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden relative flex flex-col">
        <PosterStudio
          sessionToken={sessionToken}
          onCreated={() => {
            router.push("/dashboard");
          }}
          onClose={() => {
            router.push("/dashboard");
          }}
        />
      </main>
    </div>
  );
}
