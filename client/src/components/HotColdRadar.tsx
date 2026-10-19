import React, { useState, useEffect } from 'react';
import { Compass, Flame, Radio, AlertTriangle } from 'lucide-react';

interface HotColdRadarProps {
  distanceMeters: number | null;
}

export default function HotColdRadar({ distanceMeters }: HotColdRadarProps) {
  const [status, setStatus] = useState('SEARCHING SIGNAL...');
  const [pulseSpeed, setPulseSpeed] = useState('duration-1000');
  const [colorTheme, setColorTheme] = useState('text-blue-400 border-blue-500/30 bg-blue-950/10');

  // Synthesize a tactical radar sonar beep using Web Audio API
  const playSonarChirp = (frequency = 600, duration = 0.08) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // AudioContext unavailable or restricted
    }
  };

  useEffect(() => {
    if (distanceMeters === null || distanceMeters === undefined) {
      setStatus('ACQUIRING TARGET PING...');
      setPulseSpeed('duration-1000');
      setColorTheme('text-slate-400 border-slate-700 bg-slate-900');
      return;
    }

    if (distanceMeters > 100) {
      setStatus('FREEZING (Far Away)');
      setPulseSpeed('duration-[2000ms]');
      setColorTheme('text-blue-400 border-blue-500/40 bg-blue-950/20');
      playSonarChirp(440, 0.05);
    } else if (distanceMeters > 40) {
      setStatus('WARMING UP (In Vicinity)');
      setPulseSpeed('duration-1000');
      setColorTheme('text-amber-400 border-amber-500/50 bg-amber-950/20');
      playSonarChirp(600, 0.07);
      if (navigator.vibrate) navigator.vibrate(50);
    } else if (distanceMeters > 15) {
      setStatus('HOT ZONE! CLOSE RANGE');
      setPulseSpeed('duration-500');
      setColorTheme('text-orange-400 border-orange-500/60 bg-orange-950/30');
      playSonarChirp(880, 0.1);
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    } else {
      setStatus('BOILING - TARGET RIGHT HERE! SCAN NOW!');
      setPulseSpeed('duration-200');
      setColorTheme('text-emerald-400 border-emerald-500/80 bg-emerald-950/40 glow-emerald');
      playSonarChirp(1200, 0.15);
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    }
  }, [distanceMeters]);

  return (
    <div className="flex flex-col items-center justify-center p-5 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl text-center max-w-sm mx-auto w-full">
      
      <div className={`relative w-44 h-44 rounded-full border-2 flex items-center justify-center transition-all ${colorTheme}`}>
        <div className={`absolute inset-0 rounded-full border border-current animate-ping opacity-30 ${pulseSpeed}`} />
        
        <div className="flex flex-col items-center z-10">
          <Compass className="w-8 h-8 text-current mb-1 animate-spin" style={{ animationDuration: '8s' }} />
          <span className="text-3xl font-extrabold font-mono text-white">
            {distanceMeters !== null && distanceMeters !== undefined ? `${Math.round(distanceMeters)}m` : '---'}
          </span>
          <span className="text-[10px] uppercase tracking-widest font-semibold mt-1 opacity-70">
            Target Range
          </span>
        </div>
      </div>

      <div className="mt-4 flex items-center space-x-2">
        <Flame className="w-4 h-4 text-emerald-400 animate-bounce" />
        <span className="text-xs font-bold tracking-wider text-white uppercase font-tactical">
          {status}
        </span>
      </div>

    </div>
  );
}
