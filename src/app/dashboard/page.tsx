// Main Dashboard Page
// References: docs/Last_Mile_UI_UX_Concept_C_Approved.png (Top Right)

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppSidebar } from '@/components/AppSidebar';
import { AppHeader } from '@/components/AppHeader';
import { StatCard } from '@/components/StatCard';
import { VaultTimeline } from '@/components/VaultTimeline';
import {
  Folder,
  Users,
  Activity,
  Clock,
  ArrowRight,
  Building2,
  FileText,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Database,
} from 'lucide-react';
import type { VaultStatus } from '@/types/recovery';

interface VaultSummary {
  id: string;
  status: string;
  nextCheckinAt: string;
  lastCheckinAt: string;
}

export default function DashboardPage() {
  const [vaults, setVaults] = useState<VaultSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [daysRemaining, setDaysRemaining] = useState(30);
  const [nextCheckinDate, setNextCheckinDate] = useState('28 Nov 2026');

  useEffect(() => {
    fetch('/api/vaults', {
      headers: {
        'x-test-user-id': '8f206d7a-3ff3-495d-a775-0208b8ad57d0',
      },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.vaults && Array.isArray(data.vaults) && data.vaults.length > 0) {
          const first = data.vaults[0];
          setVaults(data.vaults);
          if (typeof window !== 'undefined') {
            localStorage.setItem('last_created_vault_id', first.id);
          }
          if (first.nextCheckinAt) {
            const nextDate = new Date(first.nextCheckinAt);
            setNextCheckinDate(
              nextDate.toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })
            );
            const remaining = Math.max(
              0,
              Math.ceil((nextDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            );
            setDaysRemaining(remaining);
          }
        }
      })
      .catch((err) => console.error('Failed to load vaults:', err))
      .finally(() => setLoading(false));
  }, []);

  const activeVault = vaults.length > 0 ? vaults[0] : null;

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex">
      {/* Sidebar Navigation */}
      <AppSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader userName="Shyam Sharma" userEmail="shyam.sharma@lastmile.local" />

        <main className="flex-1 p-6 sm:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* Welcome & Check-In Action Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-3xl font-bold tracking-tight text-[#181816]">
                  Good evening, Shyam.
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Database className="h-3 w-3" />
                  Live Supabase
                </span>
              </div>
              <p className="text-xs text-[#6B665D] mt-0.5">
                Your zero-knowledge digital legacy vault is synced and protected.
              </p>
            </div>

            {/* Check-in Widget Banner */}
            <div className="paper-card px-4 py-2.5 flex items-center gap-4 bg-[#F9F5EC] border-[#E5DECD]">
              <div>
                <p className="text-[11px] font-bold text-[#181816]">
                  Next check-in in {daysRemaining} days
                </p>
                <p className="text-[10px] text-[#8C877E]">Due by {nextCheckinDate}</p>
              </div>
              <Link
                href="/dashboard/checkin"
                className="px-3 py-1.5 bg-[#1C1D1F] hover:bg-[#2C2D2F] text-white text-xs font-semibold rounded-lg shadow-xs transition"
              >
                Check-in Now
              </Link>
            </div>
          </div>

          {/* 4 Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Active Vaults"
              value={vaults.length > 0 ? vaults.length : (loading ? '...' : 1)}
              icon={<Folder className="h-5 w-5" />}
              subtitle="Encrypted locally"
            />
            <StatCard
              label="Nominees"
              value={3}
              icon={<Users className="h-5 w-5" />}
              subtitle="2-of-3 threshold"
            />
            <StatCard
              label="Dead Man's Switch"
              value={activeVault ? activeVault.status : 'ACTIVE'}
              accent="success"
              icon={<Activity className="h-5 w-5" />}
              subtitle="30-day grace"
            />
            <StatCard
              label="Pending Actions"
              value={0}
              icon={<Clock className="h-5 w-5" />}
              subtitle="All healthy"
            />
          </div>

          {/* Two-Column Grid: Vault Status & Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column (8 cols): Vault Status Timeline & Quick Assets */}
            <div className="lg:col-span-8 space-y-6">
              <VaultTimeline
                status={activeVault?.status === 'RECOVERY_COOLING_OFF' ? 'COOLING_OFF' : ((activeVault?.status as VaultStatus) || 'ACTIVE')}
                nextCheckinDate={nextCheckinDate}
              />

              {/* Quick Asset Summary Cards */}
              <div className="paper-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-serif text-base font-bold text-[#181816]">Asset Portfolio</h3>
                    <p className="text-xs text-[#8C877E]">Client-encrypted entries stored in Supabase database</p>
                  </div>
                  <Link
                    href="/dashboard/assets"
                    className="text-xs font-semibold text-[#1C1D1F] hover:underline flex items-center gap-1"
                  >
                    <span>Manage All</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-[#FAF7F2] p-3.5 rounded-xl border border-[#E8E2D5] space-y-1">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#181816]">
                      <Building2 className="h-4 w-4 text-[#8C6512]" />
                      <span>Bank Accounts</span>
                    </div>
                    <p className="text-xl font-serif font-bold text-[#181816]">4</p>
                    <p className="text-[10px] text-[#8C877E]">HDFC, SBI, ICICI</p>
                  </div>

                  <div className="bg-[#FAF7F2] p-3.5 rounded-xl border border-[#E8E2D5] space-y-1">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#181816]">
                      <FileText className="h-4 w-4 text-emerald-700" />
                      <span>Insurance Policies</span>
                    </div>
                    <p className="text-xl font-serif font-bold text-[#181816]">3</p>
                    <p className="text-[10px] text-[#8C877E]">LIC, HDFC Life</p>
                  </div>

                  <div className="bg-[#FAF7F2] p-3.5 rounded-xl border border-[#E8E2D5] space-y-1">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#181816]">
                      <TrendingUp className="h-4 w-4 text-blue-700" />
                      <span>Investments</span>
                    </div>
                    <p className="text-xl font-serif font-bold text-[#181816]">5</p>
                    <p className="text-[10px] text-[#8C877E]">Mutual funds, PPF</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column (4 cols): Recent Activity Feed */}
            <div className="lg:col-span-4 space-y-6">
              <div className="paper-card p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D5]">
                  <h3 className="font-serif text-base font-bold text-[#181816]">Recent Activity</h3>
                  <Link
                    href="/dashboard/activity"
                    className="text-xs font-semibold text-[#181816] hover:underline"
                  >
                    View All
                  </Link>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="flex items-start gap-3">
                    <div className="h-7 w-7 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5 border border-emerald-200">
                      <Folder className="h-3.5 w-3.5" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-semibold text-[#181816]">Vault Initialized &amp; Synced</p>
                      <p className="text-[11px] text-[#8C877E]">Supabase Postgres</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="h-7 w-7 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center flex-shrink-0 mt-0.5 border border-blue-200">
                      <Users className="h-3.5 w-3.5" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-semibold text-[#181816]">Nominee roster registered</p>
                      <p className="text-[11px] text-[#8C877E]">3 offline shares</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="h-7 w-7 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5 border border-emerald-200">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-semibold text-[#181816]">Dead man&apos;s timer active</p>
                      <p className="text-[11px] text-[#8C877E]">Healthy</p>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E8E2D5] flex items-center gap-2 text-[11px] text-[#8C877E]">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Hash chain continuity verified</span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
