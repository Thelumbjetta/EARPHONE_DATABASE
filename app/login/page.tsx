/**
 * app/login/page.tsx
 * =============================================================
 * Passwordless Email OTP / Magic-Link Login Page
 * =============================================================
 * Split into a thin server-component page wrapper (default export)
 * and a 'use client' inner component — required because
 * useSearchParams() must be inside a <Suspense> boundary in Next.js.
 * =============================================================
 */

import { Suspense } from 'react';
import LoginForm from './LoginForm';

// The page itself is a Server Component — clean, no client code.
// LoginForm is the Client Component that uses useSearchParams.
export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-6 animate-pulse">
          <div className="text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-[#e6f7f0] mx-auto" />
            <div className="h-7 bg-gray-100 rounded-xl max-w-[220px] mx-auto" />
            <div className="h-4 bg-gray-100 rounded-xl max-w-[280px] mx-auto" />
          </div>
          <div className="bg-white border border-[#eaefec] rounded-2xl p-8 space-y-5">
            <div className="h-4 bg-gray-100 rounded-lg w-24" />
            <div className="h-12 bg-gray-100 rounded-xl" />
            <div className="h-12 bg-[#e6f7f0] rounded-xl" />
          </div>
        </div>
      </main>
    }>
      <LoginForm />
    </Suspense>
  );
}
