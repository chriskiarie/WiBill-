'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function JoinPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('ref');

  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState('');
  const [registered, setRegistered] = useState(false);
  const [registrationError, setRegistrationError] = useState('');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    isp_name: '',
    phone: '',
  });

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setTokenError('No invite token provided. Please check your link.');
      setLoading(false);
      return;
    }

    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      setValidating(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/join/validate?token=${token}`
      );

      const data = await response.json();

      if (data.valid) {
        setTokenValid(true);
        setTokenError('');
      } else {
        setTokenValid(false);
        setTokenError(data.message || 'Invalid invite token');
      }
    } catch (error) {
      setTokenValid(false);
      setTokenError('Failed to validate token. Please try again.');
      console.error('Token validation error:', error);
    } finally {
      setValidating(false);
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegistrationError('');

    // Validation
    if (!formData.email || !formData.password || !formData.isp_name || !formData.phone) {
      setRegistrationError('All fields are required');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setRegistrationError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setRegistrationError('Password must be at least 8 characters');
      return;
    }

    try {
      setValidating(true);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/register?token=${token}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            isp_name: formData.isp_name,
            phone: formData.phone,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setRegistrationError(data.detail || 'Registration failed');
        return;
      }

      // Success
      setRegistered(true);

      // Store token and redirect after 2 seconds
      if (data.access_token) {
        localStorage.setItem('access_token', data.access_token);
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
    } catch (error) {
      setRegistrationError('An error occurred. Please try again.');
      console.error('Registration error:', error);
    } finally {
      setValidating(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          <p className="mt-4 text-white text-lg">Validating your invite...</p>
        </div>
      </div>
    );
  }

  // Token invalid
  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
          <div className="text-center">
            <div className="text-5xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invite</h1>
            <p className="text-gray-600 mb-6">{tokenError}</p>
            <p className="text-gray-500 text-sm mb-6">
              If you believe this is an error, please contact your WiBill administrator.
            </p>
            <Link
              href="/login"
              className="inline-block bg-slate-900 text-white px-6 py-2 rounded-lg hover:bg-slate-800 transition"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Registration success
  if (registered) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
          <div className="text-center">
            <div className="text-5xl mb-4">✅</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to WiBill!</h1>
            <p className="text-gray-600 mb-4">
              Your account has been created successfully.
            </p>
            <p className="text-gray-500 text-sm mb-6">
              Your application is now pending approval. You'll receive an email once you're approved by our team. This typically takes within 24 hours.
            </p>
            <p className="text-gray-400 text-xs">
              Redirecting to login in a moment...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Registration form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 px-4 py-8">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">WiBill</h1>
          <p className="text-gray-300">Join the WiFi Billing Platform</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Your ISP Account</h2>

          {registrationError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{registrationError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* ISP Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ISP Business Name
              </label>
              <input
                type="text"
                name="isp_name"
                value={formData.isp_name}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                placeholder="e.g. WagWan Networks"
                disabled={validating}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                placeholder="admin@yourispco.ke"
                disabled={validating}
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                placeholder="+254 700 000000"
                disabled={validating}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                placeholder="••••••••"
                disabled={validating}
              />
              <p className="text-xs text-gray-500 mt-1">Min. 8 characters</p>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                placeholder="••••••••"
                disabled={validating}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={validating}
              className="w-full bg-slate-900 text-white py-2 rounded-lg font-semibold hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {validating ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-gray-600 text-sm mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-slate-900 font-semibold hover:underline">
              Log in
            </Link>
          </p>
        </div>

        {/* Branding */}
        <p className="text-center text-gray-400 text-xs mt-8">
          Powered by <span className="font-semibold">WiBill</span> · Secure ISP Billing
        </p>
      </div>
    </div>
  );
}
