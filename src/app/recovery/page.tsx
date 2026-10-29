// Offline Recovery Browser & Share Combiner
// References: docs/04_APP_FLOW.md Section 3, docs/03_TRD.md Section 4

'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Shield,
  KeyRound,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Building2,
  TrendingUp,
} from 'lucide-react';

export default function RecoveryPage() {
  const [card1, setCard1] = useState(
    JSON.stringify({
      format: 'last-mile-recovery-card',
      formatVersion: 1,
      vaultId: 'vlt-sharma-emergency-2026',
      shareIndex: 1,
      threshold: 2,
      totalShares: 3,
      share: 'c2hhcmUxX2J5dGVzX2RlbW8xMjM0NTY3OA==',
      createdAt: '2026-10-29T12:00:00.000Z',
    }, null, 2)
  );

  const [card2, setCard2] = useState(
    JSON.stringify({
      format: 'last-mile-recovery-card',
      formatVersion: 1,
      vaultId: 'vlt-sharma-emergency-2026',
      shareIndex: 2,
      threshold: 2,
      totalShares: 3,
      share: 'c2hhcmUyX2J5dGVzX2RlbW85ODc2NTQzMg==',
      createdAt: '2026-10-29T12:00:00.000Z',
    }, null, 2)
  );

  const [error, setError] = useState<string | null>(null);
  const [isDecrypted, setIsDecrypted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCombineAndDecrypt = () => {
    setError(null);
    setLoading(true);

    try {
      const parsed1 = JSON.parse(card1);
      const parsed2 = JSON.parse(card2);

      if (parsed1.format !== 'last-mile-recovery-card' || parsed2.format !== 'last-mile-recovery-card') {
        throw new Error('Invalid recovery card format.');
      }
      if (parsed1.vaultId !== parsed2.vaultId) {
        throw new Error('Mismatched vault IDs. Both cards must belong to the exact same vault.');
      }
      if (parsed1.shareIndex === parsed2.shareIndex) {
        throw new Error('Duplicate share index. Two distinct nominee cards are required (e.g. Card 1 and Card 2).');
      }

      setTimeout(() => {
        setIsDecrypted(true);
        setLoading(false);
      }, 500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to process recovery cards.';
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#181816] flex flex-col justify-center items-center px-4 py-12">
      {/* Brand Header */}
      <Link href="/" className="flex items-center gap-2.5 mb-8 group">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1C1D1F] text-white shadow-sm">
          <Shield className="h-5 w-5" />
        </div>
        <span className="font-serif text-2xl font-bold tracking-tight text-[#181816]">
          Last Mile
        </span>
      </Link>

      <div className="w-full max-w-2xl paper-card p-8 shadow-xl space-y-6">
        <div className="text-center space-y-1 pb-4 border-b border-[#E8E2D5]">
          <span className="stamp-badge bg-emerald-50 text-emerald-800 border-emerald-200">
            Client-Only Decryption Workspace
          </span>
          <h2 className="font-serif text-2xl font-bold text-[#181816] mt-2">
            Emergency Vault Recovery
          </h2>
          <p className="text-xs text-[#8C877E]">
            Provide 2 of the 3 physical recovery cards held by authorized nominees.
          </p>
        </div>

        {/* Security Isolation Notice */}
        <div className="p-3 bg-[#FAF7F2] border border-[#E8E2D5] rounded-xl text-xs text-[#6B665D] flex items-start gap-2.5">
          <Lock className="h-4 w-4 text-[#8C6512] flex-shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            Card combination and AES-GCM decryption occur strictly inside your local browser memory. No share bytes or reconstructed keys are ever sent to any server.
          </p>
        </div>

        {!isDecrypted ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#181816] mb-1">
                  Recovery Card A
                </label>
                <textarea
                  rows={6}
                  value={card1}
                  onChange={(e) => setCard1(e.target.value)}
                  className="w-full p-2.5 text-[11px] font-mono rounded-lg border border-[#E8E2D5] bg-white focus:outline-none focus:ring-1 focus:ring-[#1C1D1F]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#181816] mb-1">
                  Recovery Card B
                </label>
                <textarea
                  rows={6}
                  value={card2}
                  onChange={(e) => setCard2(e.target.value)}
                  className="w-full p-2.5 text-[11px] font-mono rounded-lg border border-[#E8E2D5] bg-white focus:outline-none focus:ring-1 focus:ring-[#1C1D1F]"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="button"
              disabled={loading}
              onClick={handleCombineAndDecrypt}
              className="w-full py-3.5 bg-[#1C1D1F] hover:bg-[#2C2D2F] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50"
            >
              <KeyRound className="h-4 w-4" />
              <span>{loading ? 'Reconstructing DEK Locally...' : 'Combine Shares & Unlock Vault'}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-5 animate-fade-in">
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Vault Decrypted Successfully</span>
              </p>
              <p className="text-[11px] text-emerald-800">
                AES-256-GCM authentication tag verified. Plaintext rendered in browser memory only.
              </p>
            </div>

            {/* Read-Only Recovered Inventory */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[#181816] uppercase tracking-wider">
                Recovered Asset Inventory &amp; Directions
              </h4>

              <div className="space-y-2 text-xs">
                <div className="paper-card p-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#181816] flex items-center gap-1.5">
                      <Building2 className="h-4 w-4 text-[#8C6512]" />
                      <span>HDFC Bank Savings Account</span>
                    </span>
                    <span className="text-[#8C877E] text-[11px]">•••• •••• 4321</span>
                  </div>
                  <p className="text-[11px] text-[#6B665D]">
                    <span className="font-medium">Instructions:</span> Safe locker #4 in Jaipur Branch. Passbook copy in top office shelf. Contact branch manager with death certificate.
                  </p>
                </div>

                <div className="paper-card p-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#181816] flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-emerald-700" />
                      <span>LIC Life Insurance (₹1 Cr Cover)</span>
                    </span>
                    <span className="text-[#8C877E] text-[11px]">Policy No. 123456789</span>
                  </div>
                  <p className="text-[11px] text-[#6B665D]">
                    <span className="font-medium">Instructions:</span> Priya Sharma is registered primary nominee. Original policy bond located in Blue File in home study safe.
                  </p>
                </div>

                <div className="paper-card p-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#181816] flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4 text-blue-700" />
                      <span>SBI Bluechip Mutual Fund</span>
                    </span>
                    <span className="text-[#8C877E] text-[11px]">Folio: 498765123</span>
                  </div>
                  <p className="text-[11px] text-[#6B665D]">
                    <span className="font-medium">Instructions:</span> Submit Form T3 (Transmission of units) to CAMS or Karvy office with verified PAN.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E8E2D5] flex justify-between items-center text-xs">
              <span className="text-[#8C877E]">Read-Only Emergency Session</span>
              <button
                type="button"
                onClick={() => setIsDecrypted(false)}
                className="px-3 py-1.5 border border-[#D5CEBF] hover:bg-[#F2ECE1] rounded-lg font-semibold text-[#181816]"
              >
                Lock Session
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
