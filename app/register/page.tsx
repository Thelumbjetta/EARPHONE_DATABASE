/**
 * app/register/page.tsx
 * =============================================================
 * Page: /register  —  User Registration Page
 * =============================================================
 * Sleek, dark-mode registration form styled with Tailwind CSS.
 * Calls /api/auth/register, then auto-signs in with NextAuth.
 * =============================================================
 */

'use client';

import { useState, FormEvent } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!username.trim() || !email.trim() || !password.trim()) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim().toLowerCase(),
          password: password.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage('Account created! Signing you in...');

        // Auto sign-in
        const res = await signIn('credentials', {
          email: email.trim().toLowerCase(),
          password: password.trim(),
          redirect: false,
        });

        if (res?.ok) {
          router.push('/forum');
          router.refresh();
        } else {
          router.push('/login');
        }
      } else {
        setErrorMessage(data.error || 'Failed to create account.');
        setLoading(false);
      }
    } catch (err) {
      setErrorMessage('Network error during account registration.');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 font-mono text-xs font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded-full uppercase">
            Join HBB Community
          </div>
          <h1 className="text-3xl font-extrabold text-zinc-100 tracking-tight">
            Create Your Account
          </h1>
          <p className="text-xs text-zinc-400 font-mono">
            Register to join gear discussions, submit measurements, and share tier lists.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-900/90 via-zinc-900/70 to-zinc-950 p-6 sm:p-8 shadow-2xl shadow-black/80 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Username Field */}
            <div>
              <label htmlFor="reg-username" className="block text-xs font-mono font-medium text-zinc-300 mb-1.5">
                Username:
              </label>
              <input
                id="reg-username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g., basshead99"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 transition-all font-mono"
              />
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="reg-email" className="block text-xs font-mono font-medium text-zinc-300 mb-1.5">
                Email Address:
              </label>
              <input
                id="reg-email"
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
              <label htmlFor="reg-password" className="block text-xs font-mono font-medium text-zinc-300 mb-1.5">
                Password <span className="text-zinc-500">(Min 8 chars)</span>:
              </label>
              <input
                id="reg-password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 transition-all font-mono"
              />
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="reg-confirm" className="block text-xs font-mono font-medium text-zinc-300 mb-1.5">
                Confirm Password:
              </label>
              <input
                id="reg-confirm"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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

            {/* Success Feedback */}
            {successMessage && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-mono text-emerald-300">
                ✅ {successMessage}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-zinc-950 font-bold text-sm py-3.5 rounded-xl shadow-lg shadow-amber-400/10 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? 'Registering Account...' : 'Register Account'}
            </button>

          </form>

          {/* Footer Login Link */}
          <div className="pt-4 border-t border-zinc-800/80 text-center text-xs text-zinc-400 font-mono">
            Already have an account?{' '}
            <Link href="/login" className="text-amber-400 hover:underline font-semibold">
              Sign In Here
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
