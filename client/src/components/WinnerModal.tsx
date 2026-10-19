import React from 'react';
import { Trophy, Award, Sparkles, ArrowRight, X } from 'lucide-react';

interface WinnerModalProps {
  winnerUsername: string;
  totalPoolKsh: number;
  adminFeeKsh?: number;
  winReason?: string;
  onClaimOrWithdraw: () => void;
  onClose: () => void;
}

export default function WinnerModal({
  winnerUsername,
  totalPoolKsh,
  adminFeeKsh = 3.0,
  winReason = 'Target Acquired! First-Come-First-Serve Victory',
  onClaimOrWithdraw,
  onClose
}: WinnerModalProps) {
  const netPayoutKsh = Math.max(0, totalPoolKsh - adminFeeKsh);

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 font-sans">
      <div className="max-w-sm w-full bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 shadow-[0_0_50px_rgba(16,185,129,0.2)] text-center relative overflow-hidden">
        
        {/* Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-emerald-500/25 rounded-full blur-3xl pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="inline-flex p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-3xl text-emerald-400 mb-4 shadow-inner">
          <Trophy className="w-10 h-10 animate-bounce" />
        </div>

        <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest border border-emerald-500/20 block w-max mx-auto mb-2">
          Victory Confirmed
        </span>

        <h2 className="text-2xl font-black text-white font-tactical">
          Operative @{winnerUsername}
        </h2>
        <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
          {winReason}
        </p>

        {/* Financial Settlement Card */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 my-6 text-left space-y-2 text-xs">
          <div className="flex justify-between text-slate-400">
            <span>Gross Escrow Pool:</span>
            <span className="font-mono text-white">KSH {totalPoolKsh.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Platform Admin Cut:</span>
            <span className="font-mono text-emerald-400">- KSH {adminFeeKsh.toFixed(2)}</span>
          </div>
          <div className="border-t border-slate-800 pt-2 flex justify-between text-sm font-bold text-white">
            <span>Net Credited Payout:</span>
            <span className="font-mono text-emerald-400">KSH {netPayoutKsh.toLocaleString()}</span>
          </div>
        </div>

        <button
          onClick={onClaimOrWithdraw}
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3.5 rounded-2xl transition-all flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 active:scale-95 font-tactical text-sm"
        >
          <Sparkles className="w-4 h-4" />
          <span>Access Vault & Withdraw to M-Pesa</span>
        </button>

      </div>
    </div>
  );
}
