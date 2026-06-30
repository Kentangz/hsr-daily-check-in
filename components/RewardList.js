'use client';

import React, { useEffect, useRef } from 'react';

export default function RewardList({ rewards = [], totalSignDay = 0, isSign = false }) {
  const activeRowRef = useRef(null);
  
  const todayDay = isSign ? totalSignDay : totalSignDay + 1;

  // Auto scroll to the current day reward row on render
  useEffect(() => {
    if (activeRowRef.current) {
      activeRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [rewards, totalSignDay, isSign]);

  return (
    <div className="glass-panel reward-panel" style={{ height: '100%' }}>
      <h2 style={{ fontSize: '18px', marginBottom: '20px' }}>Monthly Rewards</h2>
      
      <div className="reward-scroll-container">
        {rewards.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-muted)', fontSize: '13px' }}>
            No reward items loaded.
          </p>
        ) : (
          rewards.map((reward) => {
            const isClaimed = reward.day <= totalSignDay;
            const isToday = reward.day === todayDay;
            
            let rowClass = 'reward-item-row';
            if (isClaimed) rowClass += ' claimed';
            if (isToday) rowClass += ' highlight';

            return (
              <div
                key={reward.day}
                className={rowClass}
                ref={isToday ? activeRowRef : null}
              >
                <div className="reward-item-left">
                  <span className="reward-day-tag">Day {reward.day}</span>
                  {reward.icon && (
                    <img
                      src={reward.icon}
                      alt={reward.name}
                      style={{ width: '28px', height: '28px', objectFit: 'contain' }}
                    />
                  )}
                  <span className="reward-item-name">{reward.name}</span>
                </div>
                <span className="reward-item-count">
                  {isClaimed ? '✓' : `x${reward.count}`}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
