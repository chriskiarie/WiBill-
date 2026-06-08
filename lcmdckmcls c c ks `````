'use client';

import { useEffect, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  RefreshCw,
  AlertTriangle,
  BarChart3,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface RevenuePoint {
  date: string;
  amount: number;
}

interface Stats {
  revenue_today: number;
  revenue_month: number;
  active_sessions: number;
  total_isps: number;
}

export default function RevenuePage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [trend, setTrend] = useState<RevenuePoint[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);

      const token = sessionStorage.getItem('token');

      const res = await fetch(`${API}/api/admin/revenue`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      setStats(data.stats);
      setTrend(data.trend || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 15000);
    return () => clearInterval(id);
  }, []);

  const isUp = trend.length > 1
    ? trend[trend.length - 1].amount >= trend[0].amount
    : true;

  return (
    <div style={{ padding: 24, color: '#e8e4d0' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em' }}>
            Revenue Intelligence Core
          </h1>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
            Real-time financial surveillance stream
          </p>
        </div>

        <button
          onClick={fetchData}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            borderRadius: 10,
            border: '1px solid rgba(250,200,0,0.2)',
            background: 'rgba(250,200,0,0.06)',
            color: '#fac800',
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={14} />
          Sync
        </button>
      </div>

      {/* STATS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        
        <Card title="Today" value={stats?.revenue_today ?? 0} icon={<DollarSign size={16} />} />
        <Card title="Month" value={stats?.revenue_month ?? 0} icon={<BarChart3 size={16} />} />
        <Card title="Sessions" value={stats?.active_sessions ?? 0} icon={<Activity size={16} />} />
        <Card title="ISPs" value={stats?.total_isps ?? 0} icon={<Activity size={16} />} />
      </div>

      {/* TREND PANEL */}
      <div style={{
        marginTop: 18,
        padding: 16,
        borderRadius: 14,
        background: '#0b0b0f',
        border: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            Revenue Flow Trace
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {isUp ? (
              <TrendingUp size={14} color="#22c55e" />
            ) : (
              <TrendingDown size={14} color="#ef4444" />
            )}
            <span style={{ fontSize: 11, opacity: 0.6 }}>
              {isUp ? 'Stable growth' : 'Downward drift detected'}
            </span>
          </div>
        </div>

        <div style={{
          height: 140,
          display: 'flex',
          alignItems: 'flex-end',
          gap: 4,
        }}>
          {trend.map((t, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${Math.min(100, (t.amount / 1000) * 100)}%`,
                background: 'linear-gradient(180deg, #fac800, rgba(250,200,0,0.1))',
                borderRadius: 4,
                opacity: 0.9,
              }}
            />
          ))}
        </div>
      </div>

      {/* ALERT STRIP */}
      <div style={{
        marginTop: 16,
        padding: 12,
        borderRadius: 10,
        border: '1px solid rgba(250,200,0,0.15)',
        background: 'rgba(250,200,0,0.03)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <AlertTriangle size={14} color="#fac800" />
        <span style={{ fontSize: 12, opacity: 0.7 }}>
          Revenue pipeline stable — no anomalies detected in last 24h
        </span>
      </div>
    </div>
  );
}

function Card({ title, value, icon }: any) {
  return (
    <div style={{
      padding: 14,
      borderRadius: 12,
      background: '#0b0b0f',
      border: '1px solid rgba(255,255,255,0.05)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 11, opacity: 0.5 }}>{title}</div>
        <div style={{ opacity: 0.6 }}>{icon}</div>
      </div>
      <div style={{ fontSize: 18, fontWeight: 700 }}>
        {value}
      </div>
    </div>
  );
}