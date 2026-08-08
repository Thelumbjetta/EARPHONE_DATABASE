/**
 * app/login/page.tsx
 * =============================================================
 * Page: /login  —  Sign In Page
 * =============================================================
 * Sleek, dark-mode technical login interface styled with Tailwind CSS.
 * Connects to NextAuth credentials authentication.
 * =============================================================
 */

'use client';

import { useState, FormEvent } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both your email and password.');
      return;
    }

    setLoading(true);

    try {
      const res = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password: password.trim(),
        redirect: false,
      });

      if (res?.error) {
        setErrorMessage('Invalid email or password. Please check your credentials.');
        setLoading(false);
      } else {
        router.push('/forum');
        router.refresh();
      }
    } catch (err) {
      setErrorMessage('An unexpected authentication error occurred.');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 font-mono text-xs font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded-full uppercase">
            HBB Community Access
          </div>
          <h1 className="text-3xl font-extrabold text-zinc-100 tracking-tight">
            Sign In to Your Account
          </h1>
          <p className="text-xs text-zinc-400 font-mono">
            Enter your credentials to post discussions, vote, and build tier lists.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-900/90 via-zinc-900/70 to-zinc-950 p-6 sm:p-8 shadow-2xl shadow-black/80 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Email Field */}
            <div>
              <label htmlFor="login-email" className="block text-xs font-mono font-medium text-zinc-300 mb-1.5">
                Email Address:
              </label>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 transition-all font-mono"
              />
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="login-password" className="block text-xs font-mono font-medium text-zinc-300 mb-1.5">
                Password:
              </label>
              <input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 transition-all font-mono"
              />
            </div>

            {/* Error Feedback */}
            {errorMessage && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-mono text-red-300">
                ⚠️ {errorMessage}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-zinc-950 font-bold text-sm py-3.5 rounded-xl shadow-lg shadow-amber-400/10 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>

          </form>

          {/* Footer Register Link */}
          <div className="pt-4 border-t border-zinc-800/80 text-center text-xs text-zinc-400 font-mono">
            Don&apos;t have an account yet?{' '}
            <Link href="/register" className="text-amber-400 hover:underline font-semibold">
              Create an Account
            </Link>
          </div>
        </div>

        {/* Back Link */}
        <div className="text-center">
          <Link href="/forum" className="text-xs font-mono text-zinc-500 hover:text-zinc-300 transition-colors">
            &larr; Return to Forum Index
          </Link>
        </div>

      </div>
    </main>
  );
}
