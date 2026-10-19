import React, { useState, useEffect } from 'react';
import { Wallet, Smartphone, ShieldCheck, ArrowRight, Loader2, CheckCircle2, ArrowDownLeft, ArrowUpRight, DollarSign } from 'lucide-react';
import { api } from '../lib/api';
import { TransactionItem } from '../types';

interface WalletDepositProps {
  userPhone?: string;
  balanceKsh: number;
  points: number;
  onBalanceUpdated: () => void;
}

export default function WalletDeposit({
  userPhone = '2547',
  balanceKsh,
  points,
  onBalanceUpdated
}: WalletDepositProps) {
  const [tab, setTab] = useState<'deposit' | 'withdraw' | 'history'>('deposit');
  const [phone, setPhone] = useState(userPhone);
  const [amountKsh, setAmountKsh] = useState(130); // 1 Point = 130 KSH
  const [loading, setLoading] = useState(false);
  const [pendingTxId, setPendingTxId] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);

  useEffect(() => {
    loadTransactions();
  }, [tab]);

  const loadTransactions = async () => {
    try {
      const data = await api.getTransactions();
      setTransactions(data);
    } catch {
      // fallback
    }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const res = await api.depositStk(phone, amountKsh);
      setPendingTxId(res.transaction_id);
      setSuccessMessage('STK prompt dispatched to your phone! Enter your M-Pesa PIN.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Deposit initiation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateApproval = async () => {
    if (!pendingTxId) return;
    setLoading(true);
    try {
      const res = await api.simulateDepositComplete(pendingTxId);
      setSuccessMessage(res.message);
      setPendingTxId(null);
      onBalanceUpdated();
      loadTransactions();
    } catch (err: any) {
      setErrorMessage(err.message || 'Simulation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    if (balanceKsh < amountKsh) {
      setErrorMessage('Insufficient wallet balance.');
      return;
    }
    setLoading(true);

    try {
      const res = await api.withdraw(phone, amountKsh);
      setSuccessMessage(res.message);
      onBalanceUpdated();
      loadTransactions();
    } catch (err: any) {
      setErrorMessage(err.message || 'Withdrawal failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
        
        {/* Glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Balance Header */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 mb-6 flex justify-between items-center">
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono block">Vault Balance</span>
            <h3 className="text-2xl font-black text-white font-mono">KSH {balanceKsh.toLocaleString()}</h3>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono block">Points</span>
            <span className="text-lg font-bold text-emerald-400 font-mono">{points.toFixed(2)} Pts</span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800 mb-6 text-xs font-semibold">
          <button
            onClick={() => { setTab('deposit'); setErrorMessage(''); setSuccessMessage(''); }}
            className={`py-2 rounded-xl transition-all ${tab === 'deposit' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
          >
            Deposit
          </button>
          <button
            onClick={() => { setTab('withdraw'); setErrorMessage(''); setSuccessMessage(''); }}
            className={`py-2 rounded-xl transition-all ${tab === 'withdraw' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
          >
            Withdraw
          </button>
          <button
            onClick={() => { setTab('history'); setErrorMessage(''); setSuccessMessage(''); }}
            className={`py-2 rounded-xl transition-all ${tab === 'history' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
          >
            Ledger
          </button>
        </div>

        {errorMessage && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl mb-4">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs p-3 rounded-xl mb-4 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* TAB 1: DEPOSIT */}
        {tab === 'deposit' && (
          <form onSubmit={handleDeposit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                M-Pesa Phone Number
              </label>
              <div className="relative">
                <Smartphone className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="2547XXXXXXXX"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 pl-10 text-white font-mono text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Amount (KSH) — 1 Pt = 130 KSH
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3.5 top-3.5 w-4 h-4 text-emerald-400" />
                <input
                  type="number"
                  value={amountKsh}
                  onChange={(e) => setAmountKsh(Number(e.target.value))}
                  min={10}
                  step={10}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 pl-10 text-white font-mono text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Equivalent points: {(amountKsh / 130).toFixed(2)} Pts</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3.5 rounded-xl transition-all flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50 font-tactical"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Pushing STK Prompt...</span>
                </>
              ) : (
                <>
                  <span>Deposit via M-Pesa</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {pendingTxId && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSimulateApproval}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 text-xs font-bold py-2.5 rounded-xl transition-colors"
                >
                  ⚡ Simulate Instant PIN Approval (Sandbox)
                </button>
              </div>
            )}
          </form>
        )}

        {/* TAB 2: WITHDRAW */}
        {tab === 'withdraw' && (
          <form onSubmit={handleWithdraw} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Recipient M-Pesa Phone
              </label>
              <div className="relative">
                <Smartphone className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="2547XXXXXXXX"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 pl-10 text-white font-mono text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Withdrawal Amount (KSH)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3.5 top-3.5 w-4 h-4 text-emerald-400" />
                <input
                  type="number"
                  value={amountKsh}
                  onChange={(e) => setAmountKsh(Number(e.target.value))}
                  min={10}
                  max={balanceKsh}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 pl-10 text-white font-mono text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            {/* Fee Breakdown */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Requested Amount:</span>
                <span className="font-mono text-white">KSH {amountKsh}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Platform Admin Fee:</span>
                <span className="font-mono text-emerald-400">- KSH 3.00</span>
              </div>
              <div className="border-t border-slate-800 pt-1.5 flex justify-between font-bold text-white">
                <span>Net M-Pesa Payout:</span>
                <span className="font-mono text-emerald-400">KSH {Math.max(0, amountKsh - 3).toFixed(2)}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || balanceKsh < amountKsh}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3.5 rounded-xl transition-all flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50 font-tactical"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing Daraja Payout...</span>
                </>
              ) : (
                <>
                  <span>Withdraw to Phone</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* TAB 3: HISTORY LEDGER */}
        {tab === 'history' && (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {transactions.map((t) => (
              <div key={t.id} className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl flex justify-between items-center text-xs">
                <div className="flex items-center space-x-2">
                  <div className={`p-1.5 rounded-lg ${t.type === 'DEPOSIT' || t.type === 'WIN_PAYOUT' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                    {t.type === 'DEPOSIT' || t.type === 'WIN_PAYOUT' ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                  </div>
                  <div>
                    <span className="font-bold text-white block">{t.type}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{t.receipt || 'Ref pending'}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`font-mono font-bold block ${t.amount_ksh >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {t.amount_ksh >= 0 ? '+' : ''}KSH {Math.abs(t.amount_ksh)}
                  </span>
                  <span className="text-[9px] text-slate-500">{new Date(t.date).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
            {transactions.length === 0 && (
              <div className="text-center py-10 text-xs text-slate-500">
                No transactions recorded yet.
              </div>
            )}
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-center space-x-2 text-[10px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Safaricom Daraja API Protected & AES-256 Vault Encryption</span>
        </div>

      </div>
    </div>
  );
}
