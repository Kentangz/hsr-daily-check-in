'use client';

import React from 'react';

export default function Calendar({ logs = [], month, year }) {
  // Determine days in the month
  const numDays = new Date(year, month, 0).getDate();
  // Get starting day index of the month (e.g. 0 = Sunday, 1 = Monday, etc.)
  const startDayIndex = new Date(year, month - 1, 1).getDay();

  // Create formatted month-day mapping for check-ins
  // log check_date format is YYYY-MM-DD
  const logsMap = {};
  logs.forEach(log => {
    if (log.check_date) {
      // Parse year, month, and day number from check_date string (e.g. "2026-06-30")
      const parts = log.check_date.split('-');
      const logYear = parseInt(parts[0], 10);
      const logMonth = parseInt(parts[1], 10);
      const logDay = parseInt(parts[2], 10);

      // Only map logs that match the current month and year being displayed
      if (logYear === year && logMonth === month) {
        // Save status (only true/success overrides failures to prevent mislabeling)
        if (!logsMap[logDay] || log.success) {
          logsMap[logDay] = {
            success: log.success,
            reward_name: log.reward_name,
            reward_icon: log.reward_icon
          };
        }
      }
    }
  });

  const getHoyolabDateParts = () => {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
      });
      const parts = formatter.formatToParts(new Date());
      return {
        year: parseInt(parts.find(p => p.type === 'year').value, 10),
        month: parseInt(parts.find(p => p.type === 'month').value, 10),
        day: parseInt(parts.find(p => p.type === 'day').value, 10)
      };
    } catch (e) {
      const todayObj = new Date();
      return {
        year: todayObj.getFullYear(),
        month: todayObj.getMonth() + 1,
        day: todayObj.getDate()
      };
    }
  };
  const hoyolabToday = getHoyolabDateParts();
  const isCurrentMonth = hoyolabToday.month === month && hoyolabToday.year === year;
  const todayDayNum = hoyolabToday.day;

  // Build grid cells
  const cells = [];
  
  // Empty slots for start of month offset
  for (let i = 0; i < startDayIndex; i++) {
    cells.push(<div key={`empty-${i}`} className="calendar-cell empty" style={{ opacity: 0.2 }}></div>);
  }

  // Days of the month
  for (let day = 1; day <= numDays; day++) {
    const logInfo = logsMap[day];
    let cellClass = 'calendar-cell';
    
    if (logInfo) {
      cellClass += logInfo.success ? ' success' : ' error';
    }
    
    if (isCurrentMonth && day === todayDayNum) {
      cellClass += ' today';
    }

    cells.push(
      <div key={`day-${day}`} className={cellClass}>
        <span className="calendar-cell-num">{day}</span>
        {logInfo && (
          <div className="calendar-cell-status"></div>
        )}
      </div>
    );
  }

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const totalDaysSigned = Object.values(logsMap).filter(l => l.success).length;

  return (
    <div className="glass-panel calendar-panel">
      <div className="calendar-header">
        <h2 style={{ fontSize: '18px' }}>Check-in Calendar</h2>
        <span style={{ fontSize: '14px', color: 'var(--color-success)', fontWeight: '600' }}>
          {totalDaysSigned} / {numDays} Days Checked In
        </span>
      </div>

      <div className="calendar-grid" style={{ marginBottom: '12px' }}>
        {dayLabels.map(label => (
          <div key={label} className="calendar-day-label">
            {label}
          </div>
        ))}
        {cells}
      </div>
      
      <div style={{ display: 'flex', gap: '16px', fontSize: '11px', marginTop: '16px', color: 'var(--color-text-muted)', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-success)', display: 'inline-block', boxShadow: '0 0 8px var(--color-success)' }}></span>
          Success
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-error)', display: 'inline-block' }}></span>
          Failed
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', border: '1px solid var(--color-accent)', borderRadius: '2px', display: 'inline-block' }}></span>
          Today
        </div>
      </div>
    </div>
  );
}
