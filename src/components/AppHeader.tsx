// Application Header for Dashboard Pages
// References: docs/Last_Mile_UI_UX_Concept_C_Approved.png

'use client';

import { useState } from 'react';
import { Search, Bell, Clock, ShieldAlert, Menu, X, Shield } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from './AppSidebar';

interface AppHeaderProps {
  userName?: string;
  userEmail?: string;
}

export function AppHeader({
  userName = 'Shyam Sharma',
  userEmail = 'shyam@example.com',
}: AppHeaderProps) {
  const [advancing, setAdvancing] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const pathname = usePathname();

  const handleAdvanceDemo = async () => {
    setAdvancing(true);
    try {
      await fetch('/api/dev/demo-clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'advance_seconds',
          seconds: 86400 * 30,
          vaultId: '11111111-1111-4111-8111-111111111111',
        }),
      });
    } catch {
      // ignore in UI
    } finally {
      setAdvancing(false);
    }
  };

  return (
    <>
      <header className="h-16 border-b border-[#E8E2D5] bg-[#FAF7F2]/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          {/* Mobile Drawer Toggle */}
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            aria-label="Open navigation drawer"
            aria-expanded={isDrawerOpen}
            aria-controls="mobile-dashboard-drawer"
            className="md:hidden inline-flex items-center justify-center p-2 rounded-lg text-[#181816] hover:bg-[#F2ECE1] transition focus-visible:ring-2 focus-visible:ring-[#1C1D1F] focus-visible:outline-none"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Search Bar */}
          <div className="relative w-48 sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8C877E]" />
            <input
              type="text"
              aria-label="Search assets and documents"
              placeholder="Search assets, documents..."
              className="w-full pl-8 sm:pl-9 pr-3 sm:pr-4 py-1.5 text-xs rounded-lg border border-[#E8E2D5] bg-white placeholder-[#8C877E] focus:outline-none focus:ring-1 focus:ring-[#1C1D1F] focus-visible:ring-2 focus-visible:ring-[#1C1D1F]"
            />
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Demo Mode Button */}
          <button
            type="button"
            onClick={handleAdvanceDemo}
            title="Click to advance simulated demo clock by 30 days"
            aria-label="Advance demo clock by 30 days"
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#F5EEDC] hover:bg-[#EFE5CE] text-[#8C6512] border border-[#E8DCB8] transition cursor-pointer focus-visible:ring-2 focus-visible:ring-[#1C1D1F] focus-visible:outline-none"
          >
            <Clock className="h-3 w-3" />
            <span>{advancing ? 'Advancing...' : 'Demo Clock (+30d)'}</span>
          </button>

          {/* Emergency Trigger Shortcut */}
          <Link
            href="/dashboard/recovery"
            className="p-2 rounded-lg text-[#6B665D] hover:bg-[#F2ECE1] hover:text-[#181816] transition relative focus-visible:ring-2 focus-visible:ring-[#1C1D1F] focus-visible:outline-none"
            title="Recovery Center"
            aria-label="Recovery Center"
          >
            <ShieldAlert className="h-4 w-4 text-amber-700" />
          </Link>

          {/* Notification Bell */}
          <button
            type="button"
            className="p-2 rounded-lg text-[#6B665D] hover:bg-[#F2ECE1] hover:text-[#181816] transition relative focus-visible:ring-2 focus-visible:ring-[#1C1D1F] focus-visible:outline-none"
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

      {/* Mobile Drawer Overlay */}
      {isDrawerOpen && (
        <div
          id="mobile-dashboard-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation drawer"
          className="md:hidden fixed inset-0 z-50 flex"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsDrawerOpen(false)}
          />

          {/* Drawer content */}
          <div className="relative flex flex-col justify-between w-72 max-w-[80vw] bg-[#FAF7F2] p-4 shadow-xl z-10 border-r border-[#E8E2D5] h-full">
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between px-2 pb-4 border-b border-[#E8E2D5] mb-4">
                <Link
                  href="/dashboard"
                  onClick={() => setIsDrawerOpen(false)}
                  className="flex items-center gap-2"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1C1D1F] text-white">
                    <Shield className="h-4 w-4" />
                  </div>
                  <span className="font-serif text-lg font-bold tracking-tight text-[#181816]">
                    Last Mile
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  aria-label="Close navigation drawer"
                  className="p-1.5 rounded-lg text-[#6B665D] hover:bg-[#F2ECE1] transition focus-visible:ring-2 focus-visible:ring-[#1C1D1F] focus-visible:outline-none"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Navigation Links */}
              <nav className="space-y-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsDrawerOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-[#1C1D1F] focus-visible:outline-none ${
                        isActive
                          ? 'bg-[#EFE8DC] text-[#181816] font-semibold shadow-xs'
                          : 'text-[#6B665D] hover:bg-[#F4EFE6] hover:text-[#181816]'
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${isActive ? 'text-[#181816]' : 'text-[#8C877E]'}`} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Mobile Drawer Footer */}
            <div className="border-t border-[#E8E2D5] pt-4 px-2 space-y-3">
              <button
                type="button"
                onClick={handleAdvanceDemo}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-[#F5EEDC] text-[#8C6512] border border-[#E8DCB8] focus-visible:ring-2 focus-visible:ring-[#1C1D1F] focus-visible:outline-none"
              >
                <Clock className="h-3.5 w-3.5" />
                <span>{advancing ? 'Advancing...' : 'Advance Demo Clock (+30d)'}</span>
              </button>
              <div className="text-left text-xs text-[#8C877E] px-1">
                <p className="font-semibold text-[#181816]">{userName}</p>
                <p className="text-[11px] truncate">{userEmail}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
