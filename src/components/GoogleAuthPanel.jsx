import React from 'react';
import { FiLock, FiLogIn, FiLogOut, FiShield } from 'react-icons/fi';
import { useGoogleIdentity } from '../hooks/useGoogleIdentity';

export default function GoogleAuthPanel({ onContinue }) {
  const { user, status, error, clientIdConfigured, promptSignIn, signOut } = useGoogleIdentity();

  return (
    <div
      className="glass-card"
      style={{
        background: 'rgba(15, 22, 41, 0.62)',
        border: '1px solid rgba(255,255,255,0.12)',
      }}
    >
      <div className="glass-card-header">
        <div className="glass-card-title"><FiLock /> Operator Verification</div>
        <div className="glass-card-subtitle">Secure Multi-Vector Credential Sync</div>
      </div>

      <div style={{ display: 'grid', gap: '12px' }}>
        {user ? (
          <div className="queue-card" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {user.picture ? (
              <img
                src={user.picture}
                alt={user.name}
                style={{ width: '46px', height: '46px', borderRadius: '999px', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ width: '46px', height: '46px', borderRadius: '999px', background: 'rgba(59,130,246,0.18)', display: 'grid', placeItems: 'center', fontWeight: 700 }}>
                {user.name?.[0] || 'G'}
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700 }}>{user.name}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{user.email}</div>
            </div>
          </div>
        ) : (
          <div className="queue-card">
            <div style={{ fontWeight: 700, marginBottom: '4px' }}>Identity Required</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Authorized SV-Operations login required for command access. Metadata is encrypted and logged.
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Auth status</span>
            <span className="mono">{status}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Client ID</span>
            <span className="mono">{clientIdConfigured ? 'configured' : 'missing'}</span>
          </div>
        </div>

        {error && (
          <div className="alert-banner safety" style={{ marginBottom: 0 }}>
            <div className="alert-banner-text">{error}</div>
          </div>
        )}


          {!user && (
            <button className="header-btn" onClick={promptSignIn} style={{ width: '100%', justifyContent: 'center' }}>
              <FiLogIn /> Identity Sync Gateway
            </button>
          )}
          {user && (
            <>
              <button className="header-btn" onClick={onContinue}>
                <FiShield /> Initialize Command Center
              </button>
              <button className="header-btn" onClick={signOut}>
                <FiLogOut /> Termination
              </button>
            </>
          )}
      </div>
    </div>
  );
}
