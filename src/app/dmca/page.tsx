"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Footer } from "@/components/Footer";

export default function DMCAPage() {
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
          <h1 className="text-h1 uppercase mb-4">DMCA Policy</h1>
          <p className="text-small text-brutal-black/60 mb-8">
            Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>

          <div className="prose prose-brutal space-y-8">
            <section>
              <h2 className="text-h3 uppercase mb-4">1. Introduction</h2>
              <p className="text-body text-brutal-black/80 leading-relaxed">
                Flipbook respects the intellectual property rights of others and expects our users to do
                the same. In accordance with the Digital Millennium Copyright Act of 1998 (&quot;DMCA&quot;),
                we will respond promptly to claims of copyright infringement committed using our Service.
              </p>
            </section>

            <section>
              <h2 className="text-h3 uppercase mb-4">2. Filing a DMCA Takedown Notice</h2>
              <p className="text-body text-brutal-black/80 leading-relaxed mb-4">
                If you believe that content hosted on Flipbook infringes your copyright, please send a
                written notice to our designated agent containing the following information:
              </p>
              <ul className="list-disc list-inside space-y-2 text-body text-brutal-black/80">
                <li>A physical or electronic signature of the copyright owner or authorized agent</li>
                <li>Identification of the copyrighted work claimed to have been infringed</li>
                <li>Identification of the infringing material and information reasonably sufficient to locate it (e.g., the URL of the flipbook)</li>
                <li>Your contact information (address, telephone number, and email address)</li>
                <li>A statement that you have a good faith belief that the use is not authorized by the copyright owner, its agent, or the law</li>
                <li>A statement, under penalty of perjury, that the information in the notice is accurate and that you are authorized to act on behalf of the copyright owner</li>
              </ul>
            </section>

            <section>
              <h2 className="text-h3 uppercase mb-4">3. Designated Agent</h2>
              <p className="text-body text-brutal-black/80 leading-relaxed mb-4">
                Send DMCA takedown notices to our designated agent:
              </p>
              <div className="bg-brutal-white border-2 border-brutal-black p-4">
                <p className="text-body text-brutal-black/80">
                  <strong>Email:</strong>{" "}
                  <a href="mailto:dmca@flipbook.app" className="text-brand-blue hover:underline">
                    dmca@flipbook.app
                  </a>
                </p>
                <p className="text-body text-brutal-black/80 mt-2">
                  <strong>Subject Line:</strong> DMCA Takedown Request
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-h3 uppercase mb-4">4. Counter-Notification</h2>
              <p className="text-body text-brutal-black/80 leading-relaxed mb-4">
                If you believe your content was removed in error, you may file a counter-notification
                containing the following:
              </p>
              <ul className="list-disc list-inside space-y-2 text-body text-brutal-black/80">
                <li>Your physical or electronic signature</li>
                <li>Identification of the material that was removed and its location before removal</li>
                <li>A statement under penalty of perjury that you have a good faith belief the material was removed by mistake or misidentification</li>
                <li>Your name, address, and telephone number</li>
                <li>A statement that you consent to the jurisdiction of the federal court in your district and will accept service of process from the person who filed the original complaint</li>
              </ul>
              <p className="text-body text-brutal-black/80 leading-relaxed mt-4">
                Upon receiving a valid counter-notification, we will forward it to the original complainant.
                If the complainant does not notify us of legal action within 10-14 business days, we may
                restore the removed content.
              </p>
            </section>

            <section>
              <h2 className="text-h3 uppercase mb-4">5. Repeat Infringer Policy</h2>
              <p className="text-body text-brutal-black/80 leading-relaxed">
                Flipbook maintains a policy of terminating accounts of users who are repeat infringers
                in appropriate circumstances. If a user receives multiple valid DMCA takedown notices,
                their account may be permanently terminated without prior notice.
              </p>
            </section>

            <section>
              <h2 className="text-h3 uppercase mb-4">6. False Claims</h2>
              <p className="text-body text-brutal-black/80 leading-relaxed">
                Please be aware that under Section 512(f) of the DMCA, any person who knowingly materially
                misrepresents that material is infringing, or that material was removed by mistake, may be
                subject to liability for damages, including costs and attorneys&apos; fees.
              </p>
            </section>

            <section>
              <h2 className="text-h3 uppercase mb-4">7. Contact</h2>
              <p className="text-body text-brutal-black/80 leading-relaxed">
                For general questions about our DMCA policy, please contact us at:
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
