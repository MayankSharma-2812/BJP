// Stat Card Component
// References: docs/Last_Mile_UI_UX_Concept_C_Approved.png

import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  subtitle?: string;
  accent?: 'default' | 'success' | 'warning';
}

export function StatCard({ label, value, icon, subtitle, accent = 'default' }: StatCardProps) {
  return (
    <div className="paper-card p-4 flex items-center justify-between transition hover:border-[#D5CEBF]">
      <div className="space-y-1">
        <p className="text-xs font-medium text-[#8C877E]">{label}</p>
        <p className="text-2xl font-bold tracking-tight text-[#181816] font-serif">{value}</p>
        {subtitle && <p className="text-[11px] text-[#A6A095]">{subtitle}</p>}
      </div>
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-xl ${
          accent === 'success'
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : accent === 'warning'
            ? 'bg-amber-50 text-amber-700 border border-amber-200'
            : 'bg-[#F7F4EE] text-[#1C1D1F] border border-[#E8E2D5]'
        }`}
      >
        {icon}
      </div>
    </div>
  );
}
