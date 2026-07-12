'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function BatcaveLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'transitioning'>('idle');
  const [btnHover, setBtnHover] = useState(false);

  const login = async () => {
    setError('');
    setLoading(true);
    try {
      const form = new URLSearchParams();
      form.append('username', email);
      form.append('password', password);
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || 'Authentication failed');
        setLoading(false);
        return;
      }
      if (data.role !== 'platform_admin') {
        setError('Restricted. Platform administrators only.');
        setLoading(false);
        return;
      }
      localStorage.setItem('wb_token', data.access_token);
      localStorage.setItem('wb_role', data.role);
      localStorage.setItem('wb_user', JSON.stringify({ email, role: data.role }));
      sessionStorage.setItem('token', data.access_token);
      sessionStorage.setItem('role', data.role);
      setLoading(false);
      setPhase('transitioning');
      setTimeout(() => router.push('/admin'), 1600);
    } catch {
      setError('Cannot reach server — check connection');
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#030303',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: 'Syne, sans-serif',
    }}>
      {/* ─── Amber glow: top-left ─── */}
      <div style={{
        position: 'absolute', top: '-350px', left: '-350px',
        width: 900, height: 900,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(251,191,36,0.07) 0%, transparent 65%)',
        filter: 'blur(500px)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* ─── Amber glow: bottom-right ─── */}
      <div style={{
        position: 'absolute', bottom: '-350px', right: '-350px',
        width: 900, height: 900,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(251,191,36,0.05) 0%, transparent 65%)',
        filter: 'blur(500px)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* ─── Gold-tinted hexagonal grid ─── */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        opacity: phase === 'transitioning' ? 0.12 : 0.07,
        transform: phase === 'transitioning' ? 'scale(1.08)' : 'scale(1)',
        transition: 'transform 600ms ease, opacity 600ms ease',
        transitionDelay: '500ms',
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='52' viewBox='0 0 60 52' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0L60 15v22L30 52 0 37V15z' fill='none' stroke='%23fbbf24' stroke-width='0.5' opacity='0.5'/%3E%3C/svg%3E")`,
        backgroundSize: '60px 52px',
      }} />

      {/* ─── Transition sweep line ─── */}
      {phase === 'transitioning' && (
        <>
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: 4,
            background: '#fbbf24', zIndex: 200,
            animation: 'sweep-line 400ms ease-in-out forwards',
            animationDelay: '1100ms',
            pointerEvents: 'none',
          }} />
          <style>{`
            @keyframes sweep-line {
              0% { left: -100%; }
              100% { left: 200%; }
            }
          `}</style>
        </>
      )}

      {/* ─── Glass card ─── */}
      <div style={{
        position: 'relative', zIndex: 1,
        opacity: phase === 'transitioning' ? 0 : 1,
        transition: 'opacity 300ms ease-in',
        transitionDelay: phase === 'transitioning' ? '200ms' : '0ms',
        width: '100%', maxWidth: 440,
        margin: 24,
      }}>
        <div style={{
          background: 'rgba(8, 8, 8, 0.55)',
          backdropFilter: 'blur(24px) saturate(1.2)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.2)',
          border: '0.5px solid rgba(251, 191, 36, 0.18)',
          borderRadius: 20,
          padding: 48,
          transition: 'opacity 300ms ease-in, transform 300ms ease-in',
          transitionDelay: phase === 'transitioning' ? '0ms' : '0ms',
          opacity: phase === 'transitioning' ? 0 : 1,
          transform: phase === 'transitioning' ? 'translateY(-8px)' : 'translateY(0)',
        }}>
          {/* Logo + branding */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{
              width: 56, height: 56,
              background: '#fbbf24',
              borderRadius: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, fontWeight: 900, color: '#030303',
              margin: '0 auto 16px',
            }}>X</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.03em', marginBottom: 4 }}>
              WiBill{' '}
              <span style={{ animation: 'bat-pulse 3s ease-in-out infinite' }}>B</span>
              atcave
            </div>
            <div style={{
              fontFamily: '"DM Mono", monospace',
              fontSize: 12, color: 'rgba(255,255,255,0.35)',
              letterSpacing: '0.02em',
            }}>
              Restricted access
            </div>
          </div>

          {/* EMAIL */}
          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block',
              fontFamily: '"DM Mono", monospace',
              fontSize: 10, color: '#92661a',
              letterSpacing: '0.15em', marginBottom: 8,
            }}>EMAIL</label>
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              type="email"
              placeholder="admin@wibill.co.ke"
              onKeyDown={e => e.key === 'Enter' && login()}
              style={inputStyle}
              onFocus={e => { e.target.style.borderColor = '#fbbf24'; }}
              onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.06)'; }}
            />
          </div>

          {/* PASSWORD */}
          <div style={{ marginBottom: 28 }}>
            <label style={{
              display: 'block',
              fontFamily: '"DM Mono", monospace',
              fontSize: 10, color: '#92661a',
              letterSpacing: '0.15em', marginBottom: 8,
            }}>PASSWORD</label>
            <div style={{ position: 'relative' }}>
              <input
                value={password}
                onChange={e => setPassword(e.target.value)}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••"
                onKeyDown={e => e.key === 'Enter' && login()}
                style={{ ...inputStyle, paddingRight: 44 }}
                onFocus={e => { e.target.style.borderColor = '#fbbf24'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.06)'; }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: 12, top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: 4, display: 'flex',
                  color: showPassword ? '#fbbf24' : 'rgba(255,255,255,0.15)',
                  transition: 'color 200ms',
                }}
                onMouseEnter={e => { if (!showPassword) e.currentTarget.style.color = '#fbbf24'; }}
                onMouseLeave={e => { if (!showPassword) e.currentTarget.style.color = 'rgba(255,255,255,0.15)'; }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)',
              border: '0.5px solid rgba(239,68,68,0.25)',
              borderRadius: 8, padding: '11px 16px',
              fontFamily: '"DM Mono", monospace',
              fontSize: 12, color: '#f87171',
              marginBottom: 20,
            }}>{error}</div>
          )}

          {/* CTA Button */}
          <button
            onClick={login}
            disabled={loading}
            style={{
              width: '100%', height: 48,
              background: loading ? 'transparent' : btnHover ? '#f59e0b' : '#fbbf24',
              border: loading ? '0.5px solid rgba(255,255,255,0.06)' : 'none',
              borderRadius: 12, padding: '0 24px',
              color: loading ? 'rgba(255,255,255,0.2)' : '#030303',
              fontFamily: 'Syne, sans-serif',
              fontSize: 14, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 200ms',
              position: 'relative',
              overflow: 'hidden',
            }}
            onMouseEnter={() => !loading && setBtnHover(true)}
            onMouseLeave={() => { setBtnHover(false); }}
          >
            {loading ? (
              <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0,
                width: '100%', height: 4, margin: 'auto',
                background: '#fbbf24', borderRadius: 2,
                animation: 'loading-fill 800ms ease-in-out forwards',
              }} />
            ) : (
              <span style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                Enter MyDash
                <span style={{
                  display: 'inline-block',
                  transition: 'transform 150ms ease',
                  transform: btnHover ? 'translateX(4px)' : 'translateX(0)',
                }}>→</span>
              </span>
            )}
          </button>

          {/* ISP Dashboard link */}
          <div style={{ marginTop: 28, textAlign: 'center' }}>
            <div style={{
              fontFamily: '"DM Mono", monospace',
              fontSize: 10, color: 'rgba(255,255,255,0.2)',
              letterSpacing: '0.1em', marginBottom: 4,
            }}>ISP DASHBOARD</div>
            <a
              href="/login"
              style={{
                fontFamily: '"DM Mono", monospace',
                fontSize: 12, color: 'rgba(251, 191, 36, 0.7)',
                textDecoration: 'none',
                display: 'inline-block',
                paddingBottom: 2,
                transition: 'color 200ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#fbbf24'; e.currentTarget.style.textDecoration = 'underline'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(251, 191, 36, 0.7)'; e.currentTarget.style.textDecoration = 'none'; }}
            >
              dashboard.wibill.co.ke/login
            </a>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bat-pulse {
          0%, 100% { color: #fbbf24; }
          50% { color: #d97706; }
        }
        @keyframes loading-fill {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.03)',
  border: '0.5px solid rgba(255,255,255,0.06)',
  borderRadius: 8,
  padding: '13px 16px',
  fontFamily: '"DM Mono", monospace',
  fontSize: 13,
  color: '#ffffff',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 200ms',
};
