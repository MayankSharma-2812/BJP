// Nominee Management & Delivery Checklist Page
// References: docs/Last_Mile_UI_UX_Concept_C_Approved.png, docs/05_BACKEND_SCHEMA.md

'use client';

import { useState } from 'react';
import { AppSidebar } from '@/components/AppSidebar';
import { AppHeader } from '@/components/AppHeader';
import {
  Copy,
  Check,
  ShieldCheck,
  Mail,
  AlertCircle,
} from 'lucide-react';

interface NomineeView {
  id: string;
  displayName: string;
  email: string;
  relationship: string;
  shareIndex: 1 | 2 | 3;
  status: 'pending' | 'active';
  deliveryState: 'delivered' | 'pending';
  inviteToken?: string;
}

export default function NomineesPage() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [nominees, setNominees] = useState<NomineeView[]>([
    {
      id: 'nom-1',
      displayName: 'Shyam Gupta',
      email: 'shyam.gupta@example.com',
      relationship: 'Brother',
      shareIndex: 1,
      status: 'active',
      deliveryState: 'delivered',
      inviteToken: 'inv_8f7b3a9e1c2d4e5f6a7b8c9d0e1f2a3b',
    },
    {
      id: 'nom-2',
      displayName: 'Mohit Kumar',
      email: 'mohit@example.com',
      relationship: 'Friend',
      shareIndex: 2,
      status: 'active',
      deliveryState: 'delivered',
      inviteToken: 'inv_4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f',
    },
    {
      id: 'nom-3',
      displayName: 'Priya Sharma',
      email: 'priya@example.com',
      relationship: 'Sister',
      shareIndex: 3,
      status: 'pending',
      deliveryState: 'pending',
      inviteToken: 'inv_1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d',
    },
  ]);

  const copyInvite = (token: string, id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/nominee/approval?token=${token}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleDelivery = (id: string) => {
    setNominees(
      nominees.map((n) =>
        n.id === id
          ? { ...n, deliveryState: n.deliveryState === 'delivered' ? 'pending' : 'delivered' }
          : n
      )
    );
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex">
      <AppSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader />

        <main className="flex-1 p-6 sm:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-serif text-3xl font-bold tracking-tight text-[#181816]">
                Trusted Nominees
              </h1>
              <p className="text-xs text-[#6B665D] mt-0.5">
                3 authorized participants assigned offline recovery cards. Any 2 can reconstruct the vault key.
              </p>
            </div>

            <div className="stamp-badge self-start sm:self-auto bg-emerald-50 text-emerald-800 border-emerald-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Threshold: 2 of 3 Required</span>
            </div>
          </div>

          {/* Custody Rule Banner */}
          <div className="paper-card p-4 bg-[#F8F4EA] border-[#E5DECC] space-y-1">
            <p className="text-xs font-bold text-[#181816] flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 text-amber-700" />
              <span>Offline Recovery Card Custody Model (ADR-004)</span>
            </p>
            <p className="text-[11px] text-[#6B665D]">
              Recovery cards were generated and exported on your device. The server never holds or stores recovery share bytes. Deliver cards #1, #2, and #3 to your nominees separately.
            </p>
          </div>

          {/* Nominees Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {nominees.map((nominee) => (
              <div key={nominee.id} className="paper-card p-6 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-start justify-between">
                    <div className="h-12 w-12 rounded-full bg-[#E5B842] text-[#181816] flex items-center justify-center font-serif text-lg font-bold">
                      {nominee.displayName.charAt(0)}
                    </div>
                    <span className="stamp-badge">
                      <span>Card #{nominee.shareIndex}</span>
                    </span>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center gap-2">
                      <h4 className="font-serif text-base font-bold text-[#181816]">
                        {nominee.displayName}
                      </h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#F2ECE1] text-[#6B665D] font-medium">
                        {nominee.relationship}
                      </span>
                    </div>
                    <p className="text-xs text-[#8C877E] flex items-center gap-1 mt-0.5">
                      <Mail className="h-3 w-3" />
                      <span>{nominee.email}</span>
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-[#E8E2D5] text-xs">
                  {/* Status */}
                  <div className="flex items-center justify-between">
                    <span className="text-[#8C877E]">Account Status:</span>
                    <span
                      className={`font-semibold capitalize ${
                        nominee.status === 'active' ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {nominee.status}
                    </span>
                  </div>

                  {/* Physical Delivery Checklist */}
                  <div className="flex items-center justify-between">
                    <span className="text-[#8C877E]">Card Handed Off:</span>
                    <button
                      onClick={() => toggleDelivery(nominee.id)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                        nominee.deliveryState === 'delivered'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                      }`}
                    >
                      {nominee.deliveryState === 'delivered' ? '✓ Delivered' : 'Pending Handoff'}
                    </button>
                  </div>

                  {/* Invitation Link Copy */}
                  {nominee.inviteToken && (
                    <button
                      onClick={() => copyInvite(nominee.inviteToken!, nominee.id)}
                      className="w-full mt-2 py-2 px-3 border border-[#D5CEBF] hover:bg-[#F2ECE1] text-[#181816] rounded-lg flex items-center justify-center gap-1.5 font-semibold text-xs transition"
                    >
                      {copiedId === nominee.id ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Invite Link Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 text-[#8C877E]" />
                          <span>Copy Portal Link</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
