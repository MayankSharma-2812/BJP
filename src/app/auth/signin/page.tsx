// Sign In & Authentication Portal
// References: docs/Last_Mile_UI_UX_Concept_C_Approved.png

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, ArrowRight, KeyRound, Lock } from 'lucide-react';

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('shyam@example.com');
  const [password, setPassword] = useState('demo-passphrase-2026');
  const [role, setRole] = useState<'owner' | 'nominee'>('owner');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (role === 'owner') {
      router.push('/dashboard');
    } else {
      router.push('/nominee/approval');
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col justify-center items-center px-4 py-12">
      {/* Brand */}
      <Link href="/" className="flex items-center gap-2.5 mb-8 group">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1C1D1F] text-white shadow-sm">
          <Shield className="h-5 w-5" />
        </div>
        <span className="font-serif text-2xl font-bold tracking-tight text-[#181816]">
          Last Mile
        </span>
      </Link>

      <div className="w-full max-w-md paper-card p-8 shadow-lg">
        <div className="text-center space-y-1.5 mb-6">
          <h2 className="font-serif text-2xl font-bold text-[#181816]">Sign in to your vault</h2>
          <p className="text-xs text-[#8C877E]">
            Client-side decryption protects your records from server visibility.
          </p>
        </div>

        {/* Role Selector Tabs (Demo Friendly) */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#F2ECE1] rounded-xl mb-6">
          <button
            type="button"
            onClick={() => {
              setRole('owner');
              setEmail('shyam@example.com');
            }}
            className={`py-2 text-xs font-semibold rounded-lg transition ${
              role === 'owner' ? 'bg-white text-[#181816] shadow-xs' : 'text-[#6B665D]'
            }`}
          >
            Vault Owner
          </button>
          <button
            type="button"
            onClick={() => {
              setRole('nominee');
              setEmail('nominee1@example.com');
            }}
            className={`py-2 text-xs font-semibold rounded-lg transition ${
              role === 'nominee' ? 'bg-white text-[#181816] shadow-xs' : 'text-[#6B665D]'
            }`}
          >
            Nominee Portal
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#181816] mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E8E2D5] bg-white focus:outline-none focus:ring-1 focus:ring-[#1C1D1F]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-[#181816]">
                Password / Passphrase
              </label>
              <span className="text-[11px] text-[#8C877E]">Never stored raw</span>
            </div>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E8E2D5] bg-white focus:outline-none focus:ring-1 focus:ring-[#1C1D1F]"
              />
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C877E]" />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-[#1C1D1F] hover:bg-[#2C2D2F] text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 shadow-sm transition mt-2"
          >
            <span>{role === 'owner' ? 'Unlock Dashboard' : 'Open Nominee Portal'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-[#E8E2D5] text-center space-y-2">
          <p className="text-xs text-[#6B665D]">
            Need a new vault?{' '}
            <Link href="/vault/new" className="font-semibold text-[#181816] hover:underline">
              Create one in 2 minutes
            </Link>
          </p>
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#8C877E]">
            <KeyRound className="h-3 w-3 text-amber-600" />
            <span>End-to-end encrypted with Web Crypto AES-256-GCM</span>
          </div>
        </div>
      </div>
    </div>
  );
}
