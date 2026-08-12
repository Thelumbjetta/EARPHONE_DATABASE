'use client';

import { useState, FormEvent, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AudioWaveform, Mail, ArrowRight, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

type PageState = 'idle' | 'loading' | 'sent' | 'error';

export default function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [pageState, setPageState] = useState<PageState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // Auth.js redirects to /login?verify=1 after sending the email
  useEffect(() => {
    if (searchParams.get('verify') === '1') {
      setPageState('sent');
    }
    if (searchParams.get('error') === '1') {
      setPageState('error');
      setErrorMsg('Something went wrong. Please try again.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      setPageState('error');
      return;
    }

    setPageState('loading');
    setErrorMsg('');

    try {
      // signIn with redirect: true — Auth.js will redirect to /login?verify=1
      // once the email has been dispatched.
      await signIn('email', {
        email: trimmedEmail,
        callbackUrl: '/forum',
        redirect: true,
      });
    } catch {
      setErrorMsg('Failed to send the login email. Please try again.');
      setPageState('error');
    }
  };

  return (
    <main className="min-h-[80vh] flex items-center justify-center px-4 py-12">

      {/* ── Decorative background blobs ──────────────────────────── */}
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
              Sign in to <span className="text-[#10b981]">audiothread</span>
            </h1>
            <p className="text-sm text-gray-500 mt-1.5 font-sans">
              No password needed — we&apos;ll email you a sign-in link.
            </p>
          </div>
        </div>

        {/* ── Main Card ─────────────────────────────────────────────── */}
        <div className="bg-white border border-[#eaefec] rounded-2xl shadow-sm overflow-hidden">

          {/* ── State: Email Sent ─────────────────────────────────── */}
          {pageState === 'sent' ? (
            <div className="p-8 text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#e6f7f0] mx-auto">
                <CheckCircle className="w-8 h-8 text-[#10b981]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#111827] font-sans">Check your inbox</h2>
                <p className="text-sm text-gray-500 mt-1.5 font-sans leading-relaxed">
                  We&apos;ve sent a sign-in link to{' '}
                  <strong className="text-[#111827]">{email || 'your email'}</strong>.
                  <br />Click it to complete sign-in. It expires in 24 hours.
                </p>
              </div>
              <button
                onClick={() => {
                  setPageState('idle');
                  setEmail('');
                }}
                className="text-sm text-[#10b981] font-semibold hover:underline transition-all cursor-pointer"
              >
                Use a different email
              </button>
            </div>
          ) : (
            /* ── State: Form (idle / loading / error) ──────────────── */
            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">

              {/* Email Input */}
              <div className="space-y-1.5">
                <label
                  htmlFor="otp-email"
                  className="block text-xs font-bold text-[#374151] uppercase tracking-wide font-sans"
                >
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="w-4 h-4 text-gray-400" />
                  </div>
                  <input
                    id="otp-email"
                    type="email"
                    required
                    autoFocus
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (pageState === 'error') setPageState('idle');
                    }}
                    placeholder="you@example.com"
                    disabled={pageState === 'loading'}
                    className="w-full bg-[#f8faf9] border border-[#eaefec] rounded-xl pl-10 pr-4 py-3 text-sm text-[#111827] placeholder-gray-400 font-sans focus:outline-none focus:border-[#10b981] focus:ring-2 focus:ring-[#10b981]/20 transition-all duration-200 disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Error message */}
              {pageState === 'error' && errorMsg && (
                <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-xl p-3.5 text-sm text-red-600 font-sans">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                id="send-login-code-btn"
                type="submit"
                disabled={pageState === 'loading' || !email.trim()}
                className="w-full flex items-center justify-center gap-2.5 bg-[#10b981] hover:bg-[#059669] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm py-3.5 rounded-xl shadow-sm shadow-[#10b981]/20 transition-all duration-200 cursor-pointer active:scale-[0.98] font-sans"
              >
                {pageState === 'loading' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending link...</span>
                  </>
                ) : (
                  <>
                    <span>Send Login Link</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Info text */}
              <p className="text-center text-xs text-gray-400 font-sans leading-relaxed">
                We&apos;ll send a magic link to your email. No password required.
                <br />New to audiothread? An account is created automatically.
              </p>
            </form>
          )}
        </div>

        {/* Back link */}
        <div className="text-center">
          <Link
            href="/forum"
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors font-sans"
          >
            ← Return to Forum
          </Link>
        </div>

      </div>
    </main>
  );
}
