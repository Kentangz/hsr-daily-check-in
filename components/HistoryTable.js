'use client';

import React, { useState, useEffect } from 'react';

export default function HistoryTable({ accountId }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchHistory = async () => {
    setLoading(true);
    try {
      // Fetch up to 90 entries (maximum allowed limit)
      const res = await fetch(`/api/history/${accountId}?limit=90`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch (err) {
      console.error('Failed to fetch check-in history', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accountId) {
      fetchHistory();
    }
  }, [accountId]);

  // Pagination calculation
  const totalPages = Math.ceil(history.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = history.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const formatTime = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="glass-panel history-panel" style={{ textAlign: 'center', padding: '40px' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>Loading history log...</p>
      </div>
    );
  }

  return (
    <div className="glass-panel history-panel">
      <h2 style={{ fontSize: '18px', marginBottom: '20px' }}>Check-in History</h2>
      
      {history.length === 0 ? (
        <p style={{ textAlign: 'center', padding: '30px 0', color: 'var(--color-text-muted)', fontSize: '14px' }}>
          No check-in history found for this account.
        </p>
      ) : (
        <>
          <div className="history-table-container">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Status</th>
                  <th>Reward</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((log) => (
                  <tr key={log.id}>
                    <td>{formatDate(log.check_date)}</td>
                    <td style={{ color: 'var(--color-text-muted)' }}>{formatTime(log.created_at)}</td>
                    <td>
                      {log.success ? (
                        <span className="history-status success">● Success</span>
                      ) : (
                        <span className="history-status error">● Failed</span>
                      )}
                    </td>
                    <td>
                      {log.reward_name ? (
                        <div className="history-reward-cell">
                          {log.reward_icon && (
                            <img
                              src={log.reward_icon}
                              alt={log.reward_name}
                              style={{ width: '20px', height: '20px', objectFit: 'contain' }}
                            />
                          )}
                          <span>{log.reward_name} x{log.reward_count}</span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                      )}
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                      {log.message || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination-container">
              <button
                className="btn"
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                Previous
              </button>
              
              {Array.from({ length: totalPages }, (_, index) => (
                <button
                  key={index + 1}
                  className={`btn ${currentPage === index + 1 ? 'btn-primary' : ''}`}
                  onClick={() => handlePageChange(index + 1)}
                  style={{ padding: '6px 12px', fontSize: '12px', minWidth: '32px' }}
                >
                  {index + 1}
                </button>
              ))}

              <button
                className="btn"
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
