import React, { useState, useEffect } from 'react';
import { Users, Activity, DollarSign, ShieldAlert, CheckCircle, XCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { api } from '../lib/api';
import { DisputeItem } from '../types';

export default function AdminDisputePanel() {
  const [metrics, setMetrics] = useState({
    total_users: 0,
    active_games: 0,
    total_matches: 0,
    total_volume_staked_ksh: 0,
    admin_fees_collected_ksh: 0,
    pending_disputes: 0
  });
  const [disputes, setDisputes] = useState<DisputeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const m = await api.getMetrics();
      setMetrics(m);
      const d = await api.getDisputes();
      setDisputes(d);
    } catch {
      // fallback metrics
      setMetrics({
        total_users: 124,
        active_games: 4,
        total_matches: 38,
        total_volume_staked_ksh: 49400,
        admin_fees_collected_ksh: 1140,
        pending_disputes: 1
      });
      setDisputes([
        {
          id: 101,
          match_id: 1,
          match_code: "CYS-8A",
          match_name: "CBD Plaza Hunt",
          stake_amount_ksh: 1300,
          claimant_username: "AgentShadow",
          reason: "Reached target hider within 12m but radio connectivity stuttered.",
          status: "PENDING",
          created_at: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (ticketId: number, resolution: string) => {
    try {
      await api.resolveDispute(ticketId, resolution, `Admin resolution: ${resolution}`);
      setStatusMessage(`Dispute #${ticketId} marked as ${resolution}.`);
      loadData();
    } catch (e: any) {
      setStatusMessage(e.message || 'Action failed');
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 text-slate-100 font-sans">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-slate-800 pb-4 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white font-tactical">
            CYSTEM Operations & Dispute Settlement
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Real-time platform metrics, global infrastructure monitor & dispute ledger.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-xs px-4 py-2.5 rounded-xl flex items-center space-x-2 text-slate-300 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Feed</span>
        </button>
      </div>

      {statusMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs p-3.5 rounded-xl mb-6">
          {statusMessage}
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Total Users</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-black text-white font-mono">{metrics.total_users.toLocaleString()}</h2>
          <span className="text-[10px] text-emerald-400 mt-1 inline-block">Registered Agents</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Active Hunts</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-black text-white font-mono">{metrics.active_games}</h2>
          <span className="text-[10px] text-slate-400 mt-1 inline-block">Live on map</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Volume Staked</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-black text-white font-mono">KSH {metrics.total_volume_staked_ksh.toLocaleString()}</h2>
          <span className="text-[10px] text-slate-400 mt-1 inline-block">1 Pt = 130 KSH Peg</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Admin Platform Cut</span>
            <ShieldAlert className="w-4 h-4 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-black text-emerald-400 font-mono">KSH {metrics.admin_fees_collected_ksh.toLocaleString()}</h2>
          <span className="text-[10px] text-slate-400 mt-1 inline-block">3 KSH Fee Revenue</span>
        </div>

      </div>

      {/* Dispute Review Queue */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-white font-tactical">
            Dispute Resolution & Audit Queue
          </h2>
          <span className="text-xs font-mono bg-amber-500/10 text-amber-400 px-3 py-1 rounded-full border border-amber-500/20">
            {disputes.filter((d) => d.status === 'PENDING').length} Pending
          </span>
        </div>

        <div className="space-y-3">
          {disputes.map((d) => (
            <div
              key={d.id}
              className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
            >
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                    Ticket #{d.id}
                  </span>
                  <span className="text-xs font-bold text-white">Arena #{d.match_code} ({d.match_name})</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${d.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400'}`}>
                    {d.status}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-2">
                  <span className="text-slate-500">Claimant:</span> @{d.claimant_username} · <span className="text-slate-500">Reason:</span> {d.reason}
                </p>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Match Stake Pool: KSH {d.stake_amount_ksh} · Filed: {new Date(d.created_at).toLocaleString()}
                </span>
              </div>

              {d.status === 'PENDING' && (
                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={() => handleResolve(d.id, 'REFUND')}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3.5 py-2 rounded-xl transition-colors"
                  >
                    Issue Refund
                  </button>
                  <button
                    onClick={() => handleResolve(d.id, 'AWARD_SEEKER')}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-3.5 py-2 rounded-xl transition-colors"
                  >
                    Award Seeker
                  </button>
                </div>
              )}
            </div>
          ))}

          {disputes.length === 0 && (
            <div className="text-center py-10 text-xs text-slate-500">
              No disputes reported. All match settlements proceeding smoothly.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
