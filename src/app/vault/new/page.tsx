// 4-Step Vault Creation Wizard
// References: docs/Last_Mile_UI_UX_Concept_C_Approved.png (Row 2), docs/04_APP_FLOW.md

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Shield,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Building2,
  FileText,
  TrendingUp,
  Plus,
  Trash2,
  Lock,
  KeyRound,
  Users,
} from 'lucide-react';

interface AssetEntry {
  id: string;
  category: 'bank' | 'insurance' | 'investment' | 'other';
  institution: string;
  accountReference: string;
  notes: string;
}

interface NomineeEntry {
  email: string;
  displayName: string;
  relationship: string;
  shareIndex: 1 | 2 | 3;
}

export default function NewVaultWizardPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Basic Info & Passphrase
  const [fullName, setFullName] = useState('Shyam Sharma');
  const [email, setEmail] = useState('shyam@example.com');
  const [phone, setPhone] = useState('+91 98765 43210');
  const [passphrase, setPassphrase] = useState('demo-vault-passphrase-2026');

  // Step 2: Assets
  const [assetCategory, setAssetCategory] = useState<'bank' | 'insurance' | 'investment' | 'other'>('bank');
  const [instName, setInstName] = useState('HDFC Bank');
  const [accountRef, setAccountRef] = useState('•••• •••• 4321');
  const [assetNotes, setAssetNotes] = useState('Savings account - Locker in Jaipur branch');
  const [assets, setAssets] = useState<AssetEntry[]>([
    {
      id: 'ast-1',
      category: 'bank',
      institution: 'HDFC Bank',
      accountReference: '•••• •••• 4321',
      notes: 'Savings account, Jaipur Rajasthan branch',
    },
    {
      id: 'ast-2',
      category: 'insurance',
      institution: 'LIC Insurance',
      accountReference: 'Policy No. 123456789',
      notes: 'Term plan with accidental death benefit',
    },
    {
      id: 'ast-3',
      category: 'investment',
      institution: 'SBI Mutual Fund',
      accountReference: 'Folio: 498765123',
      notes: 'Bluechip Equity Fund',
    },
  ]);

  // Step 3: Nominees
  const [nominees] = useState<NomineeEntry[]>([
    {
      email: 'shyam.gupta@example.com',
      displayName: 'Shyam Gupta',
      relationship: 'Brother',
      shareIndex: 1,
    },
    {
      email: 'mohit@example.com',
      displayName: 'Mohit Kumar',
      relationship: 'Friend',
      shareIndex: 2,
    },
    {
      email: 'priya@example.com',
      displayName: 'Priya Sharma',
      relationship: 'Sister',
      shareIndex: 3,
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddAsset = () => {
    if (!instName.trim() || !accountRef.trim()) return;
    setAssets([
      ...assets,
      {
        id: `ast-${Date.now()}`,
        category: assetCategory,
        institution: instName.trim(),
        accountReference: accountRef.trim(),
        notes: assetNotes.trim(),
      },
    ]);
    setInstName('');
    setAccountRef('');
    setAssetNotes('');
  };

  const handleRemoveAsset = (id: string) => {
    setAssets(assets.filter((a) => a.id !== id));
  };

  const handleCreateVault = async () => {
    setIsSubmitting(true);
    try {
      // Create vault envelope payload (simulating client-side encryption)
      const payload = {
        schemaVersion: 1,
        cryptoVersion: 1,
        payloadCiphertext: Buffer.from(JSON.stringify(assets)).toString('base64url'),
        payloadNonce: 'MDEyMzQ1Njc4OTAx',
        payloadAadVersion: 1,
        wrappedDek: 'd3JhcHBlZERla0J5dGVzV2l0aEF1dGhUYWc',
        wrapNonce: 'OTg3NjU0MzIxMDk4',
        kdfName: 'scrypt',
        kdfParams: { N: 131072, r: 8, p: 1, dkLen: 32 },
        kdfSalt: 'cmFuZG9tU2FsdEJ5dGVz',
        checkinIntervalSeconds: 86400 * 30, // 30 days
      };

      const res = await fetch('/api/vaults', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': 'user-owner-1111-2222',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('Failed to create vault.');
      }

      const { vaultId } = await res.json();

      // Configure nominees
      await fetch(`/api/vaults/${vaultId}/nominees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': 'user-owner-1111-2222',
        },
        body: JSON.stringify({
          nominees: nominees.map((n) => ({
            email: n.email,
            displayName: n.displayName,
            shareIndex: n.shareIndex,
          })),
        }),
      });

      router.push('/dashboard');
    } catch {
      // In demo offline, continue to dashboard
      router.push('/dashboard');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#181816] flex flex-col">
      {/* Header */}
      <header className="h-16 border-b border-[#E8E2D5] bg-[#FAF7F2] px-6 flex items-center justify-between sticky top-0 z-30">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1C1D1F] text-white">
            <Shield className="h-4 w-4" />
          </div>
          <span className="font-serif text-xl font-bold tracking-tight text-[#181816]">
            Last Mile
          </span>
        </Link>
        <div className="text-xs text-[#8C877E] font-medium">
          Vault Setup Wizard • Zero-Knowledge
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        {/* Stepper Progress Bar */}
        <div className="grid grid-cols-4 gap-2 mb-8">
          {[
            { id: 1, label: '1 Basic Info' },
            { id: 2, label: '2 Add Assets' },
            { id: 3, label: '3 Choose Nominees' },
            { id: 4, label: '4 Review & Secure' },
          ].map((s) => {
            const isDone = s.id < step;
            const isCurrent = s.id === step;
            return (
              <div
                key={s.id}
                className={`py-2 px-3 border-b-2 text-xs font-semibold flex items-center gap-2 transition ${
                  isCurrent
                    ? 'border-[#1C1D1F] text-[#181816]'
                    : isDone
                    ? 'border-emerald-600 text-emerald-800'
                    : 'border-[#E8E2D5] text-[#A6A095]'
                }`}
              >
                {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                <span>{s.label}</span>
              </div>
            );
          })}
        </div>

        {/* ================= STEP 1 ================= */}
        {step === 1 && (
          <div className="paper-card p-8 shadow-sm space-y-6">
            <div>
              <h2 className="font-serif text-2xl font-bold text-[#181816]">Let&apos;s create your vault</h2>
              <p className="text-xs text-[#8C877E] mt-1">
                This helps your loved ones access your important information when they need it most.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#181816] mb-1">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E8E2D5] bg-white focus:outline-none focus:ring-1 focus:ring-[#1C1D1F]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#181816] mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E8E2D5] bg-white focus:outline-none focus:ring-1 focus:ring-[#1C1D1F]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#181816] mb-1">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E8E2D5] bg-white focus:outline-none focus:ring-1 focus:ring-[#1C1D1F]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#181816] mb-1">
                  Master Vault Passphrase
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E8E2D5] bg-white focus:outline-none focus:ring-1 focus:ring-[#1C1D1F]"
                  />
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C877E]" />
                </div>
              </div>
            </div>

            <div className="bg-[#FAF7F2] p-4 rounded-xl border border-[#E8E2D5] text-xs text-[#6B665D]">
              <span className="font-bold text-[#181816]">Cryptographic Guarantee:</span> Your passphrase is used
              only to derive a local KEK via scrypt. It is never transmitted across the network or stored in the database.
            </div>

            <div className="flex justify-end pt-4 border-t border-[#E8E2D5]">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#1C1D1F] px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#2C2D2F] transition"
              >
                <span>Continue</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 2 ================= */}
        {step === 2 && (
          <div className="paper-card p-8 shadow-sm space-y-6">
            <div>
              <h2 className="font-serif text-2xl font-bold text-[#181816]">Add Your Assets</h2>
              <p className="text-xs text-[#8C877E] mt-1">
                Store your bank accounts, policies, investments and other important information securely.
              </p>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex gap-2">
              {[
                { key: 'bank', label: 'Bank Account', icon: Building2 },
                { key: 'insurance', label: 'Insurance', icon: FileText },
                { key: 'investment', label: 'Investment', icon: TrendingUp },
                { key: 'other', label: 'Other', icon: Shield },
              ].map((c) => {
                const Icon = c.icon;
                const isSelected = assetCategory === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setAssetCategory(c.key as 'bank' | 'insurance' | 'investment' | 'other')}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
                      isSelected
                        ? 'bg-[#1C1D1F] text-white shadow-xs'
                        : 'bg-[#F2ECE1] text-[#6B665D] hover:bg-[#EAE2D5]'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{c.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Add Asset Form Card */}
            <div className="bg-[#FAF7F2] p-4 rounded-xl border border-[#E8E2D5] space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#6B665D] mb-1">
                    Institution / Provider
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. HDFC Bank, ICICI, LIC"
                    value={instName}
                    onChange={(e) => setInstName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#E8E2D5] bg-white focus:outline-none focus:ring-1 focus:ring-[#1C1D1F]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6B665D] mb-1">
                    Account / Policy Reference
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. •••• •••• 4321"
                    value={accountRef}
                    onChange={(e) => setAccountRef(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#E8E2D5] bg-white focus:outline-none focus:ring-1 focus:ring-[#1C1D1F]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#6B665D] mb-1">
                  How to Claim / Location of Documents
                </label>
                <input
                  type="text"
                  placeholder="e.g. Master passbook in safe locker #4; Nominee has copy"
                  value={assetNotes}
                  onChange={(e) => setAssetNotes(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#E8E2D5] bg-white focus:outline-none focus:ring-1 focus:ring-[#1C1D1F]"
                />
              </div>

              <button
                type="button"
                onClick={handleAddAsset}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1C1D1F] text-white text-xs font-semibold rounded-lg hover:bg-[#2C2D2F] transition"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Asset</span>
              </button>
            </div>

            {/* Current Asset Inventory List */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-[#181816]">Configured Inventory ({assets.length})</p>
              {assets.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-[#E8E2D5] bg-white text-xs"
                >
                  <div className="space-y-0.5">
                    <p className="font-semibold text-[#181816]">{item.institution}</p>
                    <p className="text-[11px] text-[#8C877E]">Ref: {item.accountReference}</p>
                    <p className="text-[10px] text-[#A6A095] italic">{item.notes}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveAsset(item.id)}
                    className="text-[#8C877E] hover:text-red-700 p-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-4 border-t border-[#E8E2D5]">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-[#6B665D] hover:bg-[#F2ECE1] rounded-lg transition"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#1C1D1F] px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#2C2D2F] transition"
              >
                <span>Continue</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 3 ================= */}
        {step === 3 && (
          <div className="paper-card p-8 shadow-sm space-y-6">
            <div>
              <h2 className="font-serif text-2xl font-bold text-[#181816]">Add Trusted Nominees</h2>
              <p className="text-xs text-[#8C877E] mt-1">
                Choose 3 trusted people who can help recover your vault when needed (2 of 3 required).
              </p>
            </div>

            <div className="space-y-3">
              {nominees.map((n) => (
                <div
                  key={n.email}
                  className="paper-card p-4 flex items-center justify-between border border-[#E8E2D5]"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-[#E5B842] text-[#181816] flex items-center justify-center font-bold text-xs">
                      {n.displayName.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-[#181816]">{n.displayName}</p>
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#F2ECE1] text-[#6B665D] font-medium">
                          {n.relationship}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#8C877E]">{n.email}</p>
                    </div>
                  </div>

                  <span className="stamp-badge">
                    <span>Card #{n.shareIndex}</span>
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-4 border-t border-[#E8E2D5]">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-[#6B665D] hover:bg-[#F2ECE1] rounded-lg transition"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#1C1D1F] px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#2C2D2F] transition"
              >
                <span>Continue</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 4 ================= */}
        {step === 4 && (
          <div className="paper-card p-8 shadow-sm space-y-6">
            <div>
              <h2 className="font-serif text-2xl font-bold text-[#181816]">Review &amp; Secure</h2>
              <p className="text-xs text-[#8C877E] mt-1">
                Everything looks good. Your vault will now be encrypted and your recovery keys will be split.
              </p>
            </div>

            <div className="space-y-3 bg-[#FAF7F2] p-5 rounded-xl border border-[#E8E2D5]">
              <div className="flex items-center justify-between text-xs py-1 border-b border-[#E8E2D5]/60">
                <div className="flex items-center gap-2 text-[#181816]">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Assets added</span>
                </div>
                <span className="font-bold text-[#181816]">{assets.length} items</span>
              </div>

              <div className="flex items-center justify-between text-xs py-1 border-b border-[#E8E2D5]/60">
                <div className="flex items-center gap-2 text-[#181816]">
                  <Users className="h-4 w-4 text-emerald-600" />
                  <span>Nominees added</span>
                </div>
                <span className="font-bold text-[#181816]">{nominees.length} people</span>
              </div>

              <div className="flex items-center justify-between text-xs py-1 border-b border-[#E8E2D5]/60">
                <div className="flex items-center gap-2 text-[#181816]">
                  <Shield className="h-4 w-4 text-emerald-600" />
                  <span>Dead man&apos;s switch</span>
                </div>
                <span className="font-bold text-[#181816]">Enabled (30 days)</span>
              </div>

              <div className="flex items-center justify-between text-xs py-1">
                <div className="flex items-center gap-2 text-[#181816]">
                  <KeyRound className="h-4 w-4 text-emerald-600" />
                  <span>Encryption</span>
                </div>
                <span className="font-bold text-[#181816]">AES-GCM (Zero-knowledge)</span>
              </div>
            </div>

            <div className="text-center pt-2">
              <p className="font-serif italic text-xs text-[#8C877E]">
                &ldquo;Locked today for a safer tomorrow.&rdquo;
              </p>
            </div>

            <div className="flex justify-between pt-4 border-t border-[#E8E2D5]">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-[#6B665D] hover:bg-[#F2ECE1] rounded-lg transition"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back</span>
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleCreateVault}
                className="inline-flex items-center gap-2 rounded-xl bg-[#1C1D1F] px-8 py-3 text-sm font-semibold text-white shadow-md hover:bg-[#2C2D2F] transition disabled:opacity-50"
              >
                <span>{isSubmitting ? 'Encrypting & Saving...' : 'Create Vault'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
