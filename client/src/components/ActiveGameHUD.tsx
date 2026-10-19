import React, { useState, useEffect } from 'react';
import { Camera, MapPin, Timer, DollarSign, Crosshair, Zap, Compass, Users, Radio, Scan } from 'lucide-react';
import TacticalMap from './TacticalMap';
import HotColdRadar from './HotColdRadar';
import { MatchDetails, Hint } from '../types';
import { api } from '../lib/api';

interface ActiveGameHUDProps {
  match: MatchDetails;
  userRole: 'HUNTER' | 'RUNNER';
  currentUserId: number;
  onOpenLiveCamera: (mode: 'HINT' | 'SCAN_CLAIM') => void;
  onMatchFinished: (result: any) => void;
}

export default function ActiveGameHUD({
  match,
  userRole,
  currentUserId,
  onOpenLiveCamera,
  onMatchFinished
}: ActiveGameHUDProps) {
  const [timeLeft, setTimeLeft] = useState(match.duration_seconds - match.elapsed_seconds);
  const [activeTab, setActiveTab] = useState<'map' | 'radar' | 'hints'>('map');
  const [hints, setHints] = useState<Hint[]>([]);
  const [distanceToTarget, setDistanceToTarget] = useState<number | null>(null);
  const [stormPhase, setStormPhase] = useState(0);
  const [currentRadius, setCurrentRadius] = useState(match.radius_meters || 500);
  const [inSafeZone, setInSafeZone] = useState(true);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) {
      handleTimeout();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  // Periodic location ping & hints refresh
  useEffect(() => {
    fetchHints();
    const pingInterval = setInterval(() => {
      performLocationPing();
    }, 6000); // 6-second periodic tactical ping

    return () => clearInterval(pingInterval);
  }, []);

  const fetchHints = async () => {
    try {
      const data = await api.getHints(match.code);
      setHints(data);
    } catch {
      // fallback
    }
  };

  const performLocationPing = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const res = await api.pingLocation({
              match_code: match.code,
              lat: pos.coords.latitude,
              lon: pos.coords.longitude
            });
            if (res.distance_to_target_meters !== undefined) {
              setDistanceToTarget(res.distance_to_target_meters);
            }
            if (res.storm) {
              setStormPhase(res.storm.phase);
              setCurrentRadius(res.storm.current_radius);
              setInSafeZone(res.storm.in_safe_zone);
            }
          } catch {
            // ignore network glitch
          }
        },
        () => {},
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  };

  const handleTimeout = async () => {
    try {
      const res = await api.surviveTimeout(match.code);
      onMatchFinished(res);
    } catch {
      // already settled
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(Math.max(0, secs) / 60);
    const s = Math.floor(Math.max(0, secs) % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative min-h-[88vh] flex flex-col justify-between p-3 md:p-5 max-w-2xl mx-auto w-full font-sans">
      
      {/* TOP HUD: Match Header & Real-Time Countdown */}
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 p-4 rounded-3xl shadow-xl flex justify-between items-center z-10">
        <div className="flex items-center space-x-3">
          <div className="relative flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
          </div>
          <div>
            <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest block">
              Arena #{match.code} · {userRole}
            </span>
            <h2 className="text-sm font-bold text-white font-tactical truncate max-w-[140px] md:max-w-xs">
              {match.name}
            </h2>
          </div>
        </div>

        {/* Live Countdown Timer */}
        <div className="bg-slate-950 border border-emerald-500/30 px-3.5 py-2 rounded-2xl flex items-center space-x-2 shadow-inner">
          <Timer className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="text-emerald-400 font-mono font-extrabold text-base tracking-widest">
            {formatTime(timeLeft)}
          </span>
        </div>
      </div>

      {/* SUB-BAR: Staked Pool & Storm Info */}
      <div className="grid grid-cols-2 gap-2 my-2 z-10">
        <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-2xl flex items-center justify-between">
          <span className="text-[11px] text-slate-400">Escrow Pool:</span>
          <span className="text-xs font-mono font-bold text-emerald-400">
            KSH {match.total_pool_ksh} ({(match.total_pool_ksh / 130).toFixed(1)} Pts)
          </span>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-2xl flex items-center justify-between">
          <span className="text-[11px] text-slate-400">Safe Circle:</span>
          <span className="text-xs font-mono font-bold text-white">
            {currentRadius}m ({inSafeZone ? '🟢 Safe' : '⚠️ Storm'})
          </span>
        </div>
      </div>

      {/* VIEW SELECTOR: Tactical Map vs Proximity Radar vs Clues */}
      <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800 mb-2 z-10 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('map')}
          className={`flex-1 py-2 rounded-xl transition-all ${activeTab === 'map' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
        >
          Tactical Map
        </button>
        <button
          onClick={() => setActiveTab('radar')}
          className={`flex-1 py-2 rounded-xl transition-all ${activeTab === 'radar' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
        >
          Proximity Radar
        </button>
        <button
          onClick={() => { setActiveTab('hints'); fetchHints(); }}
          className={`flex-1 py-2 rounded-xl transition-all relative ${activeTab === 'hints' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
        >
          <span>Live Hints ({hints.length})</span>
          {hints.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 absolute top-2 right-4"></span>}
        </button>
      </div>

      {/* MAIN VIEWPORT */}
      <div className="flex-1 flex flex-col justify-center my-1 z-10">
        
        {activeTab === 'map' && (
          <TacticalMap
            userRole={userRole}
            currentRadius={currentRadius}
            stormPhase={stormPhase}
            inSafeZone={inSafeZone}
            distanceToTarget={distanceToTarget}
          />
        )}

        {activeTab === 'radar' && (
          <HotColdRadar distanceMeters={distanceToTarget} />
        )}

        {activeTab === 'hints' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 h-80 overflow-y-auto space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Hider Hint Stream (Live Optical Feeds)
            </h3>
            {hints.map((h) => (
              <div key={h.id} className="bg-slate-950 border border-slate-800 p-3 rounded-2xl space-y-2">
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                  <span className="text-emerald-400 font-bold">CLUE #{h.clue_number}</span>
                  <span>{new Date(h.created_at).toLocaleTimeString()}</span>
                </div>
                {h.media_url && (
                  <div className="rounded-xl overflow-hidden max-h-48 bg-black">
                    <img src={h.media_url} alt="Hider Hint Clue" className="w-full h-full object-cover" />
                  </div>
                )}
                {h.hint_text && <p className="text-xs text-white">{h.hint_text}</p>}
              </div>
            ))}
            {hints.length === 0 && (
              <div className="text-center py-12 text-xs text-slate-500">
                No hints dropped yet. {userRole === 'RUNNER' ? 'Post clue #1 now!' : 'Waiting for hider clue...'}
              </div>
            )}
          </div>
        )}

      </div>

      {/* BOTTOM ACTION BAR */}
      <div className="grid grid-cols-2 gap-3 mt-3 z-10">
        
        {userRole === 'RUNNER' ? (
          <button
            onClick={() => onOpenLiveCamera('HINT')}
            className="col-span-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold py-4 rounded-2xl transition-all flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 active:scale-95 font-tactical text-base"
          >
            <Camera className="w-5 h-5" />
            <span>Drop Live Photo Hint</span>
          </button>
        ) : (
          <>
            <button
              onClick={() => onOpenLiveCamera('SCAN_CLAIM')}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold py-4 rounded-2xl transition-all flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 active:scale-95 font-tactical text-sm"
            >
              <Scan className="w-5 h-5" />
              <span>Scan & Claim Win</span>
            </button>

            <button
              onClick={() => setActiveTab(activeTab === 'radar' ? 'map' : 'radar')}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-2xl border border-slate-800 transition-colors flex items-center justify-center space-x-2 font-tactical text-sm"
            >
              <Radio className="w-5 h-5 text-emerald-400" />
              <span>{activeTab === 'radar' ? 'Show Map' : 'Radar Pulse'}</span>
            </button>
          </>
        )}

      </div>

    </div>
  );
}
