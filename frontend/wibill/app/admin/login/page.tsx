'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const C = {
  void: '#000000', base: '#080808', raised: '#0d0d0d',
  border: '#141414',
  text: '#f0f0f0', muted: '#444444',
  gold: '#E8B84B', green: '#22c55e', red: '#ef4444',
};

// Inner component uses useSearchParams — must be inside Suspense
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const prefilledEmail = searchParams?.get('username') || searchParams?.get('email') || '';

  useEffect(() => {
    if (prefilledEmail) setEmail(prefilledEmail);
    const token = localStorage.getItem('wb_token');
    if (token) router.replace('/admin');
  }, [prefilledEmail, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const body = new URLSearchParams();
      body.append('username', email);
      body.append('password', password);
      const r = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err?.detail || 'Invalid credentials');
      }
      const data = await r.json();
      localStorage.setItem('wb_token', data.access_token);
      localStorage.setItem('wb_role', data.role || '');
      router.replace(data.role === 'platform_admin' ? '/admin' : '/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const inp: React.CSSProperties = {
    width: '100%',
    background: C.raised,
    border: `0.5px solid ${C.border}`,
    borderRadius: 8,
    padding: '12px 14px',
    color: C.text,
    fontFamily: 'DM Mono, monospace',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  };

  return (
    <div style={{ width: '100%', maxWidth: 400 }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ width: 28, height: 28, background: C.gold, borderRadius: 6 }} />
          <div style={{ fontSize: 22, fontWeight: 800, color: C.gold, fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '-0.02em' }}>
            BATCAVE
          </div>
        </div>
        <div style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Platform Admin
        </div>
      </div>

      {/* Card */}
      <div style={{ background: C.base, border: `0.5px solid ${C.border}`, borderRadius: 12, padding: 28 }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text, fontFamily: 'Space Grotesk, sans-serif', marginBottom: 4 }}>
            Sign In
          </div>
          <div style={{ fontSize: 12, color: C.muted, fontFamily: 'DM Mono, monospace' }}>
            {email ? `Continue as ${email}` : 'Enter your credentials'}
          </div>
        </div>

        {prefilledEmail && (
          <div style={{ background: `${C.green}0d`, border: `0.5px solid ${C.green}20`, borderRadius: 7, padding: '10px 14px', color: C.green, fontSize: 11, fontFamily: 'DM Mono, monospace', marginBottom: 16 }}>
            Account approved — enter your password to continue
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: C.muted, marginBottom: 6 }}>
              Email / Username
            </div>
            <input
              type="text"
              placeholder="admin@xwbill.co.ke"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={loading}
              required
              autoFocus={!email}
              style={{ ...inp, opacity: loading ? 0.5 : 1 }}
              onFocus={e => { e.currentTarget.style.borderColor = C.gold; }}
              onBlur={e => { e.currentTarget.style.borderColor = C.border; }}
            />
          </div>

          <div>
            <div style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: C.muted, marginBottom: 6 }}>
              Password
            </div>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={loading}
              required
              autoFocus={!!email}
              style={{ ...inp, opacity: loading ? 0.5 : 1 }}
              onFocus={e => { e.currentTarget.style.borderColor = C.gold; }}
              onBlur={e => { e.currentTarget.style.borderColor = C.border; }}
            />
          </div>

          {error && (
            <div style={{ background: `${C.red}0d`, border: `0.5px solid ${C.red}20`, borderRadius: 7, padding: '10px 14px', color: C.red, fontSize: 12, fontFamily: 'DM Mono, monospace' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            style={{
              width: '100%', background: C.gold, border: 'none', borderRadius: 8,
              padding: '13px', color: '#000',
              fontFamily: 'Space Grotesk, sans-serif', fontSize: 13, fontWeight: 700,
              cursor: loading || !email || !password ? 'not-allowed' : 'pointer',
              opacity: loading || !email || !password ? 0.6 : 1,
              transition: 'opacity 0.15s',
              letterSpacing: '0.02em',
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: 20, paddingTop: 16, borderTop: `0.5px solid ${C.border}`, textAlign: 'center', fontSize: 10, color: C.muted, fontFamily: 'DM Mono, monospace' }}>
          WiBill Platform · Nairobi, Kenya
        </div>
      </div>
    </div>
  );
}

// Suspense fallback — same black void, gold spinner
function LoginSkeleton() {
  return (
    <div style={{ width: '100%', maxWidth: 400 }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ width: 28, height: 28, background: '#E8B84B', borderRadius: 6 }} />
          <div style={{ fontSize: 22, fontWeight: 800, color: '#E8B84B', fontFamily: 'Space Grotesk, sans-serif' }}>BATCAVE</div>
        </div>
        <div style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: '#444', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Platform Admin</div>
      </div>
      <div style={{ background: '#080808', border: '0.5px solid #141414', borderRadius: 12, padding: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 280 }}>
        <div style={{
          width: 24, height: 24, border: '1px solid #141414',
          borderTop: '1px solid #E8B84B', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

// Default export wraps LoginForm in Suspense
export default function AdminLogin() {
  return (
    <div style={{ minHeight: '100vh', background: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'Inter, -apple-system, sans-serif' }}>
      <Suspense fallback={<LoginSkeleton />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}