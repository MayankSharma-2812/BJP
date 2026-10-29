// Public Navigation Header
// References: docs/Last_Mile_UI_UX_Concept_C_Approved.png

'use client';

import Link from 'next/link';
import { Shield, ArrowRight } from 'lucide-react';

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#E8E2D5] bg-[#FAF7F2]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1C1D1F] text-white shadow-sm transition group-hover:scale-105">
            <Shield className="h-4 w-4" />
          </div>
          <span className="font-serif text-xl font-bold tracking-tight text-[#181816]">
            Last Mile
          </span>
        </Link>

        {/* Desktop Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#6B665D]">
          <Link href="/" className="hover:text-[#181816] transition">
            Home
          </Link>
          <Link href="#how-it-works" className="hover:text-[#181816] transition">
            How it works
          </Link>
          <Link href="#security" className="hover:text-[#181816] transition">
            Security
          </Link>
          <Link href="#stories" className="hover:text-[#181816] transition">
            Stories
          </Link>
          <Link href="/dashboard" className="hover:text-[#181816] transition">
            Demo Portal
          </Link>
        </nav>

        {/* CTA Buttons */}
        <div className="flex items-center gap-3">
          <Link
            href="/auth/signin"
            className="rounded-lg px-4 py-2 text-sm font-medium text-[#181816] hover:bg-[#F2ECE1] transition"
          >
            Sign in
          </Link>
          <Link
            href="/vault/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1C1D1F] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#2C2D2F] transition"
          >
            <span>Create Vault</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}
