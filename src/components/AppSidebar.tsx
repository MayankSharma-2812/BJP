// Application Sidebar Navigation
// References: docs/Last_Mile_UI_UX_Concept_C_Approved.png

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderLock,
  Users,
  Clock,
  ShieldCheck,
  History,
  Shield,
  LifeBuoy,
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Assets', href: '/dashboard/assets', icon: FolderLock },
  { label: 'Nominees', href: '/dashboard/nominees', icon: Users },
  { label: 'Check-ins', href: '/dashboard/checkin', icon: Clock },
  { label: 'Recovery', href: '/dashboard/recovery', icon: ShieldCheck },
  { label: 'Activity Log', href: '/dashboard/activity', icon: History },
  { label: 'Nominee Portal', href: '/nominee/approval', icon: LifeBuoy },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 flex-shrink-0 border-r border-[#E8E2D5] bg-[#FAF7F2] flex flex-col justify-between p-4 h-screen sticky top-0">
      <div>
        {/* Brand */}
        <Link href="/dashboard" className="flex items-center gap-2.5 px-3 py-2 mb-6 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1C1D1F] text-white">
            <Shield className="h-4 w-4" />
          </div>
          <span className="font-serif text-xl font-bold tracking-tight text-[#181816]">
            Last Mile
          </span>
        </Link>

        {/* Navigation */}
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
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

      {/* Editorial Footer Quote */}
      <div className="border-t border-[#E8E2D5] pt-4 px-3">
        <p className="font-serif italic text-xs text-[#8C877E] leading-relaxed">
          &ldquo;Some care, a little further.&rdquo;
        </p>
        <p className="text-[10px] text-[#A6A095] mt-0.5 tracking-wider uppercase font-medium">
          — Last Mile
        </p>
      </div>
    </aside>
  );
}
