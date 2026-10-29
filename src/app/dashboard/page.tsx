// Main Dashboard Page
// References: docs/Last_Mile_UI_UX_Concept_C_Approved.png (Top Right)

'use client';

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
} from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[#FAF7F2] flex">
      {/* Sidebar Navigation */}
      <AppSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader userName="Shyam Sharma" userEmail="shyam@example.com" />

        <main className="flex-1 p-6 sm:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* Welcome & Check-In Action Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-serif text-3xl font-bold tracking-tight text-[#181816]">
                Good evening, Shyam.
              </h1>
              <p className="text-xs text-[#6B665D] mt-0.5">
                Your digital legacy is safe and in your hands.
              </p>
            </div>

            {/* Check-in Widget Banner */}
            <div className="paper-card px-4 py-2.5 flex items-center gap-4 bg-[#F9F5EC] border-[#E5DECD]">
              <div>
                <p className="text-[11px] font-bold text-[#181816]">Next check-in in 20 days</p>
                <p className="text-[10px] text-[#8C877E]">Due by 12 Nov 2026</p>
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
              label="Total Assets"
              value={12}
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
              value="Active"
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
              <VaultTimeline status="ACTIVE" nextCheckinDate="12 Nov 2026" />

              {/* Quick Asset Summary Cards */}
              <div className="paper-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-serif text-base font-bold text-[#181816]">Asset Portfolio</h3>
                    <p className="text-xs text-[#8C877E]">Client-encrypted entries stored in the database</p>
                  </div>
                  <Link
                    href="/dashboard/assets"
                    className="text-xs font-semibold text-[#1C1D1F] hover:underline flex items-center gap-1"
                  >
                    <span>Manage All (12)</span>
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
                      <p className="font-semibold text-[#181816]">Asset added: HDFC Bank</p>
                      <p className="text-[11px] text-[#8C877E]">2 days ago</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="h-7 w-7 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center flex-shrink-0 mt-0.5 border border-blue-200">
                      <Users className="h-3.5 w-3.5" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-semibold text-[#181816]">Nominee updated: Shyam Gupta</p>
                      <p className="text-[11px] text-[#8C877E]">4 days ago</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="h-7 w-7 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5 border border-emerald-200">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-semibold text-[#181816]">Check-in completed</p>
                      <p className="text-[11px] text-[#8C877E]">10 Oct 2026</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="h-7 w-7 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center flex-shrink-0 mt-0.5 border border-amber-200">
                      <FileText className="h-3.5 w-3.5" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-semibold text-[#181816]">Document verified: LIC Policy</p>
                      <p className="text-[11px] text-[#8C877E]">8 Oct 2026</p>
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
