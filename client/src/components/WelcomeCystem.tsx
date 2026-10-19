import React from 'react';
import { ShieldCheck, MapPin, Camera, Wallet, ArrowRight, Crosshair, Award } from 'lucide-react';

interface WelcomeCystemProps {
  onGetStarted: () => void;
  onOpenRules?: () => void;
}

export default function WelcomeCystem({ onGetStarted, onOpenRules }: WelcomeCystemProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 md:p-6 tactical-grid relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-2xl w-full bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl relative z-10">
        
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2 bg-emerald-500/10 text-emerald-400 text-xs font-semibold px-3.5 py-1.5 rounded-full uppercase tracking-widest border border-emerald-500/20 mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>Real-World Pursuit & Wagering</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white font-tactical">
            Welcome to <span className="text-emerald-400">CYSTEM</span>
          </h1>
          <p className="text-slate-400 mt-2 text-sm md:text-base max-w-lg mx-auto">
            The high-stakes outdoor tactical battle royale. Hide smart, stream live photo hints, outwit seekers in shrinking storm zones, and cash out.
          </p>
        </div>

        {/* Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 flex items-start space-x-3.5 hover:border-emerald-500/30 transition-colors">
            <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400 shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Live Snap Hints Only</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Photos and video clues must be captured live from the app camera. Phone gallery uploads are strictly blocked.
              </p>
            </div>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 flex items-start space-x-3.5 hover:border-emerald-500/30 transition-colors">
            <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400 shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Shrinking Storm Safe Zones</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Stay inside the campus/park boundary. Safe zones shrink every 5 minutes while periodic radar pings reveal snapshots.
              </p>
            </div>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 flex items-start space-x-3.5 hover:border-emerald-500/30 transition-colors">
            <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400 shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">M-Pesa Stakes & Escrow</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                1 Point = 130 KSH. Instant STK push top-up. Flat 3 KSH platform commission per withdrawal/settlement.
              </p>
            </div>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 flex items-start space-x-3.5 hover:border-emerald-500/30 transition-colors">
            <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400 shrink-0">
              <Crosshair className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">First-Come-First-Serve</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                First seeker to spot and verify within 20m wins the pool. If the hider survives the timer, they collect all stakes!
              </p>
            </div>
          </div>

        </div>

        {/* Action Button */}
        <button
          onClick={onGetStarted}
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-4 rounded-2xl transition-all flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 active:scale-[0.99] font-tactical text-base tracking-wide"
        >
          <span>Initialize Agent Terminal & Enter Arena</span>
          <ArrowRight className="w-5 h-5" />
        </button>

        <div className="mt-4 flex items-center justify-center space-x-2 text-[11px] text-slate-500 text-center">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Protected by Haversine Geofencing, EXIF Validation & Daraja Escrow</span>
        </div>

      </div>
    </div>
  );
}
