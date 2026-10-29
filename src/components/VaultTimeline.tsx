// Vault Status & Recovery Progress Timeline
// References: docs/Last_Mile_UI_UX_Concept_C_Approved.png, docs/04_APP_FLOW.md

'use client';

import Link from 'next/link';
import { CheckCircle2, ShieldCheck, ArrowRight, AlertCircle } from 'lucide-react';
import type { VaultStatus } from '@/types/recovery';

interface VaultTimelineProps {
  status: VaultStatus;
  nextCheckinDate?: string;
}

export function VaultTimeline({ status, nextCheckinDate = '12 Nov 2026' }: VaultTimelineProps) {
  const stages = [
    { key: 'ACTIVE', label: 'Active', sub: 'Healthy' },
    { key: 'GRACE_PERIOD', label: 'Grace Period', sub: '30 days' },
    { key: 'RECOVERY_PENDING', label: 'Nominee Approval', sub: '2 of 3 required' },
    { key: 'RECOVERY_READY', label: 'Unlock Window', sub: '7 days' },
  ];

  function getStageState(stageKey: string) {
    if (status === 'ACTIVE') {
      return stageKey === 'ACTIVE' ? 'active' : 'upcoming';
    }
    if (status === 'GRACE_PERIOD' || status === 'CHECK_IN_DUE') {
      if (stageKey === 'ACTIVE') return 'completed';
      if (stageKey === 'GRACE_PERIOD') return 'active';
      return 'upcoming';
    }
    if (status === 'RECOVERY_PENDING' || status === 'COOLING_OFF') {
      if (stageKey === 'ACTIVE' || stageKey === 'GRACE_PERIOD') return 'completed';
      if (stageKey === 'RECOVERY_PENDING') return 'active';
      return 'upcoming';
    }
    if (status === 'RECOVERY_READY' || status === 'RECOVERED') {
      if (stageKey === 'RECOVERY_READY') return 'active';
      return 'completed';
    }
    return 'upcoming';
  }

  const isHealthy = status === 'ACTIVE';

  return (
    <div className="paper-card p-6 relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-serif text-lg font-bold text-[#181816]">Your Vault Status</h3>
          <p className="text-xs text-[#8C877E]">Continuous zero-knowledge continuity schedule</p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
            isHealthy
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-amber-50 text-amber-800 border border-amber-200'
          }`}
        >
          {isHealthy ? <ShieldCheck className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
          <span>Status: {status}</span>
        </span>
      </div>

      {/* Mountain Landscape Silhouette Decoration */}
      <div className="h-24 w-full bg-linear-to-b from-[#F2EDE2]/60 to-transparent rounded-xl flex items-center justify-center p-4 relative mb-6 border border-[#E8E2D5]/70">
        <svg
          viewBox="0 0 500 80"
          className="w-full h-full text-[#DCD4C4] opacity-50"
          preserveAspectRatio="none"
        >
          <path
            d="M0,80 L80,30 L160,65 L240,15 L320,55 L400,25 L500,80 Z"
            fill="currentColor"
          />
        </svg>
        <span className="absolute text-[11px] font-serif italic text-[#8C877E]">
          Guarded by 2-of-3 decentralized nominee threshold
        </span>
      </div>

      {/* Timeline Steps */}
      <div className="grid grid-cols-4 gap-2 relative">
        <div className="absolute top-3 left-6 right-6 h-0.5 bg-[#E8E2D5] -z-0" />

        {stages.map((stage) => {
          const state = getStageState(stage.key);
          return (
            <div key={stage.key} className="flex flex-col items-center text-center relative z-10">
              <div
                className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition ${
                  state === 'completed'
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : state === 'active'
                    ? 'bg-white border-emerald-600 text-emerald-700 ring-4 ring-emerald-50'
                    : 'bg-white border-[#D5CEBF] text-[#A6A095]'
                }`}
              >
                {state === 'completed' ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-current" />
                )}
              </div>
              <p
                className={`text-xs mt-2 font-medium ${
                  state === 'active' ? 'text-[#181816] font-bold' : 'text-[#6B665D]'
                }`}
              >
                {stage.label}
              </p>
              <p className="text-[10px] text-[#A6A095] mt-0.5">{stage.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Bottom Summary Bar */}
      <div className="mt-6 pt-4 border-t border-[#E8E2D5] flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-[#181816]">
            {isHealthy ? 'Secure & Active' : 'Workflow Attention Required'}
          </p>
          <p className="text-[11px] text-[#8C877E]">
            {isHealthy
              ? `All systems operational. Next check-in on ${nextCheckinDate}.`
              : `Workflow in ${status}. Immediate review available.`}
          </p>
        </div>
        <Link
          href="/dashboard/recovery"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1C1D1F] hover:underline"
        >
          <span>View Details</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
