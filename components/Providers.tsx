/**
 * components/Providers.tsx
 * Client-side provider wrapper: SessionProvider + ToastProvider +
 * onboarding redirect guard.
 *
 * After sign-in via OTP, new users who have no username set are
 * automatically redirected to /onboard to complete their profile.
 */

'use client';

import { SessionProvider, useSession } from 'next-auth/react';
import { ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ToastProvider } from './Toast';

/** Inner component — needs useSession, which requires SessionProvider above it */
function OnboardingGuard({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Only check when session is loaded and user is signed in
    if (status !== 'authenticated') return;

    // Skip if already on onboarding or auth pages
    const exempt = ['/onboard', '/login', '/api'];
    if (exempt.some((p) => pathname.startsWith(p))) return;

    // If the user has no username set, redirect to onboarding
    const hasUsername = !!(session?.user as { username?: string })?.username || !!session?.user?.name;
    if (!hasUsername) {
      router.push('/onboard');
    }
  }, [session, status, pathname, router]);

  return <>{children}</>;
}

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>
        <OnboardingGuard>
          {children}
        </OnboardingGuard>
      </ToastProvider>
    </SessionProvider>
  );
}
