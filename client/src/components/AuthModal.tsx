import React, { useState } from 'react';
import { Shield, Lock, User as UserIcon, Smartphone, Mail, AlertCircle, CheckCircle, X, Loader2 } from 'lucide-react';
import { api, setAuthToken } from '../lib/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any) => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('2547');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  // Real-time password validation indicators
  const hasMinLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasSpecial = /[@$!%*?&_\-#^]/.test(password);
  const isPasswordStrong = hasMinLength && hasNumber && hasUppercase && hasSpecial;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        if (!isPasswordStrong) {
          throw new Error('Please ensure your password meets all strength criteria.');
        }
        const res = await api.register({
          username,
          email,
          phone_number: phone,
          password
        });
        setAuthToken(res.access_token);
        onSuccess(res.user);
      } else {
        const res = await api.login({
          username,
          password
        });
        setAuthToken(res.access_token);
        onSuccess(res.user);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
        
        {/* Glow */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-500 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white font-tactical">
              {isRegister ? 'Agent Registration' : 'Agent Access Terminal'}
            </h2>
            <p className="text-xs text-slate-400">
              {isRegister ? 'Create your operative profile & escrow wallet' : 'Log in to sync your stakes and tactical rank'}
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3.5 rounded-xl mb-4 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Callsign / Username
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ex: GhostRunner"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 pl-10 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          {isRegister && (
            <>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="agent@cystem.global"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 pl-10 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 pl-10 text-sm text-white font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Secure Passphrase
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 pl-10 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          {/* Password Strength Checklist (Registration) */}
          {isRegister && password.length > 0 && (
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-1.5 text-[11px]">
              <div className="flex items-center space-x-1.5">
                {hasMinLength ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-600" />}
                <span className={hasMinLength ? 'text-emerald-400' : 'text-slate-500'}>8+ Characters</span>
              </div>
              <div className="flex items-center space-x-1.5">
                {hasUppercase ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-600" />}
                <span className={hasUppercase ? 'text-emerald-400' : 'text-slate-500'}>At least 1 Uppercase Letter</span>
              </div>
              <div className="flex items-center space-x-1.5">
                {hasNumber ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-600" />}
                <span className={hasNumber ? 'text-emerald-400' : 'text-slate-500'}>At least 1 Number</span>
              </div>
              <div className="flex items-center space-x-1.5">
                {hasSpecial ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-600" />}
                <span className={hasSpecial ? 'text-emerald-400' : 'text-slate-500'}>Special symbol (@$!%*?&_-#^)</span>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3.5 rounded-xl transition-all flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50 mt-2 font-tactical"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authorizing Security...</span>
              </>
            ) : (
              <span>{isRegister ? 'Create Operative Profile' : 'Access Tactical Terminal'}</span>
            )}
          </button>
        </form>

        {/* Toggle between Login and Register */}
        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
            }}
            className="text-xs text-slate-400 hover:text-emerald-400 transition-colors"
          >
            {isRegister ? 'Already have an agent account? Log in' : "Don't have an agent account? Register here"}
          </button>
        </div>

      </div>
    </div>
  );
}
