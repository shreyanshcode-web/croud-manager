import React from 'react';

const NAV_ITEMS = [
  { id: 'home',     icon: '🏠', label: 'Home' },
  { id: 'ai',       icon: '✨', label: 'AI Assistant' },
  { id: 'navigate', icon: '🗺️', label: 'Navigate' },
  { id: 'food',     icon: '🍔', label: 'Food & Drinks' },
  { id: 'exit',     icon: '🚗', label: 'Plan Exit' },
];

export default function SideNav({ active, onChange, alertCount }) {
  return (
    <nav className="side-nav" aria-label="Main navigation">
      {/* Logo */}
      <div className="side-nav-logo">
        <div className="side-nav-logo-icon" aria-hidden="true">🏟️</div>
        <div>
          <div className="side-nav-logo-text">SV-Companion</div>
          <div className="side-nav-logo-sub">Event Assistant</div>
        </div>
      </div>

      {/* Nav Items */}
      <div className="side-nav-items" role="list">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            className={`side-nav-item${active === item.id ? ' active' : ''}`}
            onClick={() => onChange(item.id)}
            role="listitem"
            aria-current={active === item.id ? 'page' : undefined}
            aria-label={item.label}
          >
            <span className="side-nav-icon" aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
            {item.id === 'home' && alertCount > 0 && (
              <span className="side-nav-badge" aria-label={`${alertCount} alerts`}>
                {alertCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="side-nav-footer">
        <p className="side-nav-google-badge">
          Powered by<br />
          <span style={{ color: '#4285F4', fontWeight: 700 }}>Google</span>
          {' '}Gemini · Maps · Firestore<br />
          Translation · Analytics · TTS
        </p>
      </div>
    </nav>
  );
}
