'use client';

/**
 * app/onboard/page.tsx
 * =============================================================
 * Username Onboarding — shown after first OTP sign-in
 * =============================================================
 * When a new user signs in via magic-link, Auth.js creates them
 * with only an email. This page lets them pick a username +
 * display name before they can post.
 * =============================================================
 */

import { useState, FormEvent } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AudioWaveform, User, CheckCircle, Loader2, AlertCircle } from 'lucide-react';

type PageState = 'idle' | 'loading' | 'done' | 'error';

export default function OnboardPage() {
  const { data: session, update: updateSession } = useSession();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [pageState, setPageState] = useState<PageState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPageState('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), display_name: displayName.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Something went wrong.');
        setPageState('error');
        return;
      }

      // Refresh the session so Navbar picks up the new username
      await updateSession();
      setPageState('done');
      setTimeout(() => router.push('/forum'), 1000);
    } catch {
      setErrorMsg('Network error. Please try again.');
      setPageState('error');
    }
  };

  const usernameValid = /^[a-zA-Z0-9_]{3,30}$/.test(username.trim());

  return (
    <main className="min-h-[80vh] flex items-center justify-center px-4 py-12">

      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#10b981]/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-72 h-72 bg-emerald-400/6 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md space-y-6">

        {/* Brand */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#10b981] shadow-lg shadow-[#10b981]/30 mx-auto">
            <AudioWaveform className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-[#111827] tracking-tight font-sans">
              Set up your profile
            </h1>
            <p className="text-sm text-gray-500 mt-1.5 font-sans">
              Welcome{session?.user?.email ? `, ${session.user.email}` : ''}! Choose a username to get started.
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white border border-[#eaefec] rounded-2xl shadow-sm overflow-hidden">

          {pageState === 'done' ? (
            <div className="p-8 text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#e6f7f0] mx-auto">
                <CheckCircle className="w-8 h-8 text-[#10b981]" />
              </div>
              <div>
                <p className="text-lg font-bold text-[#111827] font-sans">You&apos;re all set!</p>
                <p className="text-sm text-gray-500 mt-1 font-sans">Redirecting to the forum…</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">

              {/* Username */}
              <div className="space-y-1.5">
                <label htmlFor="onboard-username" className="block text-xs font-bold text-[#374151] uppercase tracking-wide font-sans">
                  Username <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <span className="text-gray-400 font-bold text-sm">u/</span>
                  </div>
                  <input
                    id="onboard-username"
                    type="text"
                    required
                    autoFocus
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (pageState === 'error') setPageState('idle');
                    }}
                    placeholder="your_username"
                    maxLength={30}
                    className="w-full bg-[#f8faf9] border border-[#eaefec] rounded-xl pl-10 pr-4 py-3 text-sm text-[#111827] placeholder-gray-400 font-sans focus:outline-none focus:border-[#10b981] focus:ring-2 focus:ring-[#10b981]/20 transition-all duration-200"
                  />
                  {username.length > 0 && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      {usernameValid
                        ? <CheckCircle className="w-4 h-4 text-[#10b981]" />
                        : <AlertCircle className="w-4 h-4 text-red-400" />
                      }
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 font-sans">
                  3–30 characters. Letters, numbers, and underscores only.
                </p>
              </div>

              {/* Display Name */}
              <div className="space-y-1.5">
                <label htmlFor="onboard-display-name" className="block text-xs font-bold text-[#374151] uppercase tracking-wide font-sans">
                  Display Name <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <User className="w-4 h-4 text-gray-400" />
                  </div>
                  <input
                    id="onboard-display-name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your full name or nickname"
                    maxLength={60}
                    className="w-full bg-[#f8faf9] border border-[#eaefec] rounded-xl pl-10 pr-4 py-3 text-sm text-[#111827] placeholder-gray-400 font-sans focus:outline-none focus:border-[#10b981] focus:ring-2 focus:ring-[#10b981]/20 transition-all duration-200"
                  />
                </div>
              </div>

              {/* Error */}
              {pageState === 'error' && errorMsg && (
                <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-xl p-3.5 text-sm text-red-600 font-sans">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                id="onboard-submit-btn"
                type="submit"
                disabled={!usernameValid || pageState === 'loading'}
                className="w-full flex items-center justify-center gap-2.5 bg-[#10b981] hover:bg-[#059669] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm py-3.5 rounded-xl shadow-sm shadow-[#10b981]/20 transition-all duration-200 cursor-pointer active:scale-[0.98] font-sans"
              >
                {pageState === 'loading' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving…</span>
                  </>
                ) : (
                  <span>Complete Profile →</span>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
