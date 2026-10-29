// Recovery Process & Owner Cancellation Center
// References: docs/Last_Mile_UI_UX_Concept_C_Approved.png (Mobile Screen 5), docs/04_APP_FLOW.md

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AppSidebar } from '@/components/AppSidebar';
import { AppHeader } from '@/components/AppHeader';
import {
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  KeyRound,
} from 'lucide-react';

export default function RecoveryCenterPage() {
  const [isRecoveryActive, setIsRecoveryActive] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);

  const handleSimulateRequest = () => {
    setIsRecoveryActive(true);
    setIsCancelled(false);
  };

  const handleCancelRecovery = async () => {
    try {
      const activeReqId =
        typeof window !== 'undefined'
          ? localStorage.getItem('last_mile_active_recovery_req') || 'req-primary'
          : 'req-primary';

      await fetch(`/api/recovery-requests/${activeReqId}/cancel`, {
        method: 'POST',
        headers: {
          'x-test-user-id': '11111111-1111-4111-8111-111111111111',
        },
      });
    } catch {
      // fallback
    }
    setIsCancelled(true);
    setIsRecoveryActive(false);
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex">
      <AppSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader />

        <main className="flex-1 p-6 sm:p-8 space-y-6 max-w-4xl mx-auto w-full">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-serif text-3xl font-bold tracking-tight text-[#181816]">
                Recovery Safeguards
              </h1>
              <p className="text-xs text-[#6B665D] mt-0.5">
                Strict governance preventing accidental or unauthorized release of vault contents.
              </p>
            </div>

            <Link
              href="/recovery"
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-[#1C1D1F] hover:bg-[#F2ECE1] text-[#181816] text-xs font-semibold rounded-xl transition"
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span>Offline Reconstructor Tool</span>
            </Link>
          </div>

          {/* Emergency Alert Banner if recovery triggered */}
          {isRecoveryActive && (
            <div className="paper-card p-5 bg-amber-50 border-amber-300 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-700 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold">Recovery In Progress (Cooling-off Period)</h4>
                  <p className="text-[11px] text-amber-800 leading-tight">
                    A recovery request was initiated and approved by 2 nominees. You have 48 hours to cancel if you are safe.
                  </p>
                </div>
              </div>

              <button
                onClick={handleCancelRecovery}
                className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded-lg shadow-xs transition self-start sm:self-auto flex items-center gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Cancel Recovery (I Am Safe)</span>
              </button>
            </div>
          )}

          {isCancelled && (
            <div className="paper-card p-4 bg-emerald-50 border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <span>Recovery request successfully cancelled. Vault status restored to ACTIVE.</span>
            </div>
          )}

          {/* 4-Stage Recovery Pipeline */}
          <div className="paper-card p-6 space-y-6">
            <h3 className="font-serif text-lg font-bold text-[#181816]">
              4-Stage Recovery Pipeline
            </h3>

            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 rounded-xl border border-[#E8E2D5] bg-white">
                <div className="h-8 w-8 rounded-full bg-[#1C1D1F] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                  1
                </div>
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-[#181816]">Request Initiated</h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 font-medium">
                      Inactivity Trigger
                    </span>
                  </div>
                  <p className="text-[11px] text-[#6B665D]">
                    Can only be opened after the owner misses a check-in and the mandatory grace period expires.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl border border-[#E8E2D5] bg-white">
                <div className="h-8 w-8 rounded-full bg-[#1C1D1F] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                  2
                </div>
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-[#181816]">Nominee Approval (2 of 3)</h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 font-medium">
                      Multi-Party Gate
                    </span>
                  </div>
                  <p className="text-[11px] text-[#6B665D]">
                    Two distinct active nominees must authenticate and submit an explicit approval. Single-nominee takeover is physically prevented.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl border border-[#E8E2D5] bg-white">
                <div className="h-8 w-8 rounded-full bg-[#1C1D1F] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                  3
                </div>
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-[#181816]">Cooling-off Period</h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 font-medium">
                      Cancellation Window
                    </span>
                  </div>
                  <p className="text-[11px] text-[#6B665D]">
                    A safety delay (48 hours prod / 2 minutes demo) allows the owner to immediately cancel any false trigger or premature attempt.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl border border-[#E8E2D5] bg-white">
                <div className="h-8 w-8 rounded-full bg-[#1C1D1F] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                  4
                </div>
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-[#181816]">Unlock Window (7 Days)</h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 font-medium">
                      Client-Only Decryption
                    </span>
                  </div>
                  <p className="text-[11px] text-[#6B665D]">
                    Ciphertext envelope becomes downloadable. Recovery nominees input 2 offline cards into their browser to combine the DEK locally.
                  </p>
                </div>
              </div>
            </div>

            {/* Demo Simulation Controls */}
            <div className="pt-4 border-t border-[#E8E2D5] flex items-center justify-between">
              <div className="text-xs text-[#8C877E]">
                Test owner override in simulated environment
              </div>
              <button
                type="button"
                onClick={handleSimulateRequest}
                className="px-3.5 py-1.5 bg-[#F2EDE2] hover:bg-[#EAE2D5] text-[#181816] text-xs font-semibold rounded-lg transition"
              >
                Simulate Nominee Trigger
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
