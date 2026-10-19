import React, { useState, useEffect } from 'react';
import { Shield, Wallet, Users, Crosshair, Award, LogIn, LogOut, Radio, Activity, Menu, X } from 'lucide-react';
import WelcomeCystem from './components/WelcomeCystem';
import GameLobby from './components/GameLobby';
import ActiveGameHUD from './components/ActiveGameHUD';
import CameraCapture from './components/CameraCapture';
import WalletDeposit from './components/WalletDeposit';
import WinnerModal from './components/WinnerModal';
import AdminDisputePanel from './components/AdminDisputePanel';
import AuthModal from './components/AuthModal';

import { User, MatchDetails } from './types';
import { api, getAuthToken, clearAuthToken } from './lib/api';

export default function App() {
  const [currentView, setCurrentView] = useState<'welcome' | 'lobby' | 'hud' | 'wallet' | 'admin'>('welcome');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [activeMatch, setActiveMatch] = useState<MatchDetails | null>(null);
  const [userRole, setUserRole] = useState<'HUNTER' | 'RUNNER'>('HUNTER');
  
  // Camera Modal
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState<'HINT' | 'SCAN_CLAIM'>('HINT');

  // Winner Celebration Modal
  const [winnerData, setWinnerData] = useState<{
    username: string;
    totalPoolKsh: number;
    winReason?: string;
  } | null>(null);

  // Toast
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    if (getAuthToken()) {
      try {
        const u = await api.getMe();
        setCurrentUser(u);
      } catch {
        clearAuthToken();
      }
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handleStartMatch = (matchData: any) => {
    setActiveMatch(matchData);
    setUserRole(matchData.userRole || 'HUNTER');
    setCurrentView('hud');
    showToast(`Entered Tactical Arena #${matchData.code}`);
  };

  const handleOpenLiveCamera = (mode: 'HINT' | 'SCAN_CLAIM') => {
    setCameraMode(mode);
    setIsCameraOpen(true);
  };

  const handleCameraCaptured = async ({ media, text }: { media: string; text?: string }) => {
    setIsCameraOpen(false);
    if (!activeMatch) return;

    if (cameraMode === 'HINT') {
      try {
        // Get coordinates
        let lat = undefined;
        let lon = undefined;
        if (navigator.geolocation) {
          await new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (p) => {
                lat = p.coords.latitude;
                lon = p.coords.longitude;
                resolve(true);
              },
              () => resolve(false),
              { timeout: 3000 }
            );
          });
        }

        const res = await api.postHint({
          match_code: activeMatch.code,
          media_data: media,
          hint_text: text || 'Live location hint dropped!',
          lat,
          lon
        });
        showToast(res.message);
      } catch (err: any) {
        showToast(err.message || 'Failed to post hint.');
      }
    } else {
      // SCAN_CLAIM
      try {
        let seeker_lat = -1.2921;
        let seeker_lon = 36.8219;
        if (navigator.geolocation) {
          await new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (p) => {
                seeker_lat = p.coords.latitude;
                seeker_lon = p.coords.longitude;
                resolve(true);
              },
              () => resolve(false),
              { timeout: 3000 }
            );
          });
        }

        const res = await api.claimWin({
          match_code: activeMatch.code,
          seeker_lat,
          seeker_lon,
          scan_code: 'OPTICAL_TARGET_VERIFIED'
        });

        // Trigger winner celebration modal
        setWinnerData({
          username: res.winner_username,
          totalPoolKsh: res.total_pool_ksh,
          winReason: res.message
        });
        checkAuth();
      } catch (err: any) {
        showToast(err.message || 'Target claim verification failed.');
      }
    }
  };

  const handleMatchFinished = (result: any) => {
    setWinnerData({
      username: result.winner_username || 'Operative',
      totalPoolKsh: result.net_payout_ksh + (result.admin_fee_ksh || 3),
      winReason: result.message
    });
    checkAuth();
  };

  const handleLogout = () => {
    clearAuthToken();
    setCurrentUser(null);
    setCurrentView('welcome');
    showToast('Signed out of tactical terminal.');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-slate-950 font-bold px-4 py-2.5 rounded-2xl shadow-xl flex items-center space-x-2 text-xs font-tactical animate-bounce">
          <span>⚡</span>
          <span>{toast}</span>
        </div>
      )}

      {/* TOP NAVIGATION BAR */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 px-4 py-3 flex justify-between items-center">
        
        {/* Brand */}
        <div
          onClick={() => setCurrentView('welcome')}
          className="flex items-center space-x-2.5 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Crosshair className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-base tracking-wider text-white font-tactical">
              CYSTEM<span className="text-emerald-400">.OPS</span>
            </span>
          </div>
        </div>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center space-x-1 bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setCurrentView('lobby')}
            className={`px-3.5 py-1.5 rounded-xl transition-all ${currentView === 'lobby' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
          >
            Arena Lobby
          </button>
          {activeMatch && (
            <button
              onClick={() => setCurrentView('hud')}
              className={`px-3.5 py-1.5 rounded-xl transition-all ${currentView === 'hud' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              Active HUD
            </button>
          )}
          <button
            onClick={() => setCurrentView('wallet')}
            className={`px-3.5 py-1.5 rounded-xl transition-all ${currentView === 'wallet' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
          >
            Vault & M-Pesa
          </button>
          <button
            onClick={() => setCurrentView('admin')}
            className={`px-3.5 py-1.5 rounded-xl transition-all ${currentView === 'admin' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
          >
            Admin Ops
          </button>
        </nav>

        {/* Right User Status */}
        <div className="flex items-center space-x-3">
          {currentUser ? (
            <div className="flex items-center space-x-2.5">
              
              {/* Wallet quick badge */}
              <button
                onClick={() => setCurrentView('wallet')}
                className="bg-slate-950 border border-slate-800 hover:border-emerald-500/40 px-3 py-1.5 rounded-xl text-xs font-mono text-emerald-400 flex items-center space-x-1.5 transition-colors"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>KSH {currentUser.balance_ksh.toLocaleString()}</span>
              </button>

              {/* Agent Profile info */}
              <div className="hidden lg:block text-right">
                <span className="text-xs font-bold text-white block">@{currentUser.username}</span>
                <span className="text-[10px] text-emerald-400 font-mono">{currentUser.agent_tier}</span>
              </div>

              <button
                onClick={handleLogout}
                title="Log Out"
                className="p-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 hover:text-red-400 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthOpen(true)}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs font-tactical flex items-center space-x-1.5 shadow-md shadow-emerald-500/20 transition-all"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Agent Sign In</span>
            </button>
          )}
        </div>

      </header>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-4 py-2 flex justify-around items-center text-[10px] font-semibold text-slate-400">
        <button
          onClick={() => setCurrentView('lobby')}
          className={`flex flex-col items-center py-1 ${currentView === 'lobby' ? 'text-emerald-400' : ''}`}
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span>Lobby</span>
        </button>

        {activeMatch && (
          <button
            onClick={() => setCurrentView('hud')}
            className={`flex flex-col items-center py-1 ${currentView === 'hud' ? 'text-emerald-400' : ''}`}
          >
            <Radio className="w-5 h-5 mb-0.5" />
            <span>HUD</span>
          </button>
        )}

        <button
          onClick={() => setCurrentView('wallet')}
          className={`flex flex-col items-center py-1 ${currentView === 'wallet' ? 'text-emerald-400' : ''}`}
        >
          <Wallet className="w-5 h-5 mb-0.5" />
          <span>Vault</span>
        </button>

        <button
          onClick={() => setCurrentView('admin')}
          className={`flex flex-col items-center py-1 ${currentView === 'admin' ? 'text-emerald-400' : ''}`}
        >
          <Activity className="w-5 h-5 mb-0.5" />
          <span>Admin</span>
        </button>
      </div>

      {/* MAIN VIEWPORT SWITCHER */}
      <main className="flex-1 pb-16 md:pb-0">
        {currentView === 'welcome' && (
          <WelcomeCystem
            onGetStarted={() => {
              if (currentUser) {
                setCurrentView('lobby');
              } else {
                setIsAuthOpen(true);
              }
            }}
          />
        )}

        {currentView === 'lobby' && (
          <GameLobby
            onStartMatch={handleStartMatch}
            userBalanceKsh={currentUser?.balance_ksh || 0}
            onOpenWallet={() => setCurrentView('wallet')}
          />
        )}

        {currentView === 'hud' && activeMatch && (
          <ActiveGameHUD
            match={activeMatch}
            userRole={userRole}
            currentUserId={currentUser?.id || 1}
            onOpenLiveCamera={handleOpenLiveCamera}
            onMatchFinished={handleMatchFinished}
          />
        )}

        {currentView === 'wallet' && (
          <WalletDeposit
            userPhone={currentUser?.phone_number || '2547'}
            balanceKsh={currentUser?.balance_ksh || 0}
            points={currentUser?.points || 0}
            onBalanceUpdated={checkAuth}
          />
        )}

        {currentView === 'admin' && <AdminDisputePanel />}
      </main>

      {/* AUTH MODAL */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={(u) => {
          setCurrentUser(u);
          showToast(`Welcome Operative @${u.username}`);
          setCurrentView('lobby');
        }}
      />

      {/* LIVE CAMERA CAPTURE VIEWPORT */}
      {isCameraOpen && (
        <CameraCapture
          mode={cameraMode}
          onCaptured={handleCameraCaptured}
          onClose={() => setIsCameraOpen(false)}
        />
      )}

      {/* WINNER CELEBRATION MODAL */}
      {winnerData && (
        <WinnerModal
          winnerUsername={winnerData.username}
          totalPoolKsh={winnerData.totalPoolKsh}
          winReason={winnerData.winReason}
          onClaimOrWithdraw={() => {
            setWinnerData(null);
            setCurrentView('wallet');
          }}
          onClose={() => setWinnerData(null)}
        />
      )}

    </div>
  );
}
