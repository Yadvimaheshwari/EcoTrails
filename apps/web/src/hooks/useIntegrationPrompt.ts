/**
 * Hook to manage the post-onboarding integration prompt
 */

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { hasSeenIntegrationPrompt } from '@/lib/integrations/storage';
import { isOnboardingCompleted } from '@/lib/onboardingStorage';

export function useIntegrationPrompt() {
  const [shouldShow, setShouldShow] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Don't show on specific pages
    const excludedPaths = ['/onboarding', '/login', '/auth/verify', '/settings/integrations'];
    const isExcluded = excludedPaths.some(path => pathname?.startsWith(path));
    
    if (isExcluded) {
      setShouldShow(false);
      return;
    }

    // Show if user has completed onboarding but hasn't seen the integration prompt
    const onboardingComplete = isOnboardingCompleted();
    const promptSeen = hasSeenIntegrationPrompt();

    if (onboardingComplete && !promptSeen) {
      // Small delay to ensure the page has loaded
      const timer = setTimeout(() => {
        setShouldShow(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  const dismiss = () => {
    setShouldShow(false);
  };

  return { shouldShow, dismiss };
}
