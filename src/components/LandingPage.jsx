import React from 'react';
import { FiArrowRight, FiCloud, FiDatabase, FiMapPinned, FiShield, FiTrendingUp } from 'react-icons/fi';
import BubbleMenu from './BubbleMenu';
import ScrollReveal from './ScrollReveal';
import LiquidEther from './LiquidEther';
import GlassSurface from './GlassSurface';
import GoogleAuthPanel from './GoogleAuthPanel';

const menuItems = [
  { label: 'hero', href: '#top', ariaLabel: 'Hero', rotation: -8, hoverStyles: { bgColor: '#3b82f6', textColor: '#ffffff' } },
  { label: 'maps', href: '#maps', ariaLabel: 'Maps', rotation: 8, hoverStyles: { bgColor: '#10b981', textColor: '#ffffff' } },
  { label: 'stack', href: '#stack', ariaLabel: 'Stack', rotation: 8, hoverStyles: { bgColor: '#f59e0b', textColor: '#111111' } },
  { label: 'ops', href: '#demo', ariaLabel: 'Operations demo', rotation: 8, hoverStyles: { bgColor: '#ef4444', textColor: '#ffffff' } },
  { label: 'launch', href: '#launch', ariaLabel: 'Launch', rotation: -8, hoverStyles: { bgColor: '#8b5cf6', textColor: '#ffffff' } },
];

export default function LandingPage({ goToOperations }) {
  return (
    <div
      id="top"
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #050810 0%, #0a0e1a 45%, #10172a 100%)',
        color: 'var(--text-primary)',
        position: 'relative',
        overflowX: 'hidden',
      }}
    >
      <BubbleMenu
        logo={<span style={{ fontWeight: 800, letterSpacing: '0.08em' }}>SVAI</span>}
        items={menuItems}
        menuAriaLabel="Toggle landing navigation"
        menuBg="rgba(255,255,255,0.94)"
        menuContentColor="#111111"
        useFixedPosition
      />

      <section className="landing-hero">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 14px',
              borderRadius: '999px',
              background: 'rgba(59, 130, 246, 0.12)',
              border: '1px solid rgba(59, 130, 246, 0.26)',
              color: 'var(--accent-cyan)',
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '18px',
            }}
          >
            <FiCloud /> Google Cloud Crowd Intelligence
          </div>

          <ScrollReveal
            baseOpacity={0.18}
            enableBlur
            baseRotation={4}
            blurStrength={8}
            textClassName="landing-reveal-copy"
          >
            Predict crowd pressure, route visitors with Google Maps, and operate your venue from one intelligent control surface.
          </ScrollReveal>

          <p style={{ maxWidth: '620px', color: 'var(--text-secondary)', fontSize: '15px', marginBottom: '24px' }}>
            SmartVenue AI combines a public-facing command narrative with a dedicated operations page for crowd control. It highlights Google Cloud services that judges can recognize instantly: Maps Platform, Firestore for live operational state, and BigQuery for analytics and model training.
          </p>

          <div id="launch" style={{ display: 'grid', gap: '16px', maxWidth: '620px' }}>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <button className="header-btn" style={{ padding: '12px 18px', fontSize: '13px' }} onClick={goToOperations}>
                Open Crowd Control Page <FiArrowRight />
              </button>
              <a
                href="#stack"
                className="header-btn"
                style={{ padding: '12px 18px', fontSize: '13px', textDecoration: 'none' }}
              >
                View GCP Stack
              </a>
            </div>

            <GoogleAuthPanel onContinue={goToOperations} />
          </div>
        </div>

        <GlassSurface borderRadius={28} blur={16} displace={0.8} saturation={1.2} backgroundOpacity={0.14} className="landing-visual-shell">
          <div style={{ width: '100%', minHeight: '520px', position: 'relative', borderRadius: '24px', overflow: 'hidden' }}>
            <LiquidEther
              colors={['#3b82f6', '#06b6d4', '#8b5cf6']}
              mouseForce={18}
              cursorSize={140}
              isViscous
              viscous={24}
              iterationsViscous={24}
              iterationsPoisson={24}
              resolution={0.45}
              autoDemo
              autoSpeed={0.55}
              autoIntensity={2}
              autoResumeDelay={1800}
              style={{ position: 'absolute', inset: 0 }}
            />

            <div
              style={{
                position: 'relative',
                zIndex: 1,
                minHeight: '520px',
                padding: '28px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                background: 'linear-gradient(180deg, rgba(5, 8, 16, 0.18), rgba(5, 8, 16, 0.72))',
              }}
            >
              <div style={{ display: 'grid', gap: '12px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Judge-Friendly Story
                </div>
                <div style={{ fontSize: '28px', fontWeight: 700, maxWidth: '360px' }}>
                  A separate landing page for pitching, and an ops page for doing.
                </div>
              </div>

              <div style={{ display: 'grid', gap: '12px' }}>
                {[
                  ['Google Maps Platform', 'Venue ingress, routing, and movement context'],
                  ['Firestore', 'Fast live state sync for crowd-control actions'],
                  ['BigQuery ML', 'Historical analytics and model improvement'],
                ].map(([title, body]) => (
                  <div key={title} style={{ padding: '14px 16px', borderRadius: '16px', background: 'rgba(15, 22, 41, 0.62)', border: '1px solid rgba(255,255,255,0.12)' }}>
                    <div style={{ fontWeight: 700, marginBottom: '4px' }}>{title}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{body}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </GlassSurface>
      </section>

      <section id="maps" style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px 32px' }}>
        <div className="dashboard-grid-3" style={{ marginBottom: 0 }}>
          <div className="glass-card span-2" style={{ minHeight: '420px', position: 'relative', overflow: 'hidden' }}>
            <div className="glass-card-header">
              <div className="glass-card-title"><FiMapPinned /> Google Maps Command Context</div>
              <div className="glass-card-subtitle">Maps Platform-ready operator view</div>
            </div>
            <iframe
              title="Venue map"
              src="https://www.google.com/maps?q=Kanteerava%20Stadium%20Bengaluru&output=embed"
              style={{ width: '100%', height: '330px', border: 0, borderRadius: '14px' }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>

          <div className="glass-card" id="stack">
            <div className="glass-card-header">
              <div className="glass-card-title"><FiDatabase /> Recommended Database</div>
            </div>
            <div style={{ display: 'grid', gap: '14px' }}>
              <div className="queue-card">
                <div style={{ fontWeight: 700, marginBottom: '4px' }}>Firestore</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Best for easier Google Cloud integration here: low-ops, real-time, and ideal for storing live crowd-control state, active incidents, and operator decisions.
                </div>
              </div>
              <div className="queue-card">
                <div style={{ fontWeight: 700, marginBottom: '4px' }}>BigQuery</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Best secondary datastore for analytics, historical telemetry, and model training. Use it alongside Firestore rather than replacing it.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="demo" style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px 80px' }}>
        <div className="dashboard-grid">
          {[
            { icon: <FiTrendingUp />, title: 'Predictive Flow', text: 'Short-term pressure forecasting for gates, sections, parking, and transport.' },
            { icon: <FiShield />, title: 'Safety Actions', text: 'Escalate blocked exits, restrict critical sections, and support evacuation flows.' },
            { icon: <FiCloud />, title: 'GCP Native', text: 'Maps Platform, Firestore, BigQuery, Cloud Run, and Vertex AI fit naturally into the roadmap.' },
          ].map((item) => (
            <div key={item.title} className="glass-card">
              <div className="glass-card-title" style={{ marginBottom: '10px' }}>{item.icon} {item.title}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{item.text}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
