import React from 'react';

const TABS = [
  { id: 'home',     icon: '🏟️', label: 'Home' },
  { id: 'ai',       icon: '✨', label: 'AI Help' },
  { id: 'navigate', icon: '🗺️', label: 'Navigate' },
  { id: 'food',     icon: '🍔', label: 'Food' },
  { id: 'exit',     icon: '🚗', label: 'Exit' },
];

export default function BottomNav({ active, onChange, alertCount = 0 }) {
  return (
    <nav className="bottom-nav" role="navigation" aria-label="Main navigation">
      {TABS.map(tab => (
        <button
          key={tab.id}
          className={`nav-item${active === tab.id ? ' active' : ''}`}
          onClick={() => onChange(tab.id)}
          aria-label={tab.label}
          aria-current={active === tab.id ? 'page' : undefined}
        >
          <div style={{ position: 'relative' }}>
            <span className="nav-icon" role="img" aria-hidden="true">{tab.icon}</span>
            {tab.id === 'home' && alertCount > 0 && (
              <span className="nav-dot" aria-label={`${alertCount} alerts`} />
            )}
          </div>
          <span className="nav-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
