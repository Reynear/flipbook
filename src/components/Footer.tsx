import Link from "next/link";
import { BookOpen } from "lucide-react";

export function Footer() {
  return (
    <footer className="py-8 border-t-2 border-brutal-black bg-brutal-cream">
      <div className="container-brutal">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-brand-yellow border-2 border-brutal-black">
              <BookOpen className="w-4 h-4 text-brutal-black" />
            </div>
            <span className="font-bold uppercase tracking-wider text-small">Flipbook</span>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-4 text-small">
            <Link
              href="/privacy"
              className="text-brutal-black/60 hover:text-brutal-black transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="text-brutal-black/60 hover:text-brutal-black transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              href="/dmca"
              className="text-brutal-black/60 hover:text-brutal-black transition-colors"
            >
              DMCA
            </Link>
            <a
              href="mailto:support@flipbook.app"
              className="text-brutal-black/60 hover:text-brutal-black transition-colors"
            >
              Contact
            </a>
          </nav>

          <p className="text-small text-brutal-black/60">
            © {new Date().getFullYear()} Flipbook. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
