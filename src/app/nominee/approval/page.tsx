// Nominee Approval Screen
// References: docs/Last_Mile_UI_UX_Concept_C_Approved.png (Mobile Screen 6), docs/04_APP_FLOW.md

'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRight,
} from 'lucide-react';

export default function NomineeApprovalPage() {
  const [decision, setDecision] = useState<'none' | 'approved' | 'declined'>('none');
  const [loading, setLoading] = useState(false);

  const handleDecision = (type: 'approved' | 'declined') => {
    setLoading(true);
    setTimeout(() => {
      setDecision(type);
      setLoading(false);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#181816] flex flex-col justify-center items-center px-4 py-12">
      {/* Brand */}
      <Link href="/" className="flex items-center gap-2.5 mb-8 group">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1C1D1F] text-white shadow-sm">
          <Shield className="h-5 w-5" />
        </div>
        <span className="font-serif text-2xl font-bold tracking-tight text-[#181816]">
          Last Mile
        </span>
      </Link>

      <div className="w-full max-w-md paper-card p-8 shadow-xl space-y-6">
        <div className="text-center space-y-1 pb-4 border-b border-[#E8E2D5]">
          <span className="stamp-badge bg-amber-50 text-amber-900 border-amber-200">
            Nominee Action Required
          </span>
          <h2 className="font-serif text-2xl font-bold text-[#181816] mt-2">
            Recovery Request
          </h2>
          <p className="text-xs text-[#8C877E]">Requested on 29 Oct 2026</p>
        </div>

        {/* Profile Card of Requesting Nominee */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="h-16 w-16 rounded-full bg-[#E5B842] text-[#181816] flex items-center justify-center font-serif text-2xl font-bold shadow-xs">
            S
          </div>
          <div>
            <h3 className="font-bold text-sm text-[#181816]">Shyam Gupta</h3>
            <p className="text-xs text-[#6B665D]">
              has requested recovery access to the family continuity vault.
            </p>
          </div>
        </div>

        {/* Advisory Box */}
        <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-900 space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <AlertTriangle className="h-4 w-4 text-amber-700" />
            <span>Multi-Party Requirement (2 of 3)</span>
          </div>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            Approving this request verifies that the owner is unreachable. At least 2 of 3 nominees must approve before the cooling-off window begins.
          </p>
        </div>

        {/* Decision State or Buttons */}
        {decision === 'none' ? (
          <div className="space-y-3 pt-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleDecision('approved')}
              className="w-full py-3 bg-[#1C1D1F] hover:bg-[#2C2D2F] text-white text-xs font-bold rounded-xl shadow-sm transition disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Approve Request'}
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleDecision('declined')}
              className="w-full py-3 bg-white hover:bg-[#FAF7F2] border border-[#D5CEBF] text-[#181816] text-xs font-bold rounded-xl transition disabled:opacity-50"
            >
              Decline Request
            </button>
          </div>
        ) : decision === 'approved' ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs text-center space-y-2 animate-fade-in">
            <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto" />
            <p className="font-bold">Approval Recorded (1 of 2 Satisfied)</p>
            <p className="text-[11px] text-emerald-700">
              When 2 nominees approve, the 48-hour cooling-off window starts. Keep your physical Recovery Card ready.
            </p>
            <Link
              href="/recovery"
              className="inline-flex items-center gap-1 font-bold text-emerald-900 underline pt-2 text-[11px]"
            >
              <span>Go to Local Reconstructor</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        ) : (
          <div className="p-4 bg-zinc-100 border border-zinc-200 rounded-xl text-zinc-800 text-xs text-center space-y-2 animate-fade-in">
            <XCircle className="h-6 w-6 text-zinc-500 mx-auto" />
            <p className="font-bold">Request Declined</p>
            <p className="text-[11px] text-zinc-600">
              Your decision has been logged to the tamper-evident audit chain.
            </p>
          </div>
        )}

        <div className="pt-3 border-t border-[#E8E2D5] text-center">
          <p className="text-[10px] text-[#A6A095]">
            Identity verified via signed invitation token • Zero plaintext shared
          </p>
        </div>
      </div>
    </div>
  );
}
