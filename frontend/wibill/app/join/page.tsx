"use client";
import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function JoinForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get('token');

  const [ispName, setIspName] = useState('');
  const [ispSlug, setIspSlug] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing invite link. Please request a new invite.');
      const timer = setTimeout(() => router.push('/login'), 3000);
      return () => clearTimeout(timer);
    }
  }, [token, router]);

  const handleSignup = async (e: any) => {
    e.preventDefault();
    if (!ispName.trim() || !email.trim() || !password.trim()) {
      setError('All fields are required');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (!email.includes('@')) {
      setError('Invalid email address');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API}/api/auth/register-isp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isp_name: ispName.trim(),
          isp_slug: ispName.trim().toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'),
          admin_email: email.trim(),
          admin_password: password,
          invite_token: token,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        const message = typeof data.detail === 'string'
          ? data.detail
          : Array.isArray(data.detail) && data.detail[0]?.msg
          ? data.detail[0].msg
          : 'Signup failed. Please try again.';
        setError(message);
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push('/join/pending-approval'), 2000);
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <div className="bg-slate-800 rounded-lg shadow-2xl p-8 max-w-md w-full border border-slate-700 text-center">
          <div className="text-6xl mb-6">❌</div>
          <h2 className="text-2xl font-bold text-white mb-4">Invalid Invite</h2>
          <p className="text-slate-400">This invite link is invalid or has expired. Redirecting to login...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <div className="bg-slate-800 rounded-lg shadow-2xl p-8 max-w-md w-full border border-slate-700 text-center">
          <div className="text-6xl mb-6">✅</div>
          <h2 className="text-2xl font-bold text-white mb-4">Account Created!</h2>
          <p className="text-slate-400">Your ISP account is pending approval. You will be notified once approved.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="bg-slate-800 rounded-lg shadow-2xl p-8 max-w-md w-full border border-slate-700">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">WiBill</h1>
          <p className="text-slate-400 mt-2">Create your ISP account</p>
        </div>
        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSignup} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">ISP / Business Name</label>
            <input
              type="text"
              value={ispName}
              onChange={e => setIspName(e.target.value)}
              placeholder="e.g. Nairobi FastNet"
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@yourisp.co.ke"
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min 8 characters"
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
          >
            {loading ? 'Creating Account...' : 'Create ISP Account'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-white text-xl">Loading...</div>
      </div>
    }>
      <JoinForm />
    </Suspense>
  );
}

