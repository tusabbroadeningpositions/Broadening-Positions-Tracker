import React, { useState } from "react";
import { Lock, Key, ShieldCheck, Eye, EyeOff, AlertCircle, Sparkles } from "lucide-react";

interface PasswordGateProps {
  onUnlock: (enteredPassword: string) => boolean;
  masterPasswordHint?: string;
}

export default function PasswordGate({ onUnlock, masterPasswordHint }: PasswordGateProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password.trim()) {
      setError("Please enter the site access code.");
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      const success = onUnlock(password.trim());
      setIsSubmitting(false);

      if (!success) {
        setError("Incorrect access code. Access denied.");
      }
    }, 250);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 sm:p-8 relative z-10 backdrop-blur-md">
        {/* Header Icon & Title */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-950 border border-emerald-800/80 rounded-2xl mb-4 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-wide">
            Broadening Positions Tracker
          </h1>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            This portal is password protected. Enter the access code to continue.
          </p>
          <div className="mt-3 p-2.5 bg-slate-950/90 border border-slate-800/90 rounded-lg text-[11px] text-emerald-400/90 flex items-center justify-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>The access code can be found on the <strong>Broadening Positions Teams channel</strong> in <strong>"Shared" &gt; "TRACKER PASSCODE"</strong>.</span>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mb-5 p-3 bg-rose-950/80 border border-rose-800/80 rounded-lg flex items-center gap-2.5 text-xs text-rose-200 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="master-password-input" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Access Code
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Key className="w-4 h-4" />
              </div>
              <input
                id="master-password-input"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Enter password..."
                className="block w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-600 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all font-mono"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] disabled:opacity-50 text-white font-bold text-sm rounded-lg shadow-lg shadow-emerald-950/50 transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Verifying Access...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Unlock Application</span>
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
          <p className="text-[11px] text-slate-500">
            Protected System • Authorized Personnel Only
          </p>
        </div>
      </div>
    </div>
  );
}
