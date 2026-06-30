'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import AccountCard from '@/components/AccountCard';
import AddAccountModal from '@/components/AddAccountModal';
import { useToast } from '@/components/Toast';

export default function DashboardPage() {
  const [accounts, setAccounts] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [checkingAll, setCheckingAll] = useState(false);
  const { showToast } = useToast();

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch all accounts
      const res = await fetch('/api/accounts');
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = '/login';
          return;
        }
        throw new Error('Failed to fetch accounts');
      }
      const data = await res.json();
      const accountsList = data.accounts || [];
      setAccounts(accountsList);

      // 2. Fetch history for each account to construct Recent Activity
      if (accountsList.length > 0) {
        const historyPromises = accountsList.map(async (acc) => {
          try {
            const hRes = await fetch(`/api/history/${acc.id}?limit=5`);
            if (hRes.ok) {
              const hData = await hRes.json();
              return (hData.history || []).map(log => ({
                ...log,
                nickname: acc.nickname
              }));
            }
          } catch (err) {
            console.error(`Failed to fetch history for ${acc.nickname}`, err);
          }
          return [];
        });

        const allHistories = await Promise.all(historyPromises);
        const mergedActivities = allHistories
          .flat()
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 10); // Display top 10 recent activities
        
        setActivities(mergedActivities);
      } else {
        setActivities([]);
      }
    } catch (err) {
      showToast(err.message || 'Error loading dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Handle auto check-in toggle
  const handleToggleAuto = async (accountId, newStatus) => {
    try {
      const res = await fetch(`/api/accounts/${accountId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto_checkin: newStatus })
      });
      
      const data = await res.json();
      if (res.ok) {
        setAccounts(prev => 
          prev.map(acc => acc.id === accountId ? { ...acc, auto_checkin: data.account.auto_checkin } : acc)
        );
        showToast(`Auto check-in turned ${newStatus ? 'ON' : 'OFF'}`, 'success');
      } else {
        showToast(data.error || 'Failed to toggle auto check-in', 'error');
      }
    } catch (err) {
      showToast('Connection error', 'error');
    }
  };

  // Handle account deletion
  const handleDeleteAccount = async (accountId) => {
    try {
      const res = await fetch(`/api/accounts/${accountId}`, {
        method: 'DELETE'
      });
      
      const data = await res.json();
      if (res.ok) {
        showToast('Account deleted successfully', 'success');
        fetchDashboardData();
      } else {
        showToast(data.error || 'Failed to delete account', 'error');
      }
    } catch (err) {
      showToast('Connection error', 'error');
    }
  };

  // Handle adding new account
  const handleAddAccount = async (accountData) => {
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accountData)
      });
      
      const data = await res.json();
      if (res.ok) {
        showToast(`Account "${accountData.nickname}" added successfully!`, 'success');
        fetchDashboardData();
        return true;
      } else {
        showToast(data.error || 'Failed to add account. Check credentials.', 'error');
        return false;
      }
    } catch (err) {
      showToast('Connection error', 'error');
      return false;
    }
  };

  // Handle single manual check-in
  const handleCheckinSingle = async (accountId) => {
    showToast('Executing check-in...', 'info');
    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId })
      });
      
      const data = await res.json();
      if (res.ok && data.results && data.results.length > 0) {
        const result = data.results[0];
        if (result.success) {
          if (result.message.includes('Already')) {
            showToast(`${result.nickname}: Already checked in today.`, 'info');
          } else {
            showToast(`${result.nickname}: Check-in successful!`, 'success');
          }
        } else {
          showToast(`${result.nickname}: Check-in failed: ${result.message}`, 'error');
        }
        fetchDashboardData();
      } else {
        showToast(data.error || 'Check-in execution failed', 'error');
      }
    } catch (err) {
      showToast('Connection error', 'error');
    }
  };

  // Handle batch manual check-in for all accounts
  const handleCheckinAll = async () => {
    const activeAccounts = accounts.filter(a => a.auto_checkin);
    if (activeAccounts.length === 0) {
      showToast('No active accounts with Auto Check-in enabled', 'info');
      return;
    }

    setCheckingAll(true);
    showToast('Executing check-in for all accounts...', 'info');
    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: 'all' })
      });
      
      const data = await res.json();
      if (res.ok && data.results) {
        let successCount = 0;
        let alreadyCount = 0;
        let failCount = 0;

        data.results.forEach(result => {
          if (result.success) {
            if (result.message.includes('Already')) {
              alreadyCount++;
            } else {
              successCount++;
            }
          } else {
            failCount++;
          }
        });

        if (successCount > 0) {
          showToast(`Successfully checked in ${successCount} account(s)!`, 'success');
        }
        if (alreadyCount > 0) {
          showToast(`${alreadyCount} account(s) were already checked in today.`, 'info');
        }
        if (failCount > 0) {
          showToast(`Failed check-in for ${failCount} account(s).`, 'error');
        }
        fetchDashboardData();
      } else {
        showToast(data.error || 'Batch check-in failed', 'error');
      }
    } catch (err) {
      showToast('Connection error', 'error');
    } finally {
      setCheckingAll(false);
    }
  };

  // Format date helper
  const formatTime = (isoString) => {
    const d = new Date(isoString);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const formatDateLabel = (isoString) => {
    const d = new Date(isoString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (d.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (d.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div>
      <Header />
      <main className="app-container">
        <div className="dashboard-actions-bar">
          <div className="dashboard-title-section">
            <h1 style={{ fontSize: '28px', marginBottom: '4px' }}>Accounts</h1>
            <p className="dashboard-subtitle">Manage daily check-ins and logs</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              className="btn btn-success" 
              onClick={handleCheckinAll}
              disabled={checkingAll || loading || accounts.length === 0}
            >
              🔄 {checkingAll ? 'Checking...' : 'Check-in All'}
            </button>
            <button 
              className="btn btn-primary" 
              onClick={() => setShowAddModal(true)}
              disabled={checkingAll}
            >
              ➕ Add Account
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-muted)' }}>
            <img src="/honkai-star-rail-hsr.gif" alt="Loading..." style={{ width: '50px', height: '50px', display: 'block', margin: '0 auto 8px' }} />
            <p>Loading trailblazers...</p>
          </div>
        ) : accounts.length === 0 ? (
          <div className="glass-panel empty-state" style={{ marginBottom: '40px' }}>
            <div className="empty-state-icon">🚀</div>
            <h3>No Accounts Found</h3>
            <p style={{ marginTop: '8px', marginBottom: '20px', color: 'var(--color-text-muted)' }}>
              Get started by adding your first Honkai Star Rail HoYoLAB account.
            </p>
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
              Add Account
            </button>
          </div>
        ) : (
          <div className="account-grid">
            {accounts.map(acc => (
              <AccountCard
                key={acc.id}
                account={acc}
                onToggle={handleToggleAuto}
                onDelete={handleDeleteAccount}
                onCheckin={handleCheckinSingle}
              />
            ))}
          </div>
        )}

        <section className="glass-panel recent-activity-section">
          <h2 className="section-title">
            <span>📋</span> Recent Activity
          </h2>
          {activities.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-muted)', fontSize: '14px' }}>
              No check-in actions recorded yet.
            </p>
          ) : (
            <div className="activity-list">
              {activities.map((act) => (
                <div className="activity-item" key={act.id}>
                  <div className="activity-left">
                    <span className={`status-dot ${act.success ? 'success' : 'error'}`}></span>
                    <span className="activity-time">
                      {formatDateLabel(act.created_at)} at {formatTime(act.created_at)}
                    </span>
                    <span className="activity-name">{act.nickname}</span>
                  </div>
                  <span className="activity-status-text">
                    {act.success ? (
                      <span style={{ color: 'var(--color-success)' }}>
                        ✅ {act.reward_name ? `${act.reward_name} x${act.reward_count}` : act.message}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--color-error)' }}>
                        ❌ {act.message || 'Check-in failed'}
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <AddAccountModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddAccount}
      />
    </div>
  );
}
