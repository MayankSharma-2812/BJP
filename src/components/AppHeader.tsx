// Application Header for Dashboard Pages
// References: docs/Last_Mile_UI_UX_Concept_C_Approved.png

'use client';

import { Search, Bell, Clock, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

interface AppHeaderProps {
  userName?: string;
  userEmail?: string;
}

export function AppHeader({
  userName = 'Shyam Sharma',
  userEmail = 'shyam@example.com',
}: AppHeaderProps) {
  return (
    <header className="h-16 border-b border-[#E8E2D5] bg-[#FAF7F2]/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Search Bar */}
      <div className="relative w-80">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C877E]" />
        <input
          type="text"
          placeholder="Search your assets, documents..."
          className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-[#E8E2D5] bg-white placeholder-[#8C877E] focus:outline-none focus:ring-1 focus:ring-[#1C1D1F]"
        />
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Demo Mode Badge */}
        <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#F5EEDC] text-[#8C6512] border border-[#E8DCB8]">
          <Clock className="h-3 w-3" />
          <span>Demo Clock Active</span>
        </div>

        {/* Emergency Trigger Shortcut */}
        <Link
          href="/dashboard/recovery"
          className="p-2 rounded-lg text-[#6B665D] hover:bg-[#F2ECE1] hover:text-[#181816] transition relative"
          title="Recovery Center"
        >
          <ShieldAlert className="h-4 w-4 text-amber-700" />
        </Link>

        {/* Notification Bell */}
        <button
          className="p-2 rounded-lg text-[#6B665D] hover:bg-[#F2ECE1] hover:text-[#181816] transition relative"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-emerald-600" />
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-[#E8E2D5]">
          <div className="h-8 w-8 rounded-full bg-[#E5B842] text-[#1C1D1F] flex items-center justify-center font-bold text-xs shadow-xs">
            {userName.charAt(0)}
          </div>
          <div className="hidden md:block text-left leading-tight">
            <p className="text-xs font-semibold text-[#181816]">{userName}</p>
            <p className="text-[10px] text-[#8C877E]">{userEmail}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
