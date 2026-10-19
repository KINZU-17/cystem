import React, { useState, useEffect } from 'react';
import { Crosshair, MapPin, Shield, Zap, Heart, AlertTriangle } from 'lucide-react';

interface TacticalMapProps {
  userRole: 'HUNTER' | 'RUNNER';
  currentRadius: number;
  stormPhase: number;
  inSafeZone: boolean;
  distanceToTarget?: number | null;
  hiderLat?: number;
  hiderLon?: number;
  userLat?: number;
  userLon?: number;
}

export default function TacticalMap({
  userRole,
  currentRadius,
  stormPhase,
  inSafeZone,
  distanceToTarget
}: TacticalMapProps) {
  const [radarAngle, setRadarAngle] = useState(0);

  // Radar sweep animation
  useEffect(() => {
    const interval = setInterval(() => {
      setRadarAngle((prev) => (prev + 3) % 360);
    }, 30);
    return () => clearInterval(interval);
  }, []);

  // Compute scale based on storm radius (relative percentage)
  const safeCircleScale = Math.max(25, Math.min(95, (currentRadius / 500) * 85));

  return (
    <div className="relative w-full h-80 md:h-96 bg-slate-950 rounded-3xl border border-slate-800 overflow-hidden flex items-center justify-center shadow-inner">
      
      {/* Background Tactical Grid */}
      <div className="absolute inset-0 tactical-grid opacity-30 pointer-events-none" />

      {/* Outer arena ring */}
      <div className="absolute w-72 h-72 md:w-88 md:h-88 rounded-full border border-slate-800/80 pointer-events-none" />
      <div className="absolute w-52 h-52 md:w-64 md:h-64 rounded-full border border-slate-800/50 pointer-events-none" />

      {/* SHRINKING STORM CIRCLE */}
      <div
        className={`absolute rounded-full border-2 transition-all duration-1000 flex items-center justify-center pointer-events-none ${
          inSafeZone
            ? 'border-emerald-500/60 bg-emerald-950/15 shadow-[0_0_40px_rgba(16,185,129,0.1)]'
            : 'border-red-500/80 bg-red-950/20 shadow-[0_0_40px_rgba(239,68,68,0.2)]'
        }`}
        style={{
          width: `${safeCircleScale}%`,
          height: `${safeCircleScale}%`
        }}
      >
        <span className="text-[10px] font-mono text-emerald-400/60 uppercase tracking-widest absolute top-2">
          Phase {stormPhase + 1} Safe Zone ({currentRadius}m)
        </span>
      </div>

      {/* RADAR SWEEP LINE */}
      <div
        className="absolute w-72 h-72 md:w-88 md:h-88 pointer-events-none"
        style={{
          transform: `rotate(${radarAngle}deg)`,
          transformOrigin: 'center center'
        }}
      >
        <div className="w-1/2 h-0.5 bg-gradient-to-r from-transparent to-emerald-400/60 shadow-[0_0_8px_#10b981]" />
      </div>

      {/* CENTER CROSSHAIR */}
      <Crosshair className="w-8 h-8 text-slate-700 pointer-events-none absolute" />

      {/* USER POSITION MARKER */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="relative flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-slate-950"></span>
        </div>
        <span className="text-[10px] font-bold text-white bg-slate-900/90 px-2 py-0.5 rounded-full border border-slate-800 mt-1 font-mono">
          YOU ({userRole})
        </span>
      </div>

      {/* TARGET MARKER (Simulated Quantized Ping for Hunters or Hider HUD) */}
      <div className="absolute top-1/4 right-1/4 flex flex-col items-center pointer-events-none animate-bounce">
        <div className="p-1.5 bg-emerald-500 text-slate-950 rounded-full shadow-lg shadow-emerald-500/50">
          <MapPin className="w-3.5 h-3.5" />
        </div>
        <span className="text-[9px] font-bold text-emerald-400 bg-slate-950/90 px-1.5 py-0.5 rounded border border-emerald-500/30 mt-0.5 font-mono">
          {userRole === 'HUNTER' ? 'Frozen Ping (±40m)' : 'Your Zone'}
        </span>
      </div>

      {/* MAP STATUS BADGE OVERLAYS */}
      <div className="absolute top-3 left-3 flex flex-col space-y-1">
        <span className={`text-[10px] font-mono px-2.5 py-1 rounded-full border ${inSafeZone ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/15 text-red-400 border-red-500/30 animate-pulse'}`}>
          {inSafeZone ? '🟢 Safe Inside Zone' : '⚠️ Storm Damage Imminent'}
        </span>
      </div>

      {distanceToTarget !== undefined && distanceToTarget !== null && (
        <div className="absolute bottom-3 left-3 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-mono">
          <span className="text-slate-400">Target Range: </span>
          <span className="text-emerald-400 font-bold">{Math.round(distanceToTarget)}m</span>
        </div>
      )}

      <div className="absolute bottom-3 right-3 text-[10px] font-mono text-slate-500">
        GPS: 40m Quantized Snap
      </div>

    </div>
  );
}
