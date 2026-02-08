/**
 * Magic Link Verification Page
 * Automatically verifies token from email and logs in user
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { verifyMagicLink } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('Verifying your magic link...');

  useEffect(() => {
    const token = searchParams?.get('token');

    if (!token) {
      setStatus('error');
      setMessage('No token provided. Please use the link from your email.');
      return;
    }

    const verify = async () => {
      try {
        const response = await verifyMagicLink(token);
        
        // Log in the user
        login(response.data.token, response.data.user);
        
        setStatus('success');
        setMessage('Successfully logged in! Redirecting...');
        
        // Redirect to explore page after a brief delay
        setTimeout(() => {
          router.push('/explore');
        }, 1500);
      } catch (error: any) {
        console.error('Verification error:', error);
        setStatus('error');
        setMessage(
          error.response?.data?.error || 
          error.message || 
          'Failed to verify magic link. The link may have expired.'
        );
      }
    };

    verify();
  }, [searchParams, login, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="card max-w-md w-full text-center">
        {/* Icon */}
        <div className="mb-6">
          {status === 'verifying' && (
            <div className="inline-block">
              <div
                className="animate-spin rounded-full h-16 w-16 border-b-2 mx-auto"
                style={{ borderColor: '#4F8A6B' }}
              />
            </div>
          )}
          {status === 'success' && (
            <div
              className="inline-flex items-center justify-center w-16 h-16 rounded-full mx-auto"
              style={{ backgroundColor: '#4F8A6B20' }}
            >
              <svg
                className="w-8 h-8"
                style={{ color: '#4F8A6B' }}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          )}
          {status === 'error' && (
            <div
              className="inline-flex items-center justify-center w-16 h-16 rounded-full mx-auto"
              style={{ backgroundColor: '#EF444420' }}
            >
              <svg
                className="w-8 h-8"
                style={{ color: '#EF4444' }}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold mb-2" style={{ color: '#1B1F1E' }}>
          {status === 'verifying' && 'Verifying...'}
          {status === 'success' && 'Welcome to EcoTrails!'}
          {status === 'error' && 'Verification Failed'}
        </h1>

        {/* Message */}
        <p className="text-gray-600 mb-6">{message}</p>

        {/* Actions */}
        {status === 'error' && (
          <div className="space-y-3">
            <button
              onClick={() => router.push('/login')}
              className="w-full py-3 px-6 rounded-full font-medium text-white transition-all"
              style={{ backgroundColor: '#4F8A6B' }}
            >
              Try logging in again
            </button>
            <button
              onClick={() => router.push('/explore')}
              className="w-full py-3 px-6 rounded-full font-medium transition-all"
              style={{ 
                backgroundColor: 'transparent',
                border: '1px solid #E8E8E3',
                color: '#1B1F1E'
              }}
            >
              Continue without logging in
            </button>
          </div>
        )}

        {status === 'success' && (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <div className="animate-pulse">Redirecting to explore...</div>
          </div>
        )}
      </div>
    </div>
  );
}
