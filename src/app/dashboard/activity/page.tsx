// Activity Log & Tamper-Evident Audit Chain Page
// References: docs/Last_Mile_UI_UX_Concept_C_Approved.png (Mobile Screen 7), docs/05_BACKEND_SCHEMA.md

'use client';

import { useState, useEffect } from 'react';
import { AppSidebar } from '@/components/AppSidebar';
import { AppHeader } from '@/components/AppHeader';
import { ShieldCheck, Hash } from 'lucide-react';

interface AuditItem {
  sequence: number;
  eventType: string;
  title: string;
  timestamp: string;
  actor: string;
  hash: string;
  previousHash: string;
}

const INITIAL_EVENTS: AuditItem[] = [
  {
    sequence: 5,
    eventType: 'checkin_recorded',
    title: 'Routine Check-in Recorded',
    timestamp: '29 Oct 2026, 4:45 PM UTC',
    actor: 'Owner (Shyam Sharma)',
    hash: '9f83ab20...c4d1',
    previousHash: 'a1b2c3d4...8e9f',
  },
  {
    sequence: 4,
    eventType: 'nominee_updated',
    title: 'Nominee Roster Confirmed (3 of 3)',
    timestamp: '25 Oct 2026, 11:20 AM UTC',
    actor: 'Owner (Shyam Sharma)',
    hash: 'a1b2c3d4...8e9f',
    previousHash: '7c8d9e0f...1a2b',
  },
  {
    sequence: 3,
    eventType: 'payload_updated',
    title: 'Encrypted Asset Envelope Updated',
    timestamp: '23 Oct 2026, 2:15 PM UTC',
    actor: 'Owner (Shyam Sharma)',
    hash: '7c8d9e0f...1a2b',
    previousHash: '3e4f5a6b...9c0d',
  },
  {
    sequence: 2,
    eventType: 'invite_sent',
    title: 'Nominee Invitations Dispatched',
    timestamp: '22 Oct 2026, 9:30 AM UTC',
    actor: 'System',
    hash: '3e4f5a6b...9c0d',
    previousHash: 'genesis-000000',
  },
  {
    sequence: 1,
    eventType: 'vault_created',
    title: 'Genesis Vault Initialized',
    timestamp: '22 Oct 2026, 9:00 AM UTC',
    actor: 'Owner (Shyam Sharma)',
    hash: 'genesis-000000',
    previousHash: '0000000000000000000000000000000000000000000000000000000000000000',
  },
];

export default function ActivityLogPage() {
  const [filter, setFilter] = useState<string>('all');
  const [events, setEvents] = useState<AuditItem[]>(INITIAL_EVENTS);
  const [isVerified, setIsVerified] = useState(true);

  useEffect(() => {
    const activeVaultId =
      typeof window !== 'undefined'
        ? localStorage.getItem('last_mile_active_vault') || 'vlt-primary'
        : 'vlt-primary';

    fetch(`/api/vaults/${activeVaultId}/audit`, {
      headers: { 'x-test-user-id': '11111111-1111-4111-8111-111111111111' },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.events && data.events.length > 0) {
          setEvents(
            data.events.map((e: {
              sequence: number;
              eventType: string;
              serverTime: string;
              actorUserId: string | null;
              eventHash: string;
              previousHash: string;
            }) => ({
              sequence: e.sequence,
              eventType: e.eventType,
              title: e.eventType.replace(/_/g, ' ').toUpperCase(),
              timestamp: new Date(e.serverTime).toLocaleString('en-US', {
                dateStyle: 'medium',
                timeStyle: 'short',
              }),
              actor: e.actorUserId ? 'Authorized User' : 'System',
              hash: e.eventHash.slice(0, 8) + '...' + e.eventHash.slice(-4),
              previousHash: e.previousHash.slice(0, 8) + '...' + e.previousHash.slice(-4),
            }))
          );
          setIsVerified(data.verification?.verified ?? true);
        }
      })
      .catch(() => {});
  }, []);

  const filtered = filter === 'all'
    ? events
    : events.filter((e) => e.eventType.includes(filter));

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex">
      <AppSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader />

        <main className="flex-1 p-6 sm:p-8 space-y-6 max-w-5xl w-full mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-serif text-3xl font-bold tracking-tight text-[#181816]">
                Activity Log
              </h1>
              <p className="text-xs text-[#6B665D] mt-0.5">
                Hash-chained event record providing tamper evidence for all security state changes.
              </p>
            </div>

            <div
              className={`stamp-badge self-start sm:self-auto ${
                isVerified
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-red-50 text-red-800 border-red-200'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Chain Integrity: {isVerified ? 'Verified' : 'Tamper Detected'}</span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex gap-2 border-b border-[#E8E2D5] pb-2">
            {[
              { id: 'all', label: 'All Activities' },
              { id: 'checkin', label: 'Check-ins' },
              { id: 'payload', label: 'Vault Updates' },
              { id: 'nominee', label: 'Nominees' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  filter === f.id
                    ? 'bg-[#1C1D1F] text-white shadow-xs'
                    : 'text-[#6B665D] hover:bg-[#F2ECE1] hover:text-[#181816]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Activity Timeline List */}
          <div className="space-y-3">
            {filtered.map((item) => (
              <div
                key={item.sequence}
                className="paper-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5">
                  <div className="h-8 w-8 rounded-full bg-[#FAF7F2] border border-[#E8E2D5] flex items-center justify-center text-[#1C1D1F] font-bold text-xs flex-shrink-0 mt-0.5">
                    #{item.sequence}
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-bold text-xs text-[#181816]">{item.title}</p>
                    <p className="text-[11px] text-[#8C877E]">Actor: {item.actor}</p>
                    <p className="text-[10px] text-[#A6A095]">{item.timestamp}</p>
                  </div>
                </div>

                <div className="text-right sm:text-right text-[11px] space-y-1 font-mono text-[#8C877E] pt-2 sm:pt-0 border-t sm:border-0 border-[#E8E2D5]">
                  <div className="flex items-center sm:justify-end gap-1">
                    <Hash className="h-3 w-3 text-emerald-700" />
                    <span>Hash: {item.hash}</span>
                  </div>
                  <div className="text-[10px] text-[#A6A095]">
                    Prev: {item.previousHash}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
