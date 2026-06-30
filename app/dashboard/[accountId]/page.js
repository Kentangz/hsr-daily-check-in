'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Header from '@/components/Header';
import Calendar from '@/components/Calendar';
import RewardList from '@/components/RewardList';
import HistoryTable from '@/components/HistoryTable';
import { useToast } from '@/components/Toast';

export default function AccountDetailPage() {
  const params = useParams();
  const accountId = params?.accountId;
  const [account, setAccount] = useState(null);
  const [signInfo, setSignInfo] = useState(null);
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const { showToast } = useToast();

  const fetchDetailPageData = async () => {
    setLoading(true);
    try {
      // 1. Fetch account info by querying all accounts and matching
      const accRes = await fetch('/api/accounts');
      if (!accRes.ok) {
        if (accRes.status === 401) {
          window.location.href = '/login';
          return;
        }
        throw new Error('Failed to fetch accounts list');
      }
      const accData = await accRes.json();
      const currentAccount = accData.accounts.find(a => a.id === accountId);
      
      if (!currentAccount) {
        throw new Error('Account not found');
      }
      setAccount(currentAccount);

      // 2. Fetch live sign info from HoYoLAB
      try {
        const statusRes = await fetch(`/api/status/${accountId}`);
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          setSignInfo(statusData);
        } else {
          const statusData = await statusRes.json();
          showToast(`HoYoLAB Status: ${statusData.error || 'Failed to fetch status'}`, 'error');
        }
      } catch (hError) {
        showToast('Failed to connect to HoYoLAB API', 'error');
      }

      // 3. Fetch monthly rewards calendar
      try {
        const rewardsRes = await fetch('/api/rewards');
        if (rewardsRes.ok) {
          const rewardsData = await rewardsRes.json();
          setRewards(rewardsData.rewards || []);
        }
      } catch (rError) {
        showToast('Failed to fetch monthly rewards list', 'error');
      }

    } catch (err) {
      showToast(err.message || 'Error loading account details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accountId) {
      fetchDetailPageData();
    }
  }, [accountId]);

  // Handle auto check-in toggle
  const handleToggleAuto = async () => {
    if (!account || toggling) return;
    setToggling(true);
    
    const newStatus = !account.auto_checkin;
    try {
      const res = await fetch(`/api/accounts/${accountId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto_checkin: newStatus })
      });
      
      const data = await res.json();
      if (res.ok) {
        setAccount(prev => ({ ...prev, auto_checkin: data.account.auto_checkin }));
        showToast(`Auto check-in turned ${newStatus ? 'ON' : 'OFF'}`, 'success');
      } else {
        showToast(data.error || 'Failed to toggle auto check-in', 'error');
      }
    } catch (err) {
      showToast('Connection error', 'error');
    } finally {
      setToggling(false);
    }
  };

  // Get current month details for calendar
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  // Get history logs to pass as events to Calendar (we can fetch it on mount)
  const [logs, setLogs] = useState([]);
  const fetchLogsForCalendar = async () => {
    try {
      const res = await fetch(`/api/history/${accountId}?limit=90`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.history || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (accountId) {
      fetchLogsForCalendar();
    }
  }, [accountId]);

  if (loading) {
    return (
      <div>
        <Header showBack={true} />
        <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--color-text-muted)' }}>
          <img src="/honkai-star-rail-hsr.gif" alt="Loading..." style={{ width: '50px', height: '50px', display: 'block', margin: '0 auto 8px' }} />
          <p>Loading trailblazer details...</p>
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div>
        <Header showBack={true} />
        <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--color-error)' }}>
          <h3>Account Not Found</h3>
          <p style={{ marginTop: '8px' }}>The account you are trying to view does not exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header showBack={true} />
      
      <main className="app-container">
        <div className="detail-header">
          <div>
            <h1 style={{ fontSize: '28px', marginBottom: '4px' }}>{account.nickname}</h1>
            {signInfo && (
              <p className="dashboard-subtitle" style={{ fontSize: '13px' }}>
                Server: <span style={{ fontFamily: 'monospace' }}>{signInfo.region}</span>
              </p>
            )}
          </div>
          
          <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 20px', borderRadius: '12px' }}>
            <span style={{ fontSize: '14px', fontWeight: '500' }}>Auto Check-in</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={account.auto_checkin}
                onChange={handleToggleAuto}
                disabled={toggling}
              />
              <span className="slider"></span>
            </label>
          </div>
        </div>

        <div className="detail-main-grid">
          <Calendar
            logs={logs}
            month={currentMonth}
            year={currentYear}
          />
          
          <RewardList
            rewards={rewards}
            totalSignDay={signInfo ? signInfo.total_sign_day : 0}
            isSign={signInfo ? signInfo.is_sign : false}
          />
        </div>

        <HistoryTable accountId={accountId} />
      </main>
    </div>
  );
}
