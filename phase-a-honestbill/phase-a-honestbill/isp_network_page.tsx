'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'pending' | 'active' | 'suspended';
  created_at: string;
  updated_at: string;
}

interface Invite {
  id: string;
  token: string;
  invite_link: string;
  status: 'pending' | 'used' | 'expired';
  expires_at: string;
  created_at: string;
}

export default function ISPNetworkPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'pending' | 'invites'>('active');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copySuccess, setCopySuccess] = useState('');
  const [error, setError] = useState('');

  const token = localStorage.getItem('access_token');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch all tenants
      const tenantsRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/tenants`,
        { headers }
      );
      const tenantData = await tenantsRes.json();
      setTenants(tenantData || []);

      // Fetch invites
      const invitesRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/invites`,
        { headers }
      );
      const inviteData = await invitesRes.json();
      setInvites(inviteData || []);
    } catch (err) {
      setError('Failed to fetch data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const generateInvite = async () => {
    try {
      setGenerating(true);
      setError('');

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/invites/generate`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || 'Failed to generate invite');
        return;
      }

      setInvites([data, ...invites]);
      setCopySuccess(`Invite link copied!`);
      setTimeout(() => setCopySuccess(''), 3000);
    } catch (err) {
      setError('Failed to generate invite');
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess('Copied!');
    setTimeout(() => setCopySuccess(''), 2000);
  };

  const approveTenant = async (tenantId: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/tenants/${tenantId}/approve`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await response.json();

      if (response.ok) {
        setTenants(tenants.map(t => t.id === tenantId ? { ...t, status: 'active' } : t));
        setError('');
      } else {
        setError(data.detail || 'Failed to approve tenant');
      }
    } catch (err) {
      setError('Failed to approve tenant');
      console.error(err);
    }
  };

  const rejectTenant = async (tenantId: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/tenants/${tenantId}/reject`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await response.json();

      if (response.ok) {
        setTenants(tenants.map(t => t.id === tenantId ? { ...t, status: 'suspended' } : t));
        setError('');
      } else {
        setError(data.detail || 'Failed to reject tenant');
      }
    } catch (err) {
      setError('Failed to reject tenant');
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
          <p className="mt-4 text-gray-600">Loading ISP Network...</p>
        </div>
      </div>
    );
  }

  const activeTenants = tenants.filter(t => t.status === 'active');
  const pendingTenants = tenants.filter(t => t.status === 'pending');
  const pendingCount = pendingTenants.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ISP Network</h1>
          <p className="text-gray-600 mt-1">Manage ISPs, invites, and approvals</p>
        </div>
        <button
          onClick={generateInvite}
          disabled={generating}
          className="bg-yellow-400 text-gray-900 px-6 py-3 rounded-lg font-semibold hover:bg-yellow-500 transition disabled:opacity-50"
        >
          {generating ? 'Generating...' : '+ Generate Invite'}
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 flex gap-8">
        <button
          onClick={() => setActiveTab('active')}
          className={`py-3 px-1 border-b-2 font-semibold transition ${
            activeTab === 'active'
              ? 'border-yellow-400 text-yellow-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Active ISPs
          <span className="ml-2 bg-gray-200 text-gray-900 px-2 py-1 rounded-full text-sm">
            {activeTenants.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`py-3 px-1 border-b-2 font-semibold transition relative ${
            activeTab === 'pending'
              ? 'border-yellow-400 text-yellow-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Pending Approval
          {pendingCount > 0 && (
            <span className="ml-2 bg-red-500 text-white px-2 py-1 rounded-full text-sm font-bold">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('invites')}
          className={`py-3 px-1 border-b-2 font-semibold transition ${
            activeTab === 'invites'
              ? 'border-yellow-400 text-yellow-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Invite Links
          <span className="ml-2 bg-gray-200 text-gray-900 px-2 py-1 rounded-full text-sm">
            {invites.filter(i => i.status === 'pending').length}
          </span>
        </button>
      </div>

      {/* ACTIVE ISPS */}
      {activeTab === 'active' && (
        <div className="space-y-4">
          {activeTenants.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <p className="text-gray-600">No active ISPs yet.</p>
              <p className="text-gray-500 text-sm mt-2">Generate invites to onboard ISPs.</p>
            </div>
          ) : (
            activeTenants.map(tenant => (
              <div key={tenant.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:border-yellow-400 transition">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900">{tenant.name}</h3>
                    <p className="text-gray-600 text-sm mt-1">{tenant.email}</p>
                    <p className="text-gray-500 text-sm">{tenant.phone}</p>
                    <div className="mt-3">
                      <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                        ✓ Active
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500 text-xs">Joined</p>
                    <p className="text-gray-900 font-semibold">
                      {new Date(tenant.created_at).toLocaleDateString()}
                    </p>
                    <Link
                      href={`/admin/isp/${tenant.id}`}
                      className="text-yellow-600 font-semibold text-sm mt-3 block hover:underline"
                    >
                      View Details →
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* PENDING APPROVAL */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          {pendingTenants.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <p className="text-gray-600">No pending approvals.</p>
              <p className="text-gray-500 text-sm mt-2">All ISPs are approved or no applications yet.</p>
            </div>
          ) : (
            pendingTenants.map(tenant => (
              <div key={tenant.id} className="bg-yellow-50 rounded-lg border border-yellow-200 p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900">{tenant.name}</h3>
                    <p className="text-gray-600 text-sm mt-1">{tenant.email}</p>
                    <p className="text-gray-500 text-sm">{tenant.phone}</p>
                    <div className="mt-3">
                      <span className="inline-block bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-semibold">
                        ⏳ Pending Review
                      </span>
                    </div>
                  </div>
                  <div className="text-right space-y-2">
                    <button
                      onClick={() => approveTenant(tenant.id)}
                      className="block w-full bg-green-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-600 transition text-sm"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => rejectTenant(tenant.id)}
                      className="block w-full bg-red-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-600 transition text-sm"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* INVITE LINKS */}
      {activeTab === 'invites' && (
        <div className="space-y-4">
          {invites.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <p className="text-gray-600">No invite links generated yet.</p>
              <p className="text-gray-500 text-sm mt-2">Click the button above to create one.</p>
            </div>
          ) : (
            invites.map(invite => (
              <div key={invite.id} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <p className="text-gray-600 text-sm font-semibold mb-2">Invite Link</p>
                    <p className="font-mono text-sm bg-gray-100 p-3 rounded break-all">
                      {invite.invite_link}
                    </p>
                    <div className="mt-3 space-y-1">
                      <p className="text-gray-600 text-sm">
                        Status:{' '}
                        <span className={`font-semibold ${
                          invite.status === 'pending' ? 'text-yellow-600' :
                          invite.status === 'used' ? 'text-green-600' :
                          'text-red-600'
                        }`}>
                          {invite.status.toUpperCase()}
                        </span>
                      </p>
                      <p className="text-gray-600 text-sm">
                        Expires: {new Date(invite.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(invite.invite_link)}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-600 transition whitespace-nowrap"
                  >
                    {copySuccess === 'Copied!' ? '✓ Copied' : 'Copy Link'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
