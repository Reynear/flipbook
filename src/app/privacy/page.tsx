"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Footer } from "@/components/Footer";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-brutal-cream flex flex-col">
      <header className="sticky top-0 z-50 bg-brutal-cream border-b-2 border-brutal-black">
        <div className="container-brutal py-4">
          <Link href="/" className="btn-ghost btn-sm inline-flex">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
        </div>
      </header>

      <main className="section flex-1">
        <div className="container-brutal max-w-3xl">
          <h1 className="text-h1 uppercase mb-4">Privacy Policy</h1>
          <p className="text-small text-brutal-black/60 mb-8">
            Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>

          <div className="prose prose-brutal space-y-8">
            <section>
              <h2 className="text-h3 uppercase mb-4">1. Introduction</h2>
              <p className="text-body text-brutal-black/80 leading-relaxed">
                Flipbook (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy.
                This Privacy Policy explains how we collect, use, disclose, and safeguard your information
                when you use our PDF to flipbook conversion service.
              </p>
            </section>

            <section>
              <h2 className="text-h3 uppercase mb-4">2. Information We Collect</h2>
              <p className="text-body text-brutal-black/80 leading-relaxed mb-4">
                We collect information you provide directly to us:
              </p>
              <ul className="list-disc list-inside space-y-2 text-body text-brutal-black/80">
                <li><strong>Uploaded Content:</strong> PDF files you upload to convert into flipbooks</li>
                <li><strong>Anonymous Session ID:</strong> A local identifier stored in your browser to group your flipbooks</li>
                <li><strong>Usage Data:</strong> Device information and how you interact with our service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-h3 uppercase mb-4">3. How We Use Your Information</h2>
              <ul className="list-disc list-inside space-y-2 text-body text-brutal-black/80">
                <li>To provide, maintain, and improve our flipbook conversion service</li>
                <li>To send you technical notices and support messages</li>
                <li>To respond to your comments, questions, and customer service requests</li>
                <li>To detect, prevent, and address technical issues or fraud</li>
              </ul>
            </section>

            <section>
              <h2 className="text-h3 uppercase mb-4">4. Third-Party Services</h2>
              <p className="text-body text-brutal-black/80 leading-relaxed mb-4">
                We use the following third-party services to operate Flipbook:
              </p>
              <ul className="list-disc list-inside space-y-2 text-body text-brutal-black/80">
                <li><strong>Convex:</strong> Database and file storage for your flipbooks</li>
              </ul>
              <p className="text-body text-brutal-black/80 leading-relaxed mt-4">
                Each of these services has their own privacy policies governing their use of your data.
              </p>
            </section>

            <section>
              <h2 className="text-h3 uppercase mb-4">5. Data Retention</h2>
              <p className="text-body text-brutal-black/80 leading-relaxed">
                We retain your flipbooks and uploaded PDF files to enable viewing.
                If you delete a flipbook, the associated files are removed from our systems within 30 days.
                Clearing your browser storage may prevent access to your anonymous flipbooks.
              </p>
            </section>

            <section>
              <h2 className="text-h3 uppercase mb-4">6. Your Rights</h2>
              <p className="text-body text-brutal-black/80 leading-relaxed mb-4">
                You have the right to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-body text-brutal-black/80">
                <li><strong>Access:</strong> Request a copy of the personal data we hold about you</li>
                <li><strong>Delete:</strong> Request deletion of your flipbooks and associated data</li>
                <li><strong>Export:</strong> Download your flipbooks</li>
              </ul>
              <p className="text-body text-brutal-black/80 leading-relaxed mt-4">
                To exercise these rights, contact us at support@flipbook.app.
              </p>
            </section>

            <section>
              <h2 className="text-h3 uppercase mb-4">7. Data Security</h2>
              <p className="text-body text-brutal-black/80 leading-relaxed">
                We implement appropriate technical and organizational measures to protect your personal
                information against unauthorized access, alteration, disclosure, or destruction.
                All data transmission is encrypted using SSL/TLS.
              </p>
            </section>

            <section>
              <h2 className="text-h3 uppercase mb-4">8. Children&apos;s Privacy</h2>
              <p className="text-body text-brutal-black/80 leading-relaxed">
                Our service is not directed to children under 13. We do not knowingly collect personal
                information from children under 13. If you believe we have collected data from a child,
                please contact us immediately.
              </p>
            </section>

            <section>
              <h2 className="text-h3 uppercase mb-4">9. Changes to This Policy</h2>
              <p className="text-body text-brutal-black/80 leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any changes
                by posting the new policy on this page and updating the &quot;Last updated&quot; date.
              </p>
            </section>

            <section>
              <h2 className="text-h3 uppercase mb-4">10. Contact Us</h2>
              <p className="text-body text-brutal-black/80 leading-relaxed">
                If you have questions about this Privacy Policy or our data practices, please contact us at:
              </p>
              <p className="text-body text-brutal-black/80 mt-2">
                <a href="mailto:support@flipbook.app" className="text-brand-blue hover:underline">
                  support@flipbook.app
                </a>
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
