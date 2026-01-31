"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Footer } from "@/components/Footer";

export default function TermsPage() {
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
          <h1 className="text-h1 uppercase mb-4">Terms of Service</h1>
          <p className="text-small text-brutal-black/60 mb-8">
            Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" , year: "numeric" })}
          </p>

          <div className="prose prose-brutal space-y-8">
            <section>
              <h2 className="text-h3 uppercase mb-4">1. Acceptance of Terms</h2>
              <p className="text-body text-brutal-black/80 leading-relaxed">
                By accessing or using Flipbook (&quot;the Service&quot;), you agree to be bound by these
                Terms of Service. If you do not agree to these terms, please do not use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-h3 uppercase mb-4">2. Service Description</h2>
              <p className="text-body text-brutal-black/80 leading-relaxed">
                Flipbook is a web-based service that converts PDF files into interactive, page-turning
                flipbooks that can be shared via unique links. No account is required to use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-h3 uppercase mb-4">3. Anonymous Sessions</h2>
              <p className="text-body text-brutal-black/80 leading-relaxed">
                We use an anonymous session ID stored in your browser to group your flipbooks. If you clear
                your browser storage or switch devices, you may lose access to your anonymous flipbooks.
              </p>
            </section>

            <section>
              <h2 className="text-h3 uppercase mb-4">4. Content Ownership</h2>
              <p className="text-body text-brutal-black/80 leading-relaxed">
                You retain all ownership rights to the PDF files you upload and the flipbooks you create.
                By uploading content, you grant us a limited license to store, process, and display your
                content solely for the purpose of providing the Service.
              </p>
            </section>

            <section>
              <h2 className="text-h3 uppercase mb-4">5. Acceptable Use</h2>
              <p className="text-body text-brutal-black/80 leading-relaxed mb-4">
                You agree not to use the Service to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-body text-brutal-black/80">
                <li>Upload, share, or distribute content that infringes on intellectual property rights</li>
                <li>Upload illegal, harmful, threatening, abusive, or otherwise objectionable content</li>
                <li>Distribute malware, viruses, or any other malicious code</li>
                <li>Attempt to gain unauthorized access to the Service or other users&apos; accounts</li>
                <li>Use the Service for any illegal purpose or in violation of any laws</li>
                <li>Circumvent usage limits or abuse the free tier</li>
              </ul>
            </section>

            <section>
              <h2 className="text-h3 uppercase mb-4">6. Usage Limits</h2>
              <p className="text-body text-brutal-black/80 leading-relaxed mb-4">
                The Service is free to use and is limited to 20 flipbooks per anonymous session, with a
                20MB maximum file size per PDF.
              </p>
              <p className="text-body text-brutal-black/80 leading-relaxed">
                We may enforce reasonable rate limits to protect the Service and ensure fair use.
              </p>
            </section>

            <section>
              <h2 className="text-h3 uppercase mb-4">7. Service Termination</h2>
              <p className="text-body text-brutal-black/80 leading-relaxed">
                We reserve the right to suspend or restrict access to the Service for violations of these
                Terms, including but not limited to uploading infringing content or engaging in abusive
                behavior. We may delete content that violates these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-h3 uppercase mb-4">8. Limitation of Liability</h2>
              <p className="text-body text-brutal-black/80 leading-relaxed">
                THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND. TO THE MAXIMUM
                EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
                CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED
                DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.
              </p>
            </section>

            <section>
              <h2 className="text-h3 uppercase mb-4">9. Indemnification</h2>
              <p className="text-body text-brutal-black/80 leading-relaxed">
                You agree to indemnify and hold harmless Flipbook and its officers, directors, employees,
                and agents from any claims, damages, losses, liabilities, and expenses (including legal fees)
                arising out of your use of the Service or violation of these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-h3 uppercase mb-4">10. Dispute Resolution</h2>
              <p className="text-body text-brutal-black/80 leading-relaxed">
                Any disputes arising from these Terms or your use of the Service shall be resolved through
                binding arbitration in accordance with the rules of the American Arbitration Association.
                You agree to waive your right to a jury trial or to participate in a class action.
              </p>
            </section>

            <section>
              <h2 className="text-h3 uppercase mb-4">11. Changes to Terms</h2>
              <p className="text-body text-brutal-black/80 leading-relaxed">
                We may modify these Terms at any time. We will notify you of material changes by posting
                the updated Terms on this page. Your continued use of the Service after changes constitutes
                acceptance of the modified Terms.
              </p>
            </section>

            <section>
              <h2 className="text-h3 uppercase mb-4">12. Contact</h2>
              <p className="text-body text-brutal-black/80 leading-relaxed">
                For questions about these Terms of Service, please contact us at:
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
