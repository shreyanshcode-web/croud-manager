import React from 'react';
import { useUserLocation } from '../hooks/useUserLocation';

const baseBannerStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '14px 16px',
  borderRadius: '12px',
  boxShadow: 'var(--shadow-md)',
  maxWidth: '420px',
  border: '1px solid var(--border-default)',
};

export default function LocationBanner() {
  const { lat, lng, loading, error, retry } = useUserLocation();

  if (loading) {
    return (
      <div
        style={{
          ...baseBannerStyle,
          background: 'var(--bg-elevated)',
        }}
        aria-live="polite"
      >
        <div
          style={{
            position: 'relative',
            width: '12px',
            height: '12px',
            borderRadius: '999px',
            background: 'var(--accent-emerald)',
            boxShadow: '0 0 0 6px rgba(16, 185, 129, 0.18)',
          }}
        ></div>
        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
          Locating you...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          ...baseBannerStyle,
          justifyContent: 'space-between',
          background: 'rgba(127, 29, 29, 0.4)',
          borderColor: 'rgba(239, 68, 68, 0.35)',
        }}
        role="alert"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <div
            aria-hidden="true"
            style={{
              color: 'var(--accent-red)',
              fontWeight: 700,
              fontSize: '16px',
            }}
          >
            !
          </div>
          <span style={{ color: '#fecaca', fontWeight: 600, fontSize: '13px' }}>
            {error}
          </span>
        </div>
        <button
          onClick={retry}
          className="header-btn"
          style={{
            marginLeft: '12px',
            color: '#fecaca',
            borderColor: 'rgba(239, 68, 68, 0.4)',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        ...baseBannerStyle,
        background: 'var(--bg-elevated)',
      }}
      aria-live="polite"
    >
      <div
        aria-hidden="true"
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '999px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(16, 185, 129, 0.12)',
          color: 'var(--accent-emerald)',
          fontWeight: 700,
        }}
      >
        L
      </div>
      <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '13px' }}>
        Location: {lat?.toFixed(4)}, {lng?.toFixed(4)}
      </span>
    </div>
  );
}
