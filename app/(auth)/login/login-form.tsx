"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { Mail, ArrowRight, Loader2 } from "lucide-react";

interface Props {
  returnTo?: string;
}

export default function LoginForm({ returnTo }: Props) {
  const [mode, setMode] = useState<"oauth" | "magic">("oauth");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callbackUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback${returnTo ? `?next=${encodeURIComponent(returnTo)}` : ""}`;

  async function handleGoogleLogin() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl },
    });
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callbackUrl },
    });
    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      setMagicSent(true);
    }
  }

  if (magicSent) {
    return (
      <div className="text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-cyan-50 dark:bg-cyan-900/30 border border-cyan-100 dark:border-cyan-800/50 flex items-center justify-center mx-auto">
          <Mail className="w-5 h-5 text-cyan-500" />
        </div>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Check your email</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          We sent a sign-in link to <span className="font-medium text-slate-700 dark:text-slate-200">{email}</span>
        </p>
        <button
          onClick={() => { setMagicSent(false); setEmail(""); }}
          className="text-xs text-cyan-600 hover:text-cyan-700 underline"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mode tabs */}
      <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden text-sm">
        <button
          onClick={() => setMode("oauth")}
          className={`flex-1 py-2 font-medium transition-colors ${mode === "oauth" ? "bg-slate-800 dark:bg-slate-600 text-white" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60"}`}
        >
          Google
        </button>
        <button
          onClick={() => setMode("magic")}
          className={`flex-1 py-2 font-medium transition-colors ${mode === "magic" ? "bg-slate-800 dark:bg-slate-600 text-white" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60"}`}
        >
          Email link
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-lg px-3 py-2 border border-red-100 dark:border-red-800/50">{error}</p>
      )}

      {mode === "oauth" ? (
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white font-medium py-2.5 px-5 rounded-xl flex items-center justify-center gap-3 shadow-md shadow-cyan-500/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden>
              <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" opacity=".9" />
              <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" opacity=".8" />
              <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" opacity=".6" />
              <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" opacity=".7" />
            </svg>
          )}
          {loading ? "Redirecting…" : "Continue with Google"}
        </button>
      ) : (
        <form onSubmit={handleMagicLink} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400"
          />
          <button
            type="submit"
            disabled={loading || !email}
            className="w-full bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white font-medium py-2.5 px-5 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-cyan-500/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            {loading ? "Sending…" : "Send sign-in link"}
          </button>
        </form>
      )}
    </div>
  );
}
