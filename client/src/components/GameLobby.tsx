import React, { useState, useEffect } from 'react';
import { Play, Users, MapPin, Shield, Shuffle, Plus, Compass, Clock, DollarSign, Loader2 } from 'lucide-react';
import { api } from '../lib/api';

interface GameLobbyProps {
  onStartMatch: (matchData: any) => void;
  userBalanceKsh: number;
  onOpenWallet: () => void;
}

export default function GameLobby({ onStartMatch, userBalanceKsh, onOpenWallet }: GameLobbyProps) {
  const [tab, setTab] = useState<'join' | 'create' | 'discover'>('join');
  const [gameCode, setGameCode] = useState('');
  const [selectedRole, setSelectedRole] = useState<'HUNTER' | 'RUNNER' | 'RANDOM'>('RANDOM');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Host form states
  const [huntName, setHuntName] = useState('Campus Tactical Pursuit');
  const [stakeKsh, setStakeKsh] = useState(130);
  const [radiusMeters, setRadiusMeters] = useState(500);
  const [durationMinutes, setDurationMinutes] = useState(30);

  // Discover list
  const [publicMatches, setPublicMatches] = useState<any[]>([]);

  useEffect(() => {
    if (tab === 'discover') {
      loadPublicMatches();
    }
  }, [tab]);

  const loadPublicMatches = async () => {
    try {
      const data = await api.listPublicMatches();
      setPublicMatches(data);
    } catch {
      // fallback
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (gameCode.length < 6) return;
    setError('');
    setLoading(true);

    try {
      const res = await api.joinMatch(gameCode, selectedRole);
      const match = await api.getMatchDetails(res.code);
      onStartMatch({ ...match, userRole: res.role });
    } catch (err: any) {
      setError(err.message || 'Failed to join match.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (userBalanceKsh < stakeKsh) {
      setError(`Insufficient balance. You need at least KSH ${stakeKsh} to create this arena.`);
      return;
    }
    setLoading(true);

    try {
      // Get current location if permitted
      let center_lat = -1.2921;
      let center_lon = 36.8219;
      if (navigator.geolocation) {
        await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              center_lat = pos.coords.latitude;
              center_lon = pos.coords.longitude;
              resolve(true);
            },
            () => resolve(false),
            { timeout: 3000 }
          );
        });
      }

      const res = await api.createMatch({
        name: huntName,
        stake_amount_ksh: stakeKsh,
        radius_meters: radiusMeters,
        duration_seconds: durationMinutes * 60,
        center_lat,
        center_lon
      });

      const match = await api.getMatchDetails(res.code);
      onStartMatch({ ...match, userRole: 'RUNNER' });
    } catch (err: any) {
      setError(err.message || 'Failed to create match arena.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
        
        {/* Glow */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Tab Switcher */}
        <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800 mb-6 text-xs font-semibold">
          <button
            onClick={() => { setTab('join'); setError(''); }}
            className={`py-2.5 rounded-xl transition-all ${tab === 'join' ? 'bg-emerald-500 text-slate-950 font-bold shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
            Enter Code
          </button>
          <button
            onClick={() => { setTab('create'); setError(''); }}
            className={`py-2.5 rounded-xl transition-all ${tab === 'create' ? 'bg-emerald-500 text-slate-950 font-bold shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
            Host Hunt
          </button>
          <button
            onClick={() => { setTab('discover'); setError(''); }}
            className={`py-2.5 rounded-xl transition-all ${tab === 'discover' ? 'bg-emerald-500 text-slate-950 font-bold shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
            Discover
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3.5 rounded-xl mb-4">
            {error}
          </div>
        )}

        {/* TAB 1: ENTER CODE */}
        {tab === 'join' && (
          <form onSubmit={handleJoin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                6-Character Arena Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={gameCode}
                onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                placeholder="EX: A7K9X2"
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-4 text-center font-mono text-2xl tracking-widest text-emerald-400 focus:outline-none focus:border-emerald-500 transition-colors uppercase"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Role Preference
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedRole('HUNTER')}
                  className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center space-y-1 transition-all ${selectedRole === 'HUNTER' ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
                >
                  <Shield className="w-4 h-4" />
                  <span>Hunter</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole('RUNNER')}
                  className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center space-y-1 transition-all ${selectedRole === 'RUNNER' ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
                >
                  <MapPin className="w-4 h-4" />
                  <span>Runner</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole('RANDOM')}
                  className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center space-y-1 transition-all ${selectedRole === 'RANDOM' ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
                >
                  <Shuffle className="w-4 h-4" />
                  <span>Random</span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || gameCode.length < 6}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-4 rounded-2xl transition-all flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50 font-tactical"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Syncing Tactical Link...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-slate-950" />
                  <span>Enter Hunt Arena</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* TAB 2: HOST A HUNT */}
        {tab === 'create' && (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Hunt Name
              </label>
              <input
                type="text"
                value={huntName}
                onChange={(e) => setHuntName(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Stake Amount (KSH)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 w-4 h-4 text-emerald-400" />
                  <input
                    type="number"
                    value={stakeKsh}
                    onChange={(e) => setStakeKsh(Number(e.target.value))}
                    min={10}
                    step={10}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 pl-9 text-sm text-white font-mono focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">{(stakeKsh / 130).toFixed(2)} Points</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Duration (Mins)
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="number"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    min={5}
                    max={120}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 pl-9 text-sm text-white font-mono focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Storm Radius (Meters)
              </label>
              <div className="relative">
                <Compass className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="number"
                  value={radiusMeters}
                  onChange={(e) => setRadiusMeters(Number(e.target.value))}
                  min={100}
                  max={3000}
                  step={50}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 pl-9 text-sm text-white font-mono focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3.5 rounded-2xl transition-all flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50 mt-2 font-tactical"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Locking Escrow & Arena...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Stake KSH {stakeKsh} & Create Hunt</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* TAB 3: DISCOVER NEARBY */}
        {tab === 'discover' && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Live Public Arenas</h3>
            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
              {publicMatches.map((m) => (
                <div
                  key={m.id}
                  onClick={() => {
                    setGameCode(m.code);
                    setTab('join');
                  }}
                  className="bg-slate-950 border border-slate-800 hover:border-emerald-500/40 p-3 rounded-xl cursor-pointer transition-all flex justify-between items-center"
                >
                  <div>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      #{m.code}
                    </span>
                    <h4 className="text-sm font-bold text-white mt-1">{m.name}</h4>
                    <span className="text-[11px] text-slate-500">
                      Pool: KSH {m.total_pool_ksh} · {m.player_count} Players
                    </span>
                  </div>
                  <span className="text-xs bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300">
                    Join
                  </span>
                </div>
              ))}
              {publicMatches.length === 0 && (
                <div className="text-center py-8 text-xs text-slate-500">
                  No public arenas found. Create one to get started!
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
