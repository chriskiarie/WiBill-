"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PendingApprovalPage() {
  const router = useRouter();
  const [ispName, setIspName] = useState('');
  const [isApproved, setIsApproved] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);

  useEffect(() => {
    const name = localStorage.getItem('isp_name');
    if (!name) {
      router.push('/login');
      return;
    }
    setIspName(name);

    // Clear signup data
    localStorage.removeItem('signup_success');
    localStorage.removeItem('isp_name');
  }, [router]);

  // Check if approved every 30 seconds
  useEffect(() => {
    const checkApproval = async () => {
      setCheckingStatus(true);
      try {
        const token = localStorage.getItem('wb_token');
        if (!token) return; // Not logged in yet

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/tenants/status`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (res.ok) {
          const data = await res.json();
          if (data.status === 'active') {
            setIsApproved(true);
            // Wait a moment, then redirect
            setTimeout(() => {
              router.push('/login');
            }, 2000);
          }
        }
      } catch (err) {
        console.error('Error checking approval:', err);
      } finally {
        setCheckingStatus(false);
      }
    };

    // Check immediately, then every 30 seconds
    checkApproval();
    const interval = setInterval(checkApproval, 30000);

    return () => clearInterval(interval);
  }, [router]);

  if (isApproved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
        <div className="bg-slate-800 rounded-lg shadow-2xl p-8 max-w-md w-full border border-slate-700 text-center">
          <div className="text-5xl mb-4 animate-bounce">✅</div>
          <h1 className="text-2xl font-bold text-white mb-2">Approved!</h1>
          <p className="text-slate-300 mb-4">
            Your account has been approved. Redirecting to login...
          </p>
          <div className="w-12 h-12 border-4 border-blue-500 border-t-yellow-400 rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="bg-slate-800 rounded-lg shadow-2xl p-8 max-w-md w-full border border-slate-700">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">⏳</div>
          <h1 className="text-2xl font-bold text-white mb-2">Pending Approval</h1>
          <p className="text-slate-400">
            {ispName ? `Waiting to approve: ${ispName}` : 'Your account is awaiting approval'}
          </p>
        </div>

        {/* Status */}
        <div className="bg-slate-700 rounded p-6 mb-6 border border-slate-600">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-300">Status</span>
            <span className="flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
              <span className="text-yellow-400 font-bold">Pending</span>
            </span>
          </div>

          <div className="bg-slate-600 rounded p-4 text-sm text-slate-300 space-y-2">
            <p>✓ Account created</p>
            <p>⏳ Admin reviewing...</p>
            <p className="text-slate-400 text-xs mt-4">
              Check back soon or we'll notify you via email when approved
            </p>
          </div>
        </div>

        {/* What's Next */}
        <div className="bg-blue-600 bg-opacity-10 border border-blue-500 rounded p-4 mb-6">
          <h3 className="text-blue-300 font-bold mb-2">What happens next:</h3>
          <ol className="text-blue-200 text-sm space-y-2">
            <li>1. Our team reviews your application</li>
            <li>2. We send you approval email</li>
            <li>3. You log in and customize your portal</li>
            <li>4. WiFi users see your branded network</li>
          </ol>
        </div>

        {/* FAQ */}
        <div className="bg-slate-700 rounded p-4 border border-slate-600">
          <h3 className="text-slate-300 font-bold mb-3">FAQ</h3>
          
          <div className="space-y-3 text-sm text-slate-300">
            <div>
              <p className="font-bold text-slate-200 mb-1">How long does approval take?</p>
              <p className="text-slate-400">Usually 1-2 hours during business hours</p>
            </div>

            <div>
              <p className="font-bold text-slate-200 mb-1">I haven't received an email?</p>
              <p className="text-slate-400">Check your spam folder or contact admin@wibill.co.ke</p>
            </div>

            <div>
              <p className="font-bold text-slate-200 mb-1">Can I set up while waiting?</p>
              <p className="text-slate-400">No, please wait for approval. Full setup guide comes after approval.</p>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="mt-6 text-center">
          <p className="text-slate-400 text-sm mb-2">Need help?</p>
          <a
            href="mailto:admin@wibill.co.ke"
            className="text-blue-400 hover:text-blue-300 text-sm font-bold"
          >
            Contact Admin
          </a>
        </div>

        {/* Auto-check indicator */}
        <div className="mt-4 text-center">
          <p className="text-slate-500 text-xs">
            {checkingStatus ? 'Checking status...' : 'Auto-checking every 30 seconds'}
          </p>
        </div>
      </div>
    </div>
  );
}