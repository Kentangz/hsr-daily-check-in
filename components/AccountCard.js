'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function AccountCard({ account, onToggle, onDelete, onCheckin }) {
  const router = useRouter();
  
  // Get current date string in UTC+8 timezone (Asia/Shanghai) to align with HoYoLAB server reset
  const getHoyolabTodayStr = () => {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      const parts = formatter.formatToParts(new Date());
      const year = parts.find(p => p.type === 'year').value;
      const month = parts.find(p => p.type === 'month').value;
      const day = parts.find(p => p.type === 'day').value;
      return `${year}-${month}-${day}`;
    } catch (e) {
      return new Date().toISOString().split('T')[0];
    }
  };

  const todayStr = getHoyolabTodayStr();
  
  const lastCheckin = account.last_checkin;
  const isToday = lastCheckin && lastCheckin.date === todayStr;
  const isSuccessToday = isToday && lastCheckin.success;
  const isFailedToday = isToday && !lastCheckin.success;
  
  let statusBadge = <span className="card-badge pending">Pending</span>;
  let cardClass = 'glass-panel account-card';
  
  if (isSuccessToday) {
    statusBadge = <span className="card-badge success">✅ Done</span>;
    cardClass += ' success-border';
  } else if (isFailedToday) {
    statusBadge = <span className="card-badge error">⚠️ Failed</span>;
    cardClass += ' error-border';
  }

  return (
    <div className={cardClass}>
      <div className="card-header">
        <div className="card-info">
          <h3 className="card-nickname">{account.nickname}</h3>
          <div>{statusBadge}</div>
        </div>
        <div className="card-toggle">
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Auto</span>
          <label className="switch">
            <input
              type="checkbox"
              checked={account.auto_checkin}
              onChange={() => onToggle(account.id, !account.auto_checkin)}
            />
            <span className="slider"></span>
          </label>
        </div>
      </div>

      <div className="card-status-body">
        {lastCheckin && lastCheckin.reward_name ? (
          <>
            <div className="reward-icon-container">
              {lastCheckin.reward_icon ? (
                <img
                  src={lastCheckin.reward_icon}
                  alt={lastCheckin.reward_name}
                  style={{ width: '36px', height: '36px', objectFit: 'contain' }}
                />
              ) : (
                <span style={{ fontSize: '20px' }}>🎁</span>
              )}
            </div>
            <div className="reward-info-text">
              <span className="reward-title">
                {isToday ? 'Today\'s Reward' : 'Last Reward'}
              </span>
              <span className="reward-value">
                {lastCheckin.reward_name} x{lastCheckin.reward_count}
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="reward-icon-container">
              <span style={{ fontSize: '20px' }}>⏳</span>
            </div>
            <div className="reward-info-text">
              <span className="reward-title">Status</span>
              <span className="reward-value">No check-in history</span>
            </div>
          </>
        )}
      </div>

      <div className="card-footer">
        <button
          className="btn btn-primary"
          style={{ flex: 2 }}
          onClick={() => onCheckin(account.id)}
          disabled={isSuccessToday}
        >\n          {isSuccessToday ? 'Checked In' : 'Check-in'}\n        </button>
        <button
          className="btn"
          style={{ flex: 1.5 }}
          onClick={() => router.push(`/dashboard/${account.id}`)}
        >
          Details
        </button>
        <button
          className="btn btn-danger"
          style={{ flex: 0.5, minWidth: '40px', padding: '10px 0' }}
          onClick={() => {
            if (confirm(`Are you sure you want to delete account "${account.nickname}"?`)) {
              onDelete(account.id);
            }
          }}
        >
          🗑️
        </button>
      </div>
    </div>
  );
}
