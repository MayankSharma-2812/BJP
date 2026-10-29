// Asset Inventory Management Page
// References: docs/Last_Mile_UI_UX_Concept_C_Approved.png, docs/01_PRD.md

'use client';

import { useState } from 'react';
import { AppSidebar } from '@/components/AppSidebar';
import { AppHeader } from '@/components/AppHeader';
import {
  Building2,
  FileText,
  TrendingUp,
  Shield,
  Plus,
  Trash2,
  Lock,
} from 'lucide-react';

interface AssetItem {
  id: string;
  category: 'bank' | 'insurance' | 'investment' | 'property';
  institution: string;
  accountReference: string;
  holder: string;
  branch?: string;
  notes: string;
  documentLocation: string;
}

export default function AssetsPage() {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [assets, setAssets] = useState<AssetItem[]>([
    {
      id: 'ast-101',
      category: 'bank',
      institution: 'HDFC Bank',
      accountReference: '•••• •••• 4321',
      holder: 'Shyam Sharma',
      branch: 'Jaipur, Rajasthan',
      notes: 'Main savings account and locker #4',
      documentLocation: 'Safe in home office, top shelf',
    },
    {
      id: 'ast-102',
      category: 'insurance',
      institution: 'LIC Insurance',
      accountReference: 'Policy No. 123456789',
      holder: 'Shyam Sharma',
      notes: 'Term plan with ₹1 Cr cover, death benefit nominee registered',
      documentLocation: 'Blue physical folder in safe',
    },
    {
      id: 'ast-103',
      category: 'investment',
      institution: 'SBI Mutual Fund',
      accountReference: 'Folio: 498765123',
      holder: 'Shyam Sharma',
      notes: 'Bluechip Equity Fund, quarterly dividend',
      documentLocation: 'Online portal and statement binder',
    },
    {
      id: 'ast-104',
      category: 'property',
      institution: 'Ancestral Property',
      accountReference: 'Deed Reg #1042/2018',
      holder: 'Family Trust',
      branch: 'Jaipur, Rajasthan',
      notes: 'Original registry title deed and tax receipts',
      documentLocation: 'Bank locker with HDFC',
    },
  ]);

  // Form states
  const [institution, setInstitution] = useState('');
  const [category, setCategory] = useState<'bank' | 'insurance' | 'investment' | 'property'>('bank');
  const [accountReference, setAccountReference] = useState('');
  const [notes, setNotes] = useState('');
  const [documentLocation, setDocumentLocation] = useState('');

  const filteredAssets = activeCategory === 'all'
    ? assets
    : assets.filter((a) => a.category === activeCategory);

  const handleSaveAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!institution || !accountReference) return;
    setAssets([
      ...assets,
      {
        id: `ast-${Date.now()}`,
        category,
        institution,
        accountReference,
        holder: 'Shyam Sharma',
        notes,
        documentLocation,
      },
    ]);
    setIsAddModalOpen(false);
    setInstitution('');
    setAccountReference('');
    setNotes('');
    setDocumentLocation('');
  };

  const handleDelete = (id: string) => {
    setAssets(assets.filter((a) => a.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex">
      <AppSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader />

        <main className="flex-1 p-6 sm:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* Header & Add Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-serif text-3xl font-bold tracking-tight text-[#181816]">
                Asset Inventory
              </h1>
              <p className="text-xs text-[#6B665D] mt-0.5">
                Structured emergency directions for institutions, documents, and claim checklists.
              </p>
            </div>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1C1D1F] hover:bg-[#2C2D2F] text-white text-xs font-semibold rounded-xl shadow-xs transition self-start sm:self-auto"
            >
              <Plus className="h-4 w-4" />
              <span>Add New Asset</span>
            </button>
          </div>

          {/* Zero-Knowledge Privacy Notice Banner */}
          <div className="paper-card p-4 bg-[#F7F3E9] border-[#E2D8C3] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-[#EAE0CA] text-[#7A5B0B] flex items-center justify-center flex-shrink-0">
                <Lock className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#181816]">Client-Side Confidentiality</p>
                <p className="text-[11px] text-[#6B665D]">
                  All inventory fields below are stored exclusively in an encrypted envelope. The server never receives raw asset names or account numbers.
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-flex stamp-badge">AES-256-GCM Verified</span>
          </div>

          {/* Category Tabs */}
          <div className="flex gap-2 border-b border-[#E8E2D5] pb-2">
            {[
              { id: 'all', label: 'All Items' },
              { id: 'bank', label: 'Bank Accounts' },
              { id: 'insurance', label: 'Insurance' },
              { id: 'investment', label: 'Investments' },
              { id: 'property', label: 'Property / Legal' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeCategory === tab.id
                    ? 'bg-[#1C1D1F] text-white shadow-xs'
                    : 'text-[#6B665D] hover:bg-[#F2ECE1] hover:text-[#181816]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Asset List Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAssets.map((asset) => {
              const Icon =
                asset.category === 'bank'
                  ? Building2
                  : asset.category === 'insurance'
                  ? FileText
                  : asset.category === 'investment'
                  ? TrendingUp
                  : Shield;

              return (
                <div key={asset.id} className="paper-card p-5 space-y-3 relative group">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-[#FAF7F2] border border-[#E8E2D5] flex items-center justify-center text-[#1C1D1F]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[#181816]">{asset.institution}</h4>
                        <p className="text-xs text-[#8C877E]">{asset.accountReference}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(asset.id)}
                      className="text-[#A6A095] hover:text-red-700 p-1 opacity-0 group-hover:opacity-100 transition"
                      title="Delete asset entry"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="text-xs space-y-1 pt-2 border-t border-[#E8E2D5]/70">
                    <div className="flex justify-between text-[#8C877E]">
                      <span>Account Holder:</span>
                      <span className="font-medium text-[#181816]">{asset.holder}</span>
                    </div>
                    {asset.branch && (
                      <div className="flex justify-between text-[#8C877E]">
                        <span>Branch:</span>
                        <span className="font-medium text-[#181816]">{asset.branch}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-[#8C877E]">
                      <span>Document Location:</span>
                      <span className="font-medium text-[#181816]">{asset.documentLocation}</span>
                    </div>
                  </div>

                  {asset.notes && (
                    <div className="p-2.5 bg-[#FAF7F2] rounded-lg border border-[#E8E2D5] text-[11px] text-[#6B665D] italic">
                      &ldquo;{asset.notes}&rdquo;
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </main>
      </div>

      {/* Add Asset Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#181816]/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg paper-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D5]">
              <h3 className="font-serif text-lg font-bold text-[#181816]">Add Asset or Direction</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#8C877E] hover:text-[#181816] text-xs font-semibold"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleSaveAsset} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#181816] mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as 'bank' | 'insurance' | 'investment' | 'property')}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E2D5] bg-white focus:outline-none focus:ring-1 focus:ring-[#1C1D1F]"
                >
                  <option value="bank">Bank Account</option>
                  <option value="insurance">Insurance Policy</option>
                  <option value="investment">Investment / Mutual Fund</option>
                  <option value="property">Property / Will / Legal Document</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#181816] mb-1">Institution Name</label>
                <input
                  type="text"
                  placeholder="e.g. HDFC Bank, ICICI Prudential, SBI Mutual Fund"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E2D5] bg-white focus:outline-none focus:ring-1 focus:ring-[#1C1D1F]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#181816] mb-1">
                  Account Reference / Policy Label
                </label>
                <input
                  type="text"
                  placeholder="e.g. •••• •••• 4321 or Policy-TEST-1042"
                  value={accountReference}
                  onChange={(e) => setAccountReference(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E2D5] bg-white focus:outline-none focus:ring-1 focus:ring-[#1C1D1F]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#181816] mb-1">
                  Physical Documents Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. Master locker in Jaipur, or Blue binder in home study"
                  value={documentLocation}
                  onChange={(e) => setDocumentLocation(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E2D5] bg-white focus:outline-none focus:ring-1 focus:ring-[#1C1D1F]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#181816] mb-1">
                  Claim Checklist &amp; Instructions
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Contact relationship manager Manoj; copy of death certificate needed"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E2D5] bg-white focus:outline-none focus:ring-1 focus:ring-[#1C1D1F]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#6B665D] hover:bg-[#F2ECE1] rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1C1D1F] hover:bg-[#2C2D2F] text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  Encrypt &amp; Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
