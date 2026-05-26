'use client';
import { useState, useEffect } from 'react';
import { 
  Lock, Eye, EyeOff, Copy, Check, AlertTriangle, Trash2, 
  Shield, Zap, Code, Bell, Smartphone, Mail, Key, LogOut,
  Settings as SettingsIcon, Save, X, ChevronDown, Globe, Clock,
  Percent, DollarSign, Wifi, Activity, ArrowRight, RefreshCw,
  Server, Database, Radio, AlertCircle, CheckCircle, Circle
} from 'lucide-react';

const API3 = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type SettingsTab = 'platform' | 'payments' | 'revenue' | 'invites' | 'notifications' | 'security' | 'integrations' | 'health' | 'danger';

interface HealthStatus {
  status?: string;
  version?: string;
  database?: string;
  environment?: string;
  timestamp?: string;
}

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('platform');
  const [hasChanges, setHasChanges] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSecretFields, setShowSecretFields] = useState<Record<string, boolean>>({});
  const [expandedConfig, setExpandedConfig] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API3}/health`)
      .then(r => r.json())
      .then(setHealth)
      .catch(() => setHealth({ status: 'error', version: '0.1.0', database: 'disconnected', environment: 'production' }))
      .finally(() => setLoading(false));
  }, []);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSave = () => {
    setShowSaveToast(true);
    setHasChanges(false);
    setTimeout(() => setShowSaveToast(false), 3000);
  };

  const toggleSecretField = (field: string) => {
    setShowSecretFields(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const sectionConfig = [
    { id: 'platform', label: 'Platform Identity', icon: Globe, status: 'configured' as const },
    { id: 'payments', label: 'Payments', icon: DollarSign, status: 'configured' as const },
    { id: 'revenue', label: 'Revenue Rules', icon: Percent, status: 'configured' as const },
    { id: 'invites', label: 'Invite System', icon: Mail, status: 'incomplete' as const },
    { id: 'notifications', label: 'Notifications', icon: Bell, status: 'configured' as const },
    { id: 'security', label: 'Security', icon: Shield, status: 'configured' as const },
    { id: 'integrations', label: 'Integrations', icon: Code, status: 'configured' as const },
    { id: 'health', label: 'System Health', icon: Wifi, status: 'configured' as const },
    { id: 'danger', label: 'Danger Zone', icon: AlertTriangle, status: 'warning' as const },
  ];

  return (
    <div className="min-h-screen" style={{
      background: 'linear-gradient(135deg, #050816 0%, #071028 45%, #0b1030 100%)',
      color: '#fff',
    }}>
      {/* Header with Status Pills */}
      <div style={{ 
        padding: '40px 48px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
      }}>
        <div>
          <h1 style={{ fontSize: 48, fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 12px' }}>
            Settings
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', margin: 0 }}>
            Mission control for WiBill platform configuration
          </p>
        </div>
        
        {/* Status Pills */}
        <div style={{ display: 'flex', gap: 12, flexDirection: 'column', alignItems: 'flex-end' }}>
          <StatusPill icon={Server} label="API Healthy" status="ok" />
          <StatusPill icon={Database} label="Database Connected" status="ok" />
          <StatusPill icon={Activity} label="Scheduler Online" status="ok" />
          {hasChanges && (
            <div style={{
              padding: '8px 12px',
              background: 'rgba(244,185,66,0.15)',
              border: '1px solid rgba(244,185,66,0.3)',
              borderRadius: 8,
              fontSize: 12,
              color: '#F4B942',
              fontWeight: 500,
            }}>
              ◆ Unsaved Changes
            </div>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {showSaveToast && (
        <div style={{
          position: 'fixed',
          bottom: 32,
          right: 32,
          background: 'linear-gradient(135deg, rgba(59,232,176,0.95), rgba(51,200,150,0.95))',
          border: '1px solid rgba(59,232,176,0.3)',
          borderRadius: 12,
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          zIndex: 50,
          boxShadow: '0 20px 40px rgba(59,232,176,0.2)'
        }}>
          <Check size={18} style={{ color: '#fff' }} />
          <span style={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>Settings saved successfully</span>
        </div>
      )}

      {/* Main Content */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 48px 64px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 40, marginTop: 40 }}>
          {/* Sidebar Navigation */}
          <nav style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            position: 'sticky',
            top: 40,
            height: 'fit-content'
          }}>
            {sectionConfig.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as SettingsTab)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 12,
                    border: activeTab === tab.id ? '1px solid rgba(77,141,255,0.4)' : 'none',
                    background: activeTab === tab.id 
                      ? 'linear-gradient(135deg, rgba(77,141,255,0.15), rgba(77,141,255,0.08))'
                      : 'transparent',
                    color: activeTab === tab.id ? '#4D8DFF' : 'rgba(255,255,255,0.6)',
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    transition: 'all 250ms ease',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== tab.id) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== tab.id) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <Icon size={16} />
                  {tab.label}
                  
                  {/* Status Indicator */}
                  <div style={{ 
                    marginLeft: 'auto',
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: tab.status === 'configured' ? '#3BE8B0' : tab.status === 'incomplete' ? '#F4B942' : '#FF5A6B',
                  }} />
                </button>
              );
            })}
          </nav>

          {/* Content Area */}
          <div>
            {/* Platform Identity */}
            {activeTab === 'platform' && (
              <div style={{ display: 'grid', gap: 24 }}>
                <SectionTitle 
                  title="Platform Identity" 
                  subtitle="Branding and operational defaults" 
                />
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
                  <MetricCard>
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: 8 }}>
                        Platform Name
                      </label>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>WiBill</div>
                    </div>
                    <button style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid rgba(77,141,255,0.2)',
                      background: 'rgba(77,141,255,0.08)',
                      color: '#4D8DFF',
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}>
                      Edit →
                    </button>
                  </MetricCard>

                  <MetricCard>
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: 8 }}>
                        Support Email
                      </label>
                      <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', wordBreak: 'break-all' }}>support@wibill.io</div>
                    </div>
                    <button style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid rgba(77,141,255,0.2)',
                      background: 'rgba(77,141,255,0.08)',
                      color: '#4D8DFF',
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}>
                      Edit →
                    </button>
                  </MetricCard>

                  <MetricCard>
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: 8 }}>
                        Currency
                      </label>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>KES</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>Kenya Shilling</div>
                    </div>
                    <button style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid rgba(77,141,255,0.2)',
                      background: 'rgba(77,141,255,0.08)',
                      color: '#4D8DFF',
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}>
                      Change →
                    </button>
                  </MetricCard>

                  <MetricCard>
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: 8 }}>
                        Timezone
                      </label>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>UTC+3</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>Africa/Nairobi</div>
                    </div>
                    <button style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid rgba(77,141,255,0.2)',
                      background: 'rgba(77,141,255,0.08)',
                      color: '#4D8DFF',
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}>
                      Change →
                    </button>
                  </MetricCard>
                </div>

                <InfoBox 
                  icon={SettingsIcon}
                  title="Impact"
                  text="These settings affect all financial calculations and ISP communications across the platform"
                />
              </div>
            )}

            {/* Payments */}
            {activeTab === 'payments' && (
              <div style={{ display: 'grid', gap: 24 }}>
                <SectionTitle 
                  title="Payment Infrastructure" 
                  subtitle="M-Pesa integration and settlement" 
                />

                {/* M-Pesa Connection Card */}
                <SectionCard title="M-Pesa Connection">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                    <div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>Status</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background: '#3BE8B0',
                          boxShadow: '0 0 8px rgba(59,232,176,0.6)',
                        }} />
                        <span style={{ fontSize: 14, fontWeight: 600, color: '#3BE8B0' }}>Connected</span>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>Last Sync</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>2 minutes ago</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <button style={{
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: '1px solid rgba(77,141,255,0.2)',
                        background: 'rgba(77,141,255,0.08)',
                        color: '#4D8DFF',
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}>
                        Test Connection →
                      </button>
                    </div>
                  </div>

                  {/* Expandable Credentials */}
                  <button
                    onClick={() => setExpandedConfig(expandedConfig === 'mpesa' ? null : 'mpesa')}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: 10,
                      border: '1px solid rgba(255,255,255,0.06)',
                      background: 'rgba(12,18,42,0.4)',
                      color: expandedConfig === 'mpesa' ? '#4D8DFF' : 'rgba(255,255,255,0.7)',
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 200ms ease',
                    }}
                  >
                    <span>API Credentials</span>
                    <ChevronDown size={14} style={{
                      transform: expandedConfig === 'mpesa' ? 'rotate(180deg)' : 'rotate(0)',
                      transition: 'transform 200ms ease',
                    }} />
                  </button>

                  {expandedConfig === 'mpesa' && (
                    <div style={{ marginTop: 16, display: 'grid', gap: 16 }}>
                      <SecureField
                        label="Consumer Key"
                        value="sk_live_x3c9a2d1f7e4b9c6a"
                        field="mpesa_key"
                        showSecret={showSecretFields['mpesa_key']}
                        onToggle={() => toggleSecretField('mpesa_key')}
                        onCopy={() => handleCopy('sk_live_x3c9a2d1f7e4b9c6a', 'mpesa_key')}
                        copied={copiedField === 'mpesa_key'}
                      />
                      <SecureField
                        label="Consumer Secret"
                        value="sk_live_y7f2b8e4d1c9a3x6k"
                        field="mpesa_secret"
                        showSecret={showSecretFields['mpesa_secret']}
                        onToggle={() => toggleSecretField('mpesa_secret')}
                        onCopy={() => handleCopy('sk_live_y7f2b8e4d1c9a3x6k', 'mpesa_secret')}
                        copied={copiedField === 'mpesa_secret'}
                      />
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: 8 }}>
                          Shortcode
                        </label>
                        <input
                          value="174379"
                          readOnly
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            background: 'rgba(12,18,42,0.6)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 10,
                            color: '#fff',
                            fontSize: 14,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </SectionCard>

                {/* Webhook Card */}
                <SectionCard title="Webhook Configuration">
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: 8 }}>
                      Callback URL
                    </label>
                    <div style={{
                      padding: '10px 14px',
                      background: 'rgba(12,18,42,0.6)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 10,
                      fontFamily: 'monospace',
                      fontSize: 12,
                      color: '#94A3B8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}>
                      <span>https://api.wibill.io/webhooks/mpesa</span>
                      <button
                        onClick={() => handleCopy('https://api.wibill.io/webhooks/mpesa', 'webhook')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: copiedField === 'webhook' ? '#3BE8B0' : '#4D8DFF',
                          cursor: 'pointer',
                          transition: 'color 200ms ease',
                        }}
                      >
                        {copiedField === 'webhook' ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                  
                  <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <MetricChip label="Webhook Health" value="Operational" status="ok" />
                    <MetricChip label="Retry Queue" value="0 pending" status="ok" />
                  </div>
                </SectionCard>

                {/* Settlement Engine */}
                <SectionCard title="Settlement Engine">
                  <div style={{ display: 'grid', gap: 12 }}>
                    <ToggleRow label="Auto Settlement" checked={true} />
                    <ToggleRow label="Enable Retry Logic" checked={true} />
                  </div>
                  <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <MetricChip label="Settlement Window" value="Daily @ 2 AM" status="ok" />
                    <MetricChip label="Retry Policy" value="3 attempts" status="ok" />
                  </div>
                </SectionCard>
              </div>
            )}

            {/* Revenue Rules */}
            {activeTab === 'revenue' && (
              <div style={{ display: 'grid', gap: 24 }}>
                <SectionTitle 
                  title="Revenue Configuration" 
                  subtitle="Earnings, fees, and settlement rules" 
                />

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
                  <MetricCard>
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: 8 }}>
                        Platform Fee
                      </label>
                      <div style={{ fontSize: 32, fontWeight: 900, color: '#F4B942', letterSpacing: '-0.02em' }}>10%</div>
                    </div>
                    <button style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid rgba(244,185,66,0.2)',
                      background: 'rgba(244,185,66,0.08)',
                      color: '#F4B942',
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}>
                      Adjust →
                    </button>
                  </MetricCard>

                  <MetricCard>
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: 8 }}>
                        Min Settlement
                      </label>
                      <div style={{ fontSize: 32, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>KES 500</div>
                    </div>
                    <button style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid rgba(77,141,255,0.2)',
                      background: 'rgba(77,141,255,0.08)',
                      color: '#4D8DFF',
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}>
                      Edit →
                    </button>
                  </MetricCard>

                  <MetricCard>
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: 8 }}>
                        Settlement Schedule
                      </label>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>Daily</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>Processed at 2:00 AM UTC</div>
                    </div>
                    <button style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid rgba(77,141,255,0.2)',
                      background: 'rgba(77,141,255,0.08)',
                      color: '#4D8DFF',
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}>
                      Change →
                    </button>
                  </MetricCard>

                  <MetricCard>
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: 8 }}>
                        Refund Window
                      </label>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>30 days</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>Requires approval</div>
                    </div>
                    <button style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid rgba(77,141,255,0.2)',
                      background: 'rgba(77,141,255,0.08)',
                      color: '#4D8DFF',
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}>
                      Edit →
                    </button>
                  </MetricCard>
                </div>

                {/* Revenue Split Preview */}
                <SectionCard title="Revenue Split Preview">
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 16 }}>
                    How a KES 100,000 transaction is distributed:
                  </p>
                  <div style={{ display: 'grid', gap: 10 }}>
                    <RevenueFlow label="Customer Charge" amount="100,000" color="rgba(77,141,255,0.3)" />
                    <RevenueFlow label="WiBill Platform Fee (10%)" amount="10,000" color="rgba(244,185,66,0.3)" />
                    <RevenueFlow label="ISP Payout (90%)" amount="90,000" color="rgba(59,232,176,0.3)" />
                  </div>
                </SectionCard>

                <InfoBox 
                  icon={Zap}
                  title="Important"
                  text="Revenue configuration changes apply to all new transactions immediately. Existing settled payments are not affected."
                />
              </div>
            )}

            {/* Notifications */}
            {activeTab === 'notifications' && (
              <div style={{ display: 'grid', gap: 24 }}>
                <SectionTitle 
                  title="Notification Center" 
                  subtitle="Configure what alerts you receive" 
                />

                <SectionCard title="Alert Types">
                  <div style={{ display: 'grid', gap: 12 }}>
                    {[
                      { id: 'settlement_delay', label: 'Settlement Delayed', desc: 'When settlement fails or is delayed' },
                      { id: 'payment_failure', label: 'Payment Failure', desc: 'When an ISP payment fails' },
                      { id: 'new_isp', label: 'New ISP Onboarded', desc: 'When a new ISP joins the platform' },
                      { id: 'revenue_spike', label: 'Revenue Spike', desc: 'When revenue exceeds normal levels' },
                      { id: 'weekly_report', label: 'Weekly Summary', desc: 'Get weekly platform reports' },
                    ].map(alert => (
                      <div key={alert.id} style={{
                        padding: '14px 14px',
                        background: 'rgba(12,18,42,0.4)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{alert.label}</div>
                          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>{alert.desc}</div>
                        </div>
                        <input type="checkbox" defaultChecked style={{ cursor: 'pointer', width: 18, height: 18 }} />
                      </div>
                    ))}
                  </div>
                </SectionCard>

                <SectionCard title="Delivery Methods">
                  <div style={{ display: 'grid', gap: 12 }}>
                    {[
                      { id: 'email', label: 'Email Notifications', icon: Mail },
                      { id: 'sms', label: 'SMS Alerts', icon: Smartphone },
                      { id: 'dashboard', label: 'Dashboard Notifications', icon: Bell },
                      { id: 'webhook', label: 'Webhook Delivery', icon: Code },
                    ].map(method => {
                      const Icon = method.icon;
                      return (
                        <div key={method.id} style={{
                          padding: '12px 14px',
                          background: 'rgba(12,18,42,0.4)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          borderRadius: 10,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                        }}>
                          <Icon size={16} style={{ color: '#4D8DFF' }} />
                          <span style={{ fontSize: 13, color: '#fff', flex: 1 }}>{method.label}</span>
                          <input type="checkbox" defaultChecked style={{ cursor: 'pointer', width: 18, height: 18 }} />
                        </div>
                      );
                    })}
                  </div>
                </SectionCard>
              </div>
            )}

            {/* Security */}
            {activeTab === 'security' && (
              <div style={{ display: 'grid', gap: 24 }}>
                <SectionTitle 
                  title="Security Configuration" 
                  subtitle="Protect your mission control" 
                />

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
                  <MetricCard>
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: 8 }}>
                        Two-Factor Authentication
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background: '#3BE8B0',
                        }} />
                        <span style={{ fontSize: 14, fontWeight: 600, color: '#3BE8B0' }}>Enabled</span>
                      </div>
                    </div>
                    <button style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid rgba(77,141,255,0.2)',
                      background: 'rgba(77,141,255,0.08)',
                      color: '#4D8DFF',
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}>
                      Manage →
                    </button>
                  </MetricCard>

                  <MetricCard>
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: 8 }}>
                        Session Timeout
                      </label>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>30 min</div>
                    </div>
                    <button style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid rgba(77,141,255,0.2)',
                      background: 'rgba(77,141,255,0.08)',
                      color: '#4D8DFF',
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}>
                      Adjust →
                    </button>
                  </MetricCard>

                  <MetricCard>
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: 8 }}>
                        Password Rotation
                      </label>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>90 days</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>Required before expiry</div>
                    </div>
                    <button style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid rgba(77,141,255,0.2)',
                      background: 'rgba(77,141,255,0.08)',
                      color: '#4D8DFF',
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}>
                      Change →
                    </button>
                  </MetricCard>

                  <MetricCard>
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: 8 }}>
                        Login History
                      </label>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>3 active</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>sessions</div>
                    </div>
                    <button style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid rgba(77,141,255,0.2)',
                      background: 'rgba(77,141,255,0.08)',
                      color: '#4D8DFF',
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}>
                      View All →
                    </button>
                  </MetricCard>
                </div>

                <SectionCard title="Active Sessions">
                  <div style={{ display: 'grid', gap: 12 }}>
                    {[
                      { browser: 'Chrome', location: 'Nairobi, Kenya', time: 'Now', ip: '196.45.123.45' },
                      { browser: 'Firefox', location: 'Berlin, Germany', time: '2h ago', ip: '185.23.45.67' },
                      { browser: 'Safari', location: 'New York, USA', time: '5h ago', ip: '203.12.34.56' },
                    ].map((session, i) => (
                      <div key={i} style={{
                        padding: '12px 14px',
                        background: 'rgba(12,18,42,0.4)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>
                            {session.browser} on {session.location}
                          </div>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
                            {session.ip} · {session.time}
                          </div>
                        </div>
                        <button style={{
                          padding: '6px 10px',
                          borderRadius: 6,
                          border: '1px solid rgba(255,90,107,0.2)',
                          background: 'rgba(255,90,107,0.08)',
                          color: '#FF5A6B',
                          fontSize: 11,
                          fontWeight: 500,
                          cursor: 'pointer',
                        }}>
                          Revoke
                        </button>
                      </div>
                    ))}
                  </div>
                </SectionCard>

                <SectionCard title="API Key Management">
                  <div style={{
                    padding: '12px 14px',
                    background: 'rgba(12,18,42,0.6)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 10,
                    fontFamily: 'monospace',
                    fontSize: 11,
                    color: '#94A3B8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    marginBottom: 12,
                  }}>
                    <span>wk_live_x3c9a2d1f7e4b9c6a...</span>
                    <button
                      onClick={() => handleCopy('wk_live_x3c9a2d1f7e4b9c6a', 'apikey')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: copiedField === 'apikey' ? '#3BE8B0' : '#4D8DFF',
                        cursor: 'pointer',
                        transition: 'color 200ms ease',
                      }}
                    >
                      {copiedField === 'apikey' ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                  </div>
                  <button style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid rgba(77,141,255,0.2)',
                    background: 'rgba(77,141,255,0.08)',
                    color: '#4D8DFF',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}>
                    Generate New Key →
                  </button>
                </SectionCard>
              </div>
            )}

            {/* Integrations */}
            {activeTab === 'integrations' && (
              <div style={{ display: 'grid', gap: 24 }}>
                <SectionTitle 
                  title="System Integrations" 
                  subtitle="Connected services and webhooks" 
                />

                <div style={{ display: 'grid', gap: 16 }}>
                  {[
                    { name: 'M-Pesa', desc: 'Payment processing', status: 'connected' as const, lastSync: '2 min ago' },
                    { name: 'MikroTik', desc: 'Network device management', status: 'connected' as const, lastSync: '10 min ago' },
                    { name: 'SMTP Server', desc: 'Email delivery', status: 'pending' as const, lastSync: 'Never' },
                    { name: 'RADIUS', desc: 'Network authentication', status: 'disconnected' as const, lastSync: 'N/A' },
                  ].map(integration => (
                    <IntegrationCard
                      key={integration.name}
                      name={integration.name}
                      desc={integration.desc}
                      status={integration.status}
                      lastSync={integration.lastSync}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* System Health */}
            {activeTab === 'health' && (
              <div style={{ display: 'grid', gap: 24 }}>
                <SectionTitle 
                  title="System Health Dashboard" 
                  subtitle="Real-time infrastructure status" 
                />

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                  {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} style={{
                        background: 'rgba(12,18,42,0.4)',
                        borderRadius: 14,
                        padding: 20,
                        height: 120,
                        opacity: 0.5,
                      }} />
                    ))
                  ) : (
                    <>
                      <HealthCard label="API Server" status="ok" detail={`v${health?.version ?? '0.1.0'}`} value="18.24ms" />
                      <HealthCard label="Database" status={health?.database === 'connected' ? 'ok' : 'error'} detail={health?.database ?? 'disconnected'} value="8/16" />
                      <HealthCard label="Environment" status="ok" detail={health?.environment ?? 'production'} value="Stable" />
                      <HealthCard label="M-Pesa Gateway" status="ok" detail="Safaricom connected" value="Sync OK" />
                      <HealthCard label="Webhook Queue" status="ok" detail="Processing" value="3 pending" />
                      <HealthCard label="Disk Usage" status="ok" detail="85% capacity" value="850 GB" />
                    </>
                  )}
                </div>

                <SectionCard title="System Metrics">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                    {[
                      { label: 'API Latency', value: '24ms', trend: '↓ 2ms' },
                      { label: 'Database Connections', value: '8/16', trend: '↑ 1' },
                      { label: 'Cache Hit Rate', value: '94.2%', trend: '↑ 0.5%' },
                      { label: 'Queue Backlog', value: '3 jobs', trend: '↓ 2' },
                    ].map((metric, i) => (
                      <div key={i} style={{
                        padding: '14px',
                        background: 'rgba(12,18,42,0.4)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 10,
                      }}>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
                          {metric.label}
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>
                          {metric.value}
                        </div>
                        <div style={{ fontSize: 11, color: '#3BE8B0', marginTop: 6 }}>
                          {metric.trend}
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              </div>
            )}

            {/* Danger Zone */}
            {activeTab === 'danger' && (
              <div style={{ display: 'grid', gap: 24 }}>
                <SectionTitle 
                  title="Danger Zone" 
                  subtitle="Irreversible actions — proceed with caution" 
                />

                <SectionCard isDanger title="Destructive Operations">
                  <div style={{ display: 'grid', gap: 12 }}>
                    {[
                      { id: 'clear_cache', label: 'Clear Cache', desc: 'Remove all cached data (safe)', critical: false },
                      { id: 'recalc_revenue', label: 'Recalculate Revenue', desc: 'Recalculate all earnings and fees', critical: false },
                      { id: 'export_backup', label: 'Export Full Backup', desc: 'Download all platform data', critical: false },
                      { id: 'revoke_tokens', label: 'Revoke All Tokens', desc: 'Invalidate all API keys and sessions', critical: true },
                      { id: 'reset_platform', label: 'Reset Platform', desc: 'Delete ALL data and reset system', critical: true },
                    ].map(action => (
                      <button
                        key={action.id}
                        onClick={() => setShowDeleteModal(action.id)}
                        style={{
                          padding: '14px 14px',
                          background: action.critical ? 'rgba(255,90,107,0.08)' : 'rgba(12,18,42,0.4)',
                          border: `1px solid ${action.critical ? 'rgba(255,90,107,0.2)' : 'rgba(255,255,255,0.06)'}`,
                          borderRadius: 10,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          transition: 'all 250ms ease',
                          textAlign: 'left',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = action.critical ? 'rgba(255,90,107,0.15)' : 'rgba(12,18,42,0.6)';
                          e.currentTarget.style.transform = 'translateX(4px)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = action.critical ? 'rgba(255,90,107,0.08)' : 'rgba(12,18,42,0.4)';
                          e.currentTarget.style.transform = 'translateX(0)';
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: action.critical ? '#FF5A6B' : '#fff' }}>
                            {action.label}
                          </div>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
                            {action.desc}
                          </div>
                        </div>
                        <AlertTriangle size={16} style={{ color: action.critical ? '#FF5A6B' : '#94A3B8', flexShrink: 0 }} />
                      </button>
                    ))}
                  </div>
                </SectionCard>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Save Button */}
      {hasChanges && (
        <div style={{
          position: 'fixed',
          bottom: 32,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 12,
          zIndex: 40,
        }}>
          <button
            onClick={handleSave}
            style={{
              padding: '14px 28px',
              borderRadius: 12,
              border: 'none',
              background: 'linear-gradient(135deg, #F4B942, #FFD77F)',
              color: '#050816',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 20px 40px rgba(244,185,66,0.3)',
              transition: 'all 250ms ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 28px 56px rgba(244,185,66,0.4)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 20px 40px rgba(244,185,66,0.3)';
            }}
          >
            <Save size={16} />
            Save Changes
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(10,18,40,0.95), rgba(14,22,48,0.85))',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 16,
            padding: 32,
            maxWidth: 400,
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#FF5A6B', margin: '0 0 12px' }}>
              Confirm Action
            </h3>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 24, lineHeight: 1.6 }}>
              This action cannot be undone. Ensure you have a backup before proceeding.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setShowDeleteModal(null)}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#94A3B8',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 200ms ease',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              >
                Cancel
              </button>
              <button
                onClick={() => setShowDeleteModal(null)}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: 10,
                  border: 'none',
                  background: '#FF5A6B',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 200ms ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.opacity = '0.9';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.opacity = '1';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ PRIMITIVE COMPONENTS ============

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 6px' }}>
        {title}
      </h2>
      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
        {subtitle}
      </p>
    </div>
  );
}

function MetricCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      padding: 20,
      background: 'linear-gradient(145deg, rgba(10,18,40,0.95), rgba(14,22,48,0.85))',
      border: '1px solid rgba(255,255,255,0.05)',
      borderRadius: 14,
      backdropFilter: 'blur(18px)',
      transition: 'all 250ms ease',
      cursor: 'pointer',
    }}>
      {children}
    </div>
  );
}

function SectionCard({ title, children, isDanger = false }: { title: string; children: React.ReactNode; isDanger?: boolean }) {
  return (
    <div style={{
      padding: 24,
      background: isDanger ? 'rgba(255,90,107,0.08)' : 'linear-gradient(145deg, rgba(10,18,40,0.95), rgba(14,22,48,0.85))',
      border: isDanger ? '1px solid rgba(255,90,107,0.15)' : '1px solid rgba(255,255,255,0.05)',
      borderRadius: 16,
      backdropFilter: 'blur(18px)',
    }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: isDanger ? '#FF5A6B' : '#fff', margin: '0 0 16px' }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function StatusPill({ icon: Icon, label, status }: { icon: any; label: string; status: 'ok' | 'warning' | 'error' }) {
  const colors = {
    ok: { bg: 'rgba(59,232,176,0.15)', text: '#3BE8B0', border: 'rgba(59,232,176,0.3)' },
    warning: { bg: 'rgba(244,185,66,0.15)', text: '#F4B942', border: 'rgba(244,185,66,0.3)' },
    error: { bg: 'rgba(255,90,107,0.15)', text: '#FF5A6B', border: 'rgba(255,90,107,0.3)' },
  };
  const c = colors[status];

  return (
    <div style={{
      padding: '8px 12px',
      background: c.bg,
      border: `1px solid ${c.border}`,
      borderRadius: 8,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      fontSize: 12,
      fontWeight: 500,
      color: c.text,
    }}>
      <Icon size={14} />
      {label}
    </div>
  );
}

function MetricChip({ label, value, status }: { label: string; value: string; status: 'ok' | 'warning' | 'error' }) {
  const colors = {
    ok: 'rgba(59,232,176,0.15)',
    warning: 'rgba(244,185,66,0.15)',
    error: 'rgba(255,90,107,0.15)',
  };

  return (
    <div style={{
      padding: '10px 12px',
      background: colors[status],
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 10,
    }}>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginTop: 4 }}>{value}</div>
    </div>
  );
}

function SecureField({ 
  label, 
  value, 
  field, 
  showSecret, 
  onToggle, 
  onCopy, 
  copied 
}: { 
  label: string; 
  value: string; 
  field: string; 
  showSecret: boolean; 
  onToggle: () => void; 
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: 8 }}>
        {label}
      </label>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{
          flex: 1,
          padding: '10px 14px',
          background: 'rgba(12,18,42,0.6)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10,
          fontFamily: 'monospace',
          fontSize: 12,
          color: '#94A3B8',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{ flex: 1 }}>
            {showSecret ? value : value?.substring(0, 6) + '•'.repeat(Math.max(0, (value?.length ?? 0) - 6))}
          </span>
          <button
            onClick={onToggle}
            style={{
              background: 'none',
              border: 'none',
              color: '#4D8DFF',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
            }}>
            {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        <button
          onClick={onCopy}
          style={{
            padding: '10px 14px',
            background: 'rgba(12,18,42,0.6)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10,
            color: copied ? '#3BE8B0' : '#4D8DFF',
            cursor: 'pointer',
            transition: 'all 200ms ease',
          }}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  );
}

function ToggleRow({ label, checked }: { label: string; checked: boolean }) {
  return (
    <div style={{
      padding: '12px 14px',
      background: 'rgba(12,18,42,0.4)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 10,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>{label}</div>
      <div style={{
        width: 40,
        height: 22,
        borderRadius: 11,
        background: checked ? '#3BE8B0' : 'rgba(255,255,255,0.1)',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute',
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: '#fff',
          top: 2,
          left: checked ? 20 : 2,
          transition: 'left 200ms ease',
        }} />
      </div>
    </div>
  );
}

function RevenueFlow({ label, amount, color }: { label: string; amount: string; color: string }) {
  return (
    <div style={{
      padding: '12px 14px',
      background: color,
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 10,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{amount}</span>
    </div>
  );
}

function InfoBox({ icon: Icon, title, text }: { icon: any; title: string; text: string }) {
  return (
    <div style={{
      padding: '14px 16px',
      background: 'rgba(77,141,255,0.08)',
      border: '1px solid rgba(77,141,255,0.15)',
      borderRadius: 10,
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
    }}>
      <Icon size={16} style={{ color: '#4D8DFF', flexShrink: 0, marginTop: 2 }} />
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#4D8DFF' }}>{title}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>{text}</div>
      </div>
    </div>
  );
}

function HealthCard({ label, status, detail, value }: { label: string; status: 'ok' | 'error'; detail: string; value: string }) {
  return (
    <div style={{
      padding: '16px',
      background: 'linear-gradient(145deg, rgba(10,18,40,0.95), rgba(14,22,48,0.85))',
      border: status === 'ok' ? '1px solid rgba(59,232,176,0.15)' : '1px solid rgba(255,90,107,0.15)',
      borderRadius: 14,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: status === 'ok' ? '#3BE8B0' : '#FF5A6B',
          boxShadow: `0 0 8px ${status === 'ok' ? 'rgba(59,232,176,0.6)' : 'rgba(255,90,107,0.6)'}`,
        }} />
        <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{label}</div>
      </div>
      <div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>{detail}</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{value}</div>
      </div>
    </div>
  );
}

function IntegrationCard({ name, desc, status, lastSync }: { name: string; desc: string; status: 'connected' | 'pending' | 'disconnected'; lastSync: string }) {
  const colors = {
    connected: { bg: 'rgba(59,232,176,0.08)', border: 'rgba(59,232,176,0.15)', dot: '#3BE8B0', text: '#3BE8B0' },
    pending: { bg: 'rgba(244,185,66,0.08)', border: 'rgba(244,185,66,0.15)', dot: '#F4B942', text: '#F4B942' },
    disconnected: { bg: 'rgba(255,90,107,0.08)', border: 'rgba(255,90,107,0.15)', dot: '#EF4444', text: '#EF4444' },
  };
  const c = colors[status];

  return (
    <div style={{
      padding: '16px',
      background: c.bg,
      border: `1px solid ${c.border}`,
      borderRadius: 14,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{name}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>{desc}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Last Sync</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{lastSync}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: c.dot,
            boxShadow: `0 0 6px ${c.dot}80`,
          }} />
          <span style={{ fontSize: 12, fontWeight: 500, color: c.text, textTransform: 'capitalize' }}>
            {status}
          </span>
        </div>
        <button style={{
          padding: '6px 12px',
          borderRadius: 8,
          border: `1px solid ${c.border}`,
          background: c.bg,
          color: c.text,
          fontSize: 11,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 200ms ease',
        }} onMouseEnter={e => {
          e.currentTarget.style.background = c.border;
          e.currentTarget.style.transform = 'translateY(-2px)';
        }} onMouseLeave={e => {
          e.currentTarget.style.background = c.bg;
          e.currentTarget.style.transform = 'translateY(0)';
        }}>
          Configure →
        </button>
      </div>
    </div>
  );
}