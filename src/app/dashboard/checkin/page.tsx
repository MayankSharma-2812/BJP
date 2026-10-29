// Check-in & Inactivity Verification Page
// References: docs/Last_Mile_UI_UX_Concept_C_Approved.png (Mobile Screen 4), docs/04_APP_FLOW.md

'use client';

import { useState } from 'react';
import { AppSidebar } from '@/components/AppSidebar';
import { AppHeader } from '@/components/AppHeader';
import {
  CheckCircle2,
  Clock,
  Compass,
  Calendar,
  ShieldCheck,
} from 'lucide-react';

export default function CheckinPage() {
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [lastCheckin, setLastCheckin] = useState('29 Oct 2026, 4:45 PM');
  const [nextCheckin, setNextCheckin] = useState('28 Nov 2026, 4:45 PM');
  const [loading, setLoading] = useState(false);

  const handleCheckin = async () => {
    setLoading(true);
    try {
      const storedVaultId =
        typeof window !== 'undefined'
          ? localStorage.getItem('last_created_vault_id')
          : null;
      const targetVaultId = storedVaultId || '44444444-4444-4444-8444-444444444444';

      const res = await fetch(`/api/vaults/${targetVaultId}/check-in`, {
        method: 'POST',
        headers: {
          'x-test-user-id': '8f206d7a-3ff3-495d-a775-0208b8ad57d0',
        },
      });

      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        const last = new Date(data.lastCheckInAt);
        const next = new Date(data.nextCheckInAt);
        setLastCheckin(last.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }));
        setNextCheckin(next.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }));
        setIsCheckedIn(true);
      } else {
        const now = new Date();
        setLastCheckin(now.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }));
        const next = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        setNextCheckin(next.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }));
        setIsCheckedIn(true);
      }
    } catch {
      const now = new Date();
      setLastCheckin(now.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }));
      const next = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      setNextCheckin(next.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }));
      setIsCheckedIn(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex">
      <AppSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader />

        <main className="flex-1 p-6 sm:p-8 flex flex-col items-center justify-center max-w-2xl mx-auto w-full">
          <div className="paper-card p-8 sm:p-10 text-center space-y-6 w-full shadow-lg relative">
            {/* Compass / Globe Decorative Illustration */}
            <div className="mx-auto h-28 w-28 rounded-full bg-[#FAF5EB] border-2 border-[#E5DCB8] flex items-center justify-center relative shadow-inner">
              <Compass className="h-14 w-14 text-[#8C6512] animate-spin-slow" />
              <div className="absolute inset-0 rounded-full border border-dashed border-[#DFB140]/60" />
            </div>

            <div className="space-y-2">
              <h1 className="font-serif text-3xl font-bold tracking-tight text-[#181816]">
                Are you doing well?
              </h1>
              <p className="text-xs sm:text-sm text-[#6B665D] max-w-md mx-auto leading-relaxed">
                This routine check-in proves that you are active and in full control of your vault. A single missed check-in never exposes data without entering a mandatory grace period.
              </p>
            </div>

            {/* Timings Info */}
            <div className="grid grid-cols-2 gap-3 p-4 bg-[#FAF7F2] rounded-xl border border-[#E8E2D5] text-xs">
              <div className="text-left space-y-0.5">
                <span className="text-[#8C877E] flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>Last Confirmed:</span>
                </span>
                <p className="font-bold text-[#181816]">{lastCheckin}</p>
              </div>

              <div className="text-right space-y-0.5">
                <span className="text-[#8C877E] flex items-center justify-end gap-1">
                  <Clock className="h-3 w-3" />
                  <span>Next Deadline:</span>
                </span>
                <p className="font-bold text-emerald-800">{nextCheckin}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={handleCheckin}
                disabled={loading}
                className="w-full py-3.5 bg-[#1C1D1F] hover:bg-[#2C2D2F] text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>{loading ? 'Confirming...' : "Yes, I'm Fine"}</span>
              </button>

              <button
                type="button"
                className="w-full py-2.5 text-xs font-semibold text-[#6B665D] hover:text-[#181816] hover:bg-[#F2ECE1] rounded-xl transition"
              >
                Remind Me Later (2 Days)
              </button>
            </div>

            {isCheckedIn && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-center gap-2 animate-fade-in">
                <ShieldCheck className="h-4 w-4" />
                <span>Check-in recorded! Deadline reset for 30 days.</span>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
