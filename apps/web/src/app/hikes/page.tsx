'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Deprecated: Hikes page has been moved to the Journal system.
 * This page now redirects to /journal where users can view:
 * - Active hikes
 * - Hike log (completed hikes)
 * - Discoveries
 * - Achievements
 */
export default function HikesPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/journal');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
        <p className="text-slate-600">Redirecting to Journal...</p>
      </div>
    </div>
  );
}
