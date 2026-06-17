"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PendingApprovalPage() {
  const router = useRouter();
  const [ispName, setIspName] = useState('Your ISP');

  useEffect(() => {
    const name = localStorage.getItem('isp_name');
    if (name) {
      setIspName(name);
      localStorage.removeItem('isp_name');
    }
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#030303',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 480,
        background: '#080808',
        border: '0.5px solid #1a1a1a',
        borderRadius: 16,
        padding: 40,
        textAlign: 'center',
      }}>
        {/* Icon */}
        <div style={{
          width: 72,
          height: 72,
          background: 'rgba(251,191,36,0.1)',
          border: '1px solid rgba(251,191,36,0.3)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 32,
          margin: '0 auto 24px',
        }}>
          ⏳
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: 24,
          fontWeight: 800,
          color: '#fff',
          margin: '0 0 8px',
          letterSpacing: '-0.02em',
        }}>
          Application Submitted
        </h1>
        <p style={{
          fontSize: 14,
          color: 'rgba(255,255,255,0.4)',
          margin: '0 0 32px',
          lineHeight: 1.6,
        }}>
          <strong style={{ color: '#fbbf24' }}>{ispName}</strong> is pending approval from the platform admin.
        </p>

        {/* Status steps */}
        <div style={{
          background: '#0d0d0d',
          border: '0.5px solid #1a1a1a',
          borderRadius: 12,
          padding: 20,
          marginBottom: 24,
          textAlign: 'left',
        }}>
          {[
            { done: true, label: 'Account created', sub: 'Your ISP profile is saved' },
            { done: false, label: 'Admin reviewing', sub: 'Usually within 1-2 hours', active: true },
            { done: false, label: 'Approval email sent', sub: 'Check your inbox' },
            { done: false, label: 'Access your dashboard', sub: 'Login and set up your portal' },
          ].map((step, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              padding: '10px 0',
              borderBottom: i < 3 ? '0.5px solid #141414' : 'none',
            }}>
              <div style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: step.done
                  ? 'rgba(34,197,94,0.2)'
                  : step.active
                  ? 'rgba(251,191,36,0.2)'
                  : 'rgba(255,255,255,0.05)',
                border: `1px solid ${step.done ? '#22c55e' : step.active ? '#fbbf24' : '#1a1a1a'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                color: step.done ? '#22c55e' : step.active ? '#fbbf24' : '#333',
                flexShrink: 0,
                marginTop: 2,
              }}>
                {step.done ? '✓' : step.active ? '◎' : '○'}
              </div>
              <div>
                <div style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: step.done ? '#22c55e' : step.active ? '#fbbf24' : 'rgba(255,255,255,0.3)',
                  marginBottom: 2,
                }}>
                  {step.label}
                </div>
                <div style={{
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.2)',
                }}>
                  {step.sub}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Info box */}
        <div style={{
          background: 'rgba(59,130,246,0.06)',
          border: '0.5px solid rgba(59,130,246,0.2)',
          borderRadius: 10,
          padding: '14px 16px',
          marginBottom: 24,
          textAlign: 'left',
        }}>
          <div style={{ fontSize: 12, color: 'rgba(147,197,253,0.8)', lineHeight: 1.7 }}>
            <div style={{ fontWeight: 700, marginBottom: 4, color: '#93c5fd' }}>What happens next:</div>
            You'll receive an email at your registered address once approved.
            You can then log in and complete your portal setup including
            MikroTik config, M-Pesa payments, and your branded captive portal.
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <a
            href="mailto:admin@wibill.co.ke"
            style={{
              flex: 1,
              display: 'block',
              background: 'transparent',
              border: '0.5px solid #1a1a1a',
              borderRadius: 10,
              padding: '12px',
              color: 'rgba(255,255,255,0.4)',
              fontSize: 12,
              textDecoration: 'none',
              textAlign: 'center',
              fontWeight: 600,
            }}
          >
            Contact Support
          </a>
          <button
            onClick={() => router.push('/login')}
            style={{
              flex: 1,
              background: 'rgba(251,191,36,0.1)',
              border: '0.5px solid rgba(251,191,36,0.3)',
              borderRadius: 10,
              padding: '12px',
              color: '#fbbf24',
              fontSize: 12,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Back to Login
          </button>
        </div>

        <div style={{
          marginTop: 20,
          fontSize: 10,
          color: '#161616',
          fontFamily: 'DM Mono, monospace',
        }}>
          XwB
        </div>
      </div>
    </div>
  );
}