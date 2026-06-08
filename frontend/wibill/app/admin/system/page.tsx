'use client';

import { useEffect, useState } from 'react';
import {
  Server,
  Wifi,
  ShieldCheck,
  AlertTriangle,
  Activity,
  Cpu,
  Database,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Node {
  name: string;
  status: 'ok' | 'warn' | 'bad';
  latency: number;
}

export default function SystemPage() {
  const [nodes, setNodes] = useState<Node[]>([]);

  const fetchNodes = async () => {
    try {
      const token = sessionStorage.getItem('token');

      const res = await fetch(`${API}/api/admin/system`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      setNodes(data.nodes || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchNodes();
    const id = setInterval(fetchNodes, 10000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ padding: 24, color: '#e8e4d0' }}>
      
      {/* HEADER */}
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>
          System Core Matrix
        </h1>
        <p style={{ fontSize: 12, opacity: 0.4 }}>
          Live infrastructure telemetry grid
        </p>
      </div>

      {/* GRID */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 12,
      }}>
        {nodes.map((n, i) => (
          <div
            key={i}
            style={{
              padding: 14,
              borderRadius: 12,
              background: '#0b0b0f',
              border:
                n.status === 'ok'
                  ? '1px solid rgba(34,197,94,0.2)'
                  : n.status === 'warn'
                  ? '1px solid rgba(250,200,0,0.2)'
                  : '1px solid rgba(239,68,68,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{n.name}</div>
              <ShieldCheck size={14} />
            </div>

            <div style={{ marginTop: 10, fontSize: 11, opacity: 0.5 }}>
              Latency: {n.latency}ms
            </div>

            <div
              style={{
                marginTop: 8,
                fontSize: 11,
                color:
                  n.status === 'ok'
                    ? '#22c55e'
                    : n.status === 'warn'
                    ? '#fac800'
                    : '#ef4444',
              }}
            >
              {n.status.toUpperCase()}
            </div>
          </div>
        ))}
      </div>

      {/* FOOTER STRIP */}
      <div style={{
        marginTop: 18,
        padding: 12,
        borderRadius: 10,
        border: '1px solid rgba(255,255,255,0.05)',
        background: '#0b0b0f',
        display: 'flex',
        justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 11, opacity: 0.5 }}>
          Infrastructure heartbeat active
        </span>
        <Activity size={14} />
      </div>
    </div>
  );
}