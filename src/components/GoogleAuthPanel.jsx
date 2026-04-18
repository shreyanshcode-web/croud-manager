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
        <div className="glass-card-title"><FiLock /> Google Authentication</div>
        <div className="glass-card-subtitle">GIS + Identity Platform ready</div>
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
            <div style={{ fontWeight: 700, marginBottom: '4px' }}>Operator sign-in</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Authenticate operators with Google Identity Services now, and back it with Identity Platform in production for MFA, claims, and tenancy.
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

        {!clientIdConfigured && (
          <div className="alert-banner info" style={{ marginBottom: 0 }}>
            <div className="alert-banner-text">
              Set <strong>VITE_GOOGLE_CLIENT_ID</strong> to enable the live Google sign-in prompt.
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {user ? (
            <>
              <button className="header-btn" onClick={onContinue}>
                <FiShield /> Continue To Ops
              </button>
              <button className="header-btn" onClick={signOut}>
                <FiLogOut /> Sign Out
              </button>
            </>
          ) : (
            <>
              <button className="header-btn" onClick={promptSignIn}>
                <FiLogIn /> Sign In With Google
              </button>
              <button className="header-btn" onClick={onContinue}>
                <FiShield /> Dev Bypass
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
