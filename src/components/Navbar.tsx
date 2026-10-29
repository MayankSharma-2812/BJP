// Public Navigation Header
// References: docs/Last_Mile_UI_UX_Concept_C_Approved.png

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Shield, ArrowRight, Menu, X } from 'lucide-react';

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#E8E2D5] bg-[#FAF7F2]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group rounded-lg focus-visible:ring-2 focus-visible:ring-[#1C1D1F] focus-visible:outline-none"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1C1D1F] text-white shadow-sm transition group-hover:scale-105">
            <Shield className="h-4 w-4" />
          </div>
          <span className="font-serif text-xl font-bold tracking-tight text-[#181816]">
            Last Mile
          </span>
        </Link>

        {/* Desktop Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#6B665D]">
          <Link
            href="/"
            className="hover:text-[#181816] transition rounded-sm focus-visible:ring-2 focus-visible:ring-[#1C1D1F] focus-visible:outline-none"
          >
            Home
          </Link>
          <Link
            href="#how-it-works"
            className="hover:text-[#181816] transition rounded-sm focus-visible:ring-2 focus-visible:ring-[#1C1D1F] focus-visible:outline-none"
          >
            How it works
          </Link>
          <Link
            href="#security"
            className="hover:text-[#181816] transition rounded-sm focus-visible:ring-2 focus-visible:ring-[#1C1D1F] focus-visible:outline-none"
          >
            Security
          </Link>
          <Link
            href="#stories"
            className="hover:text-[#181816] transition rounded-sm focus-visible:ring-2 focus-visible:ring-[#1C1D1F] focus-visible:outline-none"
          >
            Stories
          </Link>
          <Link
            href="/dashboard"
            className="hover:text-[#181816] transition rounded-sm focus-visible:ring-2 focus-visible:ring-[#1C1D1F] focus-visible:outline-none"
          >
            Demo Portal
          </Link>
        </nav>

        {/* Desktop CTA Buttons & Mobile Toggle */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/auth/signin"
            className="hidden sm:inline-block rounded-lg px-4 py-2 text-sm font-medium text-[#181816] hover:bg-[#F2ECE1] transition focus-visible:ring-2 focus-visible:ring-[#1C1D1F] focus-visible:outline-none"
          >
            Sign in
          </Link>
          <Link
            href="/vault/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1C1D1F] px-3.5 sm:px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#2C2D2F] transition focus-visible:ring-2 focus-visible:ring-[#1C1D1F] focus-visible:outline-none"
          >
            <span>Create Vault</span>
            <ArrowRight className="h-4 w-4" />
          </Link>

          {/* Mobile Menu Hamburger Button */}
          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            aria-expanded={isMenuOpen}
            aria-controls="mobile-nav"
            className="md:hidden inline-flex items-center justify-center p-2 rounded-lg text-[#181816] hover:bg-[#F2ECE1] transition focus-visible:ring-2 focus-visible:ring-[#1C1D1F] focus-visible:outline-none"
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Dropdown */}
      {isMenuOpen && (
        <nav
          id="mobile-nav"
          className="md:hidden border-t border-[#E8E2D5] bg-[#FAF7F2] px-4 pt-3 pb-4 space-y-2"
        >
          <Link
            href="/"
            onClick={() => setIsMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-[#181816] hover:bg-[#EFE8DC] transition focus-visible:ring-2 focus-visible:ring-[#1C1D1F] focus-visible:outline-none"
          >
            Home
          </Link>
          <Link
            href="#how-it-works"
            onClick={() => setIsMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-[#6B665D] hover:bg-[#EFE8DC] hover:text-[#181816] transition focus-visible:ring-2 focus-visible:ring-[#1C1D1F] focus-visible:outline-none"
          >
            How it works
          </Link>
          <Link
            href="#security"
            onClick={() => setIsMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-[#6B665D] hover:bg-[#EFE8DC] hover:text-[#181816] transition focus-visible:ring-2 focus-visible:ring-[#1C1D1F] focus-visible:outline-none"
          >
            Security
          </Link>
          <Link
            href="#stories"
            onClick={() => setIsMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-[#6B665D] hover:bg-[#EFE8DC] hover:text-[#181816] transition focus-visible:ring-2 focus-visible:ring-[#1C1D1F] focus-visible:outline-none"
          >
            Stories
          </Link>
          <Link
            href="/dashboard"
            onClick={() => setIsMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-[#6B665D] hover:bg-[#EFE8DC] hover:text-[#181816] transition focus-visible:ring-2 focus-visible:ring-[#1C1D1F] focus-visible:outline-none"
          >
            Demo Portal
          </Link>
          <Link
            href="/auth/signin"
            onClick={() => setIsMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-[#181816] hover:bg-[#EFE8DC] transition focus-visible:ring-2 focus-visible:ring-[#1C1D1F] focus-visible:outline-none"
          >
            Sign in
          </Link>
        </nav>
      )}
    </header>
  );
}
