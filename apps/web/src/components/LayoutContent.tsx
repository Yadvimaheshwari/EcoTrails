/**
 * LayoutContent Component
 * Handles onboarding gate, conditional navigation display, and integration prompt
 */

'use client';

import { usePathname } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { OnboardingGate } from '@/components/OnboardingGate';
import { ConnectGearModal } from '@/components/integrations/ConnectGearModal';
import { useIntegrationPrompt } from '@/hooks/useIntegrationPrompt';
import { IntegrationProvider } from '@/lib/integrations/types';

interface LayoutContentProps {
  children: React.ReactNode;
}

export function LayoutContent({ children }: LayoutContentProps) {
  const pathname = usePathname();
  const { shouldShow, dismiss } = useIntegrationPrompt();
  
  // Hide navigation on onboarding pages
  const isOnboardingPage = pathname?.startsWith('/onboarding');

  const handleConnect = async (provider: IntegrationProvider) => {
    try {
      const response = await fetch(`/api/integrations/${provider}/connect`, {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success && data.redirectUrl) {
        // Redirect to OAuth provider
        window.location.href = data.redirectUrl;
      } else {
        console.error('Failed to connect:', data.error);
        // Close modal on error so user can try again from settings
        dismiss();
      }
    } catch (error) {
      console.error('Connection error:', error);
      dismiss();
    }
  };
  
  return (
    <OnboardingGate>
      {!isOnboardingPage && <Navigation />}
      <main className="min-h-screen">{children}</main>
      {shouldShow && <ConnectGearModal onClose={dismiss} onConnect={handleConnect} />}
    </OnboardingGate>
  );
}
