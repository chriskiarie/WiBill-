'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function BatcaveLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const login = async () => {
    setError(''); setLoading(true);
    try {
      const form = new FormData();
      form.append('username', email);
      form.append('password', password);
      const r = await fetch(`${API}/api/auth/login`, { method: 'POST', body: form });
      const data = await r.json();
      if (!r.ok) { setError(data.detail || 'Authentication failed'); return; }
      if (data.role !== 'platform_admin') {
        setError('Restricted. Platform administrators only.');
        return;
      }
      sessionStorage.setItem('token', data.access_token);
      sessionStorage.setItem('role', data.role);
      router.push('/admin');
    } catch { setError('Cannot reach server — check connection'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#030308',
      display: 'flex',
      fontFamily: '"Space Grotesk", Inter, sans-serif',
    }}>
      {/* Left panel */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '60px 80px',
        borderRight: '1px solid rgba(250,200,0,0.06)',
      }}>
        {/* Logo */}
        <div style={{ marginBottom: 60 }}>
          <div style={{
            width: 48, height: 48,
            background: 'linear-gradient(135deg, #fac800, #f59e0b)',
            borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 900, color: '#0a0800',
            boxShadow: '0 0 30px rgba(250,200,0,0.25)',
            marginBottom: 20,
          }}>X</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', marginBottom: 8 }}>
            Xw<span style={{ color: '#fac800' }}>B</span> Batcave
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', lineHeight: 1.6 }}>
            Platform command center.<br />Restricted to authorized administrators.
          </div>
        </div>

        {/* Stats preview (static) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { label: 'Your Cut', value: '10%', desc: 'Per transaction' },
            { label: 'Platform', value: 'WiBill', desc: 'v0.1.0' },
            { label: 'Security', value: 'JWT', desc: 'Role-gated' },
            { label: 'Access', value: 'Admin', desc: 'Only you' },
          ].map(s => (
            <div key={s.label} style={{
              background: 'rgba(250,200,0,0.04)',
              border: '1px solid rgba(250,200,0,0.08)',
              borderRadius: 12, padding: '14px 16px',
            }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#fac800', letterSpacing: '-0.02em' }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 2 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel - login form */}
      <div style={{
        width: 420,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '60px 48px',
      }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', marginBottom: 6 }}>Admin Access</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Enter your platform credentials</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Email', value: email, set: setEmail, type: 'email', placeholder: 'admin@xwbill.co.ke' },
            { label: 'Password', value: password, set: setPassword, type: 'password', placeholder: '••••••••••' },
          ].map(f => (
            <div key={f.label}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(250,200,0,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>{f.label}</label>
              <input
                value={f.value}
                onChange={e => f.set(e.target.value)}
                type={f.type}
                placeholder={f.placeholder}
                onKeyDown={e => e.key === 'Enter' && login()}
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.04)',
                  border: '1.5px solid rgba(255,255,255,0.08)',
                  borderRadius: 10, padding: '12px 16px',
                  fontSize: 14, color: '#fff', outline: 'none',
                  boxSizing: 'border-box', fontFamily: 'inherit',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(250,200,0,0.3)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
              />
            </div>
          ))}
        </div>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 10, padding: '11px 16px',
            fontSize: 13, color: '#f87171',
            marginBottom: 20,
          }}>{error}</div>
        )}

        <button
          onClick={login}
          disabled={loading}
          style={{
            width: '100%',
            background: loading ? 'rgba(250,200,0,0.1)' : 'linear-gradient(135deg, #fac800, #f59e0b)',
            border: 'none', borderRadius: 12,
            padding: '14px', color: loading ? 'rgba(255,255,255,0.3)' : '#0a0800',
            fontSize: 14, fontWeight: 800,
            cursor: loading ? 'not-allowed' : 'pointer',
            letterSpacing: '-0.01em',
            transition: 'all 0.2s',
            boxShadow: loading ? 'none' : '0 0 24px rgba(250,200,0,0.2)',
          }}>
          {loading ? 'Authenticating...' : 'Enter the Batcave →'}
        </button>

        <div style={{ marginTop: 32, padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>ISP Dashboard</div>
          <a href="/login" style={{ fontSize: 13, color: 'rgba(250,200,0,0.5)', textDecoration: 'none' }}>dashboard.wibill.co.ke/login ↗</a>
        </div>
      </div>
    </div>
  );
}