/**
 * OnboardingGate Component
 * Redirects to onboarding if not completed
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { isOnboardingCompleted } from '@/lib/onboardingStorage';

interface OnboardingGateProps {
  children: React.ReactNode;
}

export function OnboardingGate({ children }: OnboardingGateProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    // Skip check for onboarding and login pages
    const allowedPaths = ['/onboarding', '/login', '/auth'];
    const isAllowedPath = allowedPaths.some((path) => pathname?.startsWith(path));

    if (isAllowedPath) {
      setShouldRender(true);
      setIsChecking(false);
      return;
    }

    // Check onboarding completion
    const completed = isOnboardingCompleted();

    if (!completed) {
      router.replace('/onboarding');
      return;
    }

    setShouldRender(true);
    setIsChecking(false);
  }, [pathname, router]);

  // Show loading state while checking
  if (isChecking) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#F6F8F7' }}
      >
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
            style={{ borderColor: '#4F8A6B' }}
          />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Render children if onboarding is completed or on allowed paths
  return shouldRender ? <>{children}</> : null;
}
