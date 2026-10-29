// Public Landing Page
// References: docs/Last_Mile_UI_UX_Concept_C_Approved.png

'use client';

import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import {
  ShieldCheck,
  Lock,
  Users2,
  ArrowRight,
  PlayCircle,
  FileCheck2,
  HeartHandshake,
  Compass,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col text-[#181816]">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative px-4 sm:px-6 lg:px-8 pt-12 pb-20 overflow-hidden">
          <div className="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Headlines & CTAs */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-block">
                <p className="font-serif italic text-sm text-[#8C877E] tracking-wide">
                  Not just assets, safeguarding a family&apos;s past and future.
                </p>
              </div>

              <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-[#181816] leading-[1.08]">
                Your story <br />
                deserves a <br />
                <span className="highlighter-gold">next chapter.</span>
              </h1>

              <p className="text-base sm:text-lg text-[#6B665D] max-w-xl leading-relaxed">
                A secure, private, and failure-safe way to organize your financial, digital,
                and administrative inventory so the people you trust can recover it together
                if you become unreachable.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  href="/vault/new"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#1C1D1F] px-6 py-3.5 text-sm font-semibold text-white shadow-md hover:bg-[#2C2D2F] transition transform hover:-translate-y-0.5"
                >
                  <span>Create Your Vault</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 rounded-xl border border-[#D5CEBF] bg-white px-5 py-3.5 text-sm font-semibold text-[#181816] shadow-xs hover:bg-[#F7F4EE] transition"
                >
                  <PlayCircle className="h-4 w-4 text-[#8C6512]" />
                  <span>Interactive Demo</span>
                </Link>
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-[#E8E2D5]">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-[#F2EDE2] flex items-center justify-center text-[#1C1D1F] flex-shrink-0">
                    <Lock className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#181816]">Zero-Knowledge</h4>
                    <p className="text-[11px] text-[#8C877E] leading-tight">
                      Client-encrypted. The server never sees raw assets.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-[#F2EDE2] flex items-center justify-center text-[#1C1D1F] flex-shrink-0">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#181816]">AES-256-GCM</h4>
                    <p className="text-[11px] text-[#8C877E] leading-tight">
                      Authenticated encryption with fresh 12-byte nonces.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-[#F2EDE2] flex items-center justify-center text-[#1C1D1F] flex-shrink-0">
                    <Users2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#181816]">2-of-3 Recovery</h4>
                    <p className="text-[11px] text-[#8C877E] leading-tight">
                      Decentralized Shamir shares held by trusted nominees.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Editorial Scrapbook Composition */}
            <div className="lg:col-span-5 relative flex justify-center">
              <div className="relative w-full max-w-md">
                {/* Vintage Scrapbook Card Container */}
                <div className="paper-card p-6 rotate-1 hover:rotate-0 transition-transform duration-300 relative shadow-xl">
                  {/* Pinned Tape effect */}
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-6 bg-[#E8DCB8]/70 backdrop-blur-xs border border-[#D5CEBF]/60 rotate-2 shadow-xs" />

                  {/* Collage Mockup Box */}
                  <div className="aspect-4/3 w-full bg-[#EFE8DA] rounded-lg overflow-hidden relative flex flex-col justify-between p-5 border border-[#E0D8C8]">
                    <div className="flex items-center justify-between">
                      <span className="stamp-badge">
                        <Compass className="h-3 w-3" />
                        <span>EST. 2026</span>
                      </span>
                      <span className="text-[10px] font-mono text-[#8C877E]">VAULT-ZERO-PROOF</span>
                    </div>

                    <div className="text-center space-y-2">
                      <p className="font-serif italic text-xl text-[#181816]">
                        &ldquo;For the people who will always be there.&rdquo;
                      </p>
                      <p className="text-xs text-[#8C877E]">
                        3 offline cards • 2 distinct approvals • local client decryption
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-[#D5CEBF]">
                      <span className="text-[11px] font-serif font-bold tracking-wider text-[#181816]">
                        LAST MILE LIVES ON.
                      </span>
                      <div className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
                    </div>
                  </div>

                  {/* Feature preview checklist card below */}
                  <div className="mt-4 space-y-2 bg-[#F9F6F0] p-3 rounded-lg border border-[#E8E2D5]">
                    <div className="flex items-center gap-2 text-xs text-[#181816]">
                      <FileCheck2 className="h-3.5 w-3.5 text-emerald-700" />
                      <span>Structured asset inventory &amp; claim instructions</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#181816]">
                      <HeartHandshake className="h-3.5 w-3.5 text-emerald-700" />
                      <span>Inactivity check-in with mandatory grace period</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E8E2D5] bg-[#FAF7F2] py-8 text-center text-xs text-[#8C877E]">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Last Mile. Privacy-by-default continuity vault.</p>
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="hover:text-[#181816] transition">
              Dashboard
            </Link>
            <Link href="/vault/new" className="hover:text-[#181816] transition">
              Create Vault
            </Link>
            <Link href="/nominee/approval" className="hover:text-[#181816] transition">
              Nominee Approval
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
