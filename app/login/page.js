'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!password) {
      showToast('Please enter the password', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password })
      });

      const data = await res.json();

      if (res.ok) {
        showToast('Login successful!', 'success');
        // Use window.location to force cookie refresh and layout state update
        window.location.href = '/dashboard';
      } else {
        showToast(data.error || 'Invalid password', 'error');
      }
    } catch (err) {
      showToast('Connection error. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="glass-panel auth-card">
        <div className="auth-header">
          <h1 className="auth-logo">HSR Auto Check-in</h1>
          <p className="auth-subtitle">Enter password to access dashboard</p>
        </div>
        
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label" htmlFor="password-input">
              Password
            </label>
            <input
              id="password-input"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>
          
          <button
            type="submit"
            className="btn btn-primary pulse-animation"
            style={{ width: '100%', marginTop: '8px' }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
