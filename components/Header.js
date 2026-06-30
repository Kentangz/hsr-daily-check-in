'use client';

import React from 'react';
import { useToast } from '@/components/Toast';

export default function Header({ showBack = false }) {
  const { showToast } = useToast();

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth', {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast('Logged out successfully', 'success');
        window.location.href = '/login';
      } else {
        showToast('Logout failed', 'error');
      }
    } catch (err) {
      showToast('Connection error during logout', 'error');
    }
  };

  return (
    <header className="header-wrapper">
      <div className="header-container">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {showBack && (
            <a href="/dashboard" className="btn-back" title="Back to Dashboard">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
            </a>
          )}
          <div 
            className="header-logo" 
            onClick={() => { window.location.href = '/dashboard'; }}
          >
            <span>HSR Auto Check-in</span>
            <span className="header-logo-badge">v1.0</span>
          </div>
        </div>
        
        <div className="header-actions">
          <button className="btn btn-danger" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
