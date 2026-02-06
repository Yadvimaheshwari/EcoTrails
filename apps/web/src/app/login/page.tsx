'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { sendMagicLink, verifyMagicLink } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [step, setStep] = useState<'email' | 'verify'>('email');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();
  const { login } = useAuth();

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      await sendMagicLink(email);
      setMessage('Check your email for the magic link');
      setStep('verify');
    } catch (error: any) {
      setMessage(error.response?.data?.error || 'Failed to send magic link');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await verifyMagicLink(token);
      login(response.data.token, response.data.user);
      router.push('/explore');
    } catch (error: any) {
      setMessage(error.response?.data?.error || 'Invalid token');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="card max-w-md w-full">
        <h1 className="text-4xl font-bold mb-2">Welcome to EcoTrails</h1>
        <p className="text-textSecondary mb-8">Sign in to continue</p>

        {step === 'email' ? (
          <form onSubmit={handleSendMagicLink} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-border bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="your@email.com"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-3 rounded-xl font-medium hover:bg-primaryDark transition-colors disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Magic Link'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-6">
            <div>
              <label htmlFor="token" className="block text-sm font-medium mb-2">
                Enter token from email
              </label>
              <input
                id="token"
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-border bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Paste token here"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-3 rounded-xl font-medium hover:bg-primaryDark transition-colors disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
            <button
              type="button"
              onClick={() => setStep('email')}
              className="w-full text-textSecondary hover:text-text transition-colors"
            >
              Back to email
            </button>
          </form>
        )}

        {message && (
          <p className={`mt-4 text-sm ${message.includes('error') || message.includes('Failed') || message.includes('Invalid') ? 'text-error' : 'text-textSecondary'}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
