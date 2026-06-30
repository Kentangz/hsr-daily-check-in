'use client';

import React, { useState } from 'react';

export default function AddAccountModal({ isOpen, onClose, onSubmit }) {
  const [nickname, setNickname] = useState('');
  const [ltuid, setLtuid] = useState('');
  const [ltoken, setLtoken] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nickname.trim() || !ltuid.trim() || !ltoken.trim()) {
      alert('All fields are required');
      return;
    }

    setSubmitting(true);
    const success = await onSubmit({
      nickname: nickname.trim(),
      ltuid_v2: ltuid.trim(),
      ltoken_v2: ltoken.trim()
    });

    setSubmitting(false);
    if (success) {
      setNickname('');
      setLtuid('');
      setLtoken('');
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="glass-panel modal-content" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Add HoYoLAB Account</h2>
          <button className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal-instructions">
          <strong>How to get cookies:</strong>
          <ol>
            <li>Go to <a href="https://www.hoyolab.com" target="_blank" rel="noopener noreferrer">hoyolab.com</a> and login.</li>
            <li>Press <code>F12</code> or Right-click → Inspect to open DevTools.</li>
            <li>Go to the <code>Application</code> (Chrome) or <code>Storage</code> (Firefox) tab.</li>
            <li>Expand <code>Cookies</code> and select <code>https://www.hoyolab.com</code>.</li>
            <li>Find and copy the values of <code>ltuid_v2</code> and <code>ltoken_v2</code>.</li>
          </ol>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="nickname">
              Nickname
            </label>
            <input
              id="nickname"
              type="text"
              className="form-input"
              placeholder="e.g. Main Account"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              required
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="ltuid">
              ltuid_v2
            </label>
            <input
              id="ltuid"
              type="text"
              className="form-input"
              placeholder="e.g. 12345678"
              value={ltuid}
              onChange={(e) => setLtuid(e.target.value)}
              required
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="ltoken">
              ltoken_v2
            </label>
            <input
              id="ltoken"
              type="text"
              className="form-input"
              placeholder="e.g. v2_CA..."
              value={ltoken}
              onChange={(e) => setLtoken(e.target.value)}
              required
              disabled={submitting}
            />
          </div>

          <div className="modal-footer">
            <button 
              type="button" 
              className="btn" 
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Verifying & Saving...' : 'Save Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
