/**
 * Settings Page
 * System configuration and preferences
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    theme: 'dark',
    updateInterval: 3000,
    maxAlerts: 50,
    enableNotifications: true,
  });
  // FIX #7: Replace blocking browser alert() with inline toast state
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem('smartvenue-settings', JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div style={{ background: '#0A0A0A', color: '#EDEDED', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* FIX #7: Inline toast banner instead of browser alert() */}
      {saved && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          padding: '12px 24px',
          background: '#10B981',
          color: '#0A0A0A',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '12px',
          fontWeight: 700,
          zIndex: 9999,
          letterSpacing: '1px',
        }}>
          ✓ SETTINGS SAVED
        </div>
      )}
      {/* HEADER */}
      <div style={{ padding: '20px 32px', borderBottom: '2px solid #1A1A1A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }}>
            SETTINGS
          </div>
          <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
            System configuration
          </div>
        </div>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '8px 16px',
            background: 'transparent',
            border: '1px solid #1A1A1A',
            color: '#EDEDED',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '11px',
            cursor: 'pointer',
            transition: 'all 150ms linear',
          }}
          onMouseEnter={(e) => {
            e.target.style.borderColor = '#00E0FF';
            e.target.style.color = '#00E0FF';
          }}
          onMouseLeave={(e) => {
            e.target.style.borderColor = '#1A1A1A';
            e.target.style.color = '#EDEDED';
          }}
        >
          ← HOME
        </button>
      </div>

      {/* CONTENT */}
      <div style={{ flex: 1, overflow: 'auto', padding: '32px', maxWidth: '800px' }}>
        {/* DISPLAY SETTINGS */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px', fontFamily: "'Space Grotesk', sans-serif" }}>
            DISPLAY
          </div>
          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ padding: '16px', border: '1px solid #1A1A1A' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.enableNotifications}
                  onChange={(e) => setSettings({ ...settings, enableNotifications: e.target.checked })}
                  style={{ cursor: 'pointer' }}
                />
                Enable Notifications
              </label>
            </div>
          </div>
        </div>

        {/* PERFORMANCE SETTINGS */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px', fontFamily: "'Space Grotesk', sans-serif" }}>
            PERFORMANCE
          </div>
          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ padding: '16px', border: '1px solid #1A1A1A' }}>
              <label style={{ fontSize: '11px', color: '#6B7280', display: 'block', marginBottom: '8px' }}>
                Update Interval (ms)
              </label>
              <input
                type="number"
                value={settings.updateInterval}
                onChange={(e) => setSettings({ ...settings, updateInterval: Number(e.target.value) })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: '#1A1A1A',
                  border: '1px solid #1A1A1A',
                  color: '#EDEDED',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '12px',
                }}
              />
            </div>

            <div style={{ padding: '16px', border: '1px solid #1A1A1A' }}>
              <label style={{ fontSize: '11px', color: '#6B7280', display: 'block', marginBottom: '8px' }}>
                Max Alerts to Display
              </label>
              <input
                type="number"
                value={settings.maxAlerts}
                onChange={(e) => setSettings({ ...settings, maxAlerts: Number(e.target.value) })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: '#1A1A1A',
                  border: '1px solid #1A1A1A',
                  color: '#EDEDED',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '12px',
                }}
              />
            </div>
          </div>
        </div>

        {/* SYSTEM INFO */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px', fontFamily: "'Space Grotesk', sans-serif" }}>
            SYSTEM INFO
          </div>
          <div style={{ display: 'grid', gap: '12px' }}>
            <div style={{ padding: '12px', border: '1px solid #1A1A1A', fontSize: '11px' }}>
              <div style={{ color: '#6B7280', marginBottom: '4px' }}>Version</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace" }}>1.0.0</div>
            </div>
            <div style={{ padding: '12px', border: '1px solid #1A1A1A', fontSize: '11px' }}>
              <div style={{ color: '#6B7280', marginBottom: '4px' }}>API Endpoint</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace" }}>/api/v1</div>
            </div>
            <div style={{ padding: '12px', border: '1px solid #1A1A1A', fontSize: '11px' }}>
              <div style={{ color: '#6B7280', marginBottom: '4px' }}>Last Updated</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace" }}>{new Date().toISOString()}</div>
            </div>
          </div>
        </div>

        {/* ACTIONS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <button
            onClick={handleSave}
            style={{
              padding: '12px 24px',
              background: '#00E0FF',
              color: '#0A0A0A',
              border: 'none',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 150ms linear',
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#FF3B3B';
              e.target.style.color = '#EDEDED';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = '#00E0FF';
              e.target.style.color = '#0A0A0A';
            }}
          >
            SAVE SETTINGS
          </button>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '12px 24px',
              background: 'transparent',
              border: '1px solid #1A1A1A',
              color: '#EDEDED',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 150ms linear',
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = '#00E0FF';
              e.target.style.color = '#00E0FF';
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = '#1A1A1A';
              e.target.style.color = '#EDEDED';
            }}
          >
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
}
