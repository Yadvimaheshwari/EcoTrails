'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export function Navigation() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user || pathname === '/login') {
    return null;
  }

  const navItems = [
    { href: '/explore', label: 'Explore' },
    { href: '/community', label: 'Community' },
    { href: '/journal', label: 'Journal' },
    { href: '/settings', label: 'Settings' },
  ];

  return (
    <nav className="border-b border-border bg-surface">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link href="/explore" className="text-2xl font-bold text-primary">
            EcoTrails
          </Link>
          <div className="flex items-center gap-8">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-base font-medium transition-colors ${
                  pathname === item.href
                    ? 'text-primary'
                    : 'text-textSecondary hover:text-text'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
