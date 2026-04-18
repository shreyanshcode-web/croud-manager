/**
 * GCP Services Panel — SmartVenue AI
 * Shows the live status of every GCP service in the stack, wired to the
 * /api/health endpoint.
 *
 * Fix #2: Replaced all className references (.page-header, .glass-card, etc.)
 *         with inline styles consistent with the rest of the codebase.
 * Fix #3: Removed all CSS custom property references (var(--accent-*)) which
 *         were undefined — replaced with literal hex values.
 */
import { useEffect, useState } from 'react';
import {
  FiCloud, FiDatabase, FiActivity, FiShield, FiKey,
  FiServer, FiRadio, FiBarChart2, FiCpu, FiCheckCircle,
  FiAlertCircle, FiLoader,
} from 'react-icons/fi';

// Colour palette (was previously undefined CSS vars — now literal values)
const COLORS = {
  blue:    '#00E0FF',
  red:     '#FF3B3B',
  amber:   '#FFB800',
  cyan:    '#00E0FF',
  emerald: '#10B981',
  purple:  '#8B5CF6',
  pink:    '#ec4899',
};

const GCP_SERVICES = [
  {
    id: 'cloud-run',
    name: 'Cloud Run',
    description: 'Serverless container hosting the Express API and React SPA',
    icon: FiServer,
    color: COLORS.blue,
    checkKey: 'server',
  },
  {
    id: 'redis',
    name: 'Redis Cache',
    description: 'In-memory cache for AI advice (30 s TTL) and venue snapshots (3 s TTL)',
    icon: FiActivity,
    color: COLORS.red,
    checkKey: 'redis',
  },
  {
    id: 'kafka',
    name: 'Kafka Event Bus',
    description: 'crowd.events, crowd.alerts, location.updates topics at ~3 s cadence',
    icon: FiRadio,
    color: COLORS.amber,
    checkKey: 'kafka',
  },
  {
    id: 'bigquery',
    name: 'BigQuery ML',
    description: 'Streaming ingest of crowd event rows; crowd_ai.training_crowd_events',
    icon: FiBarChart2,
    color: COLORS.cyan,
    checkKey: 'bigquery',
  },
  {
    id: 'firestore',
    name: 'Firestore',
    description: 'Live publicDashboard, incidents, and operatorActions collections with RBAC rules',
    icon: FiDatabase,
    color: COLORS.emerald,
    checkKey: 'firestore',
  },
  {
    id: 'secret-manager',
    name: 'Secret Manager',
    description: 'GEMINI_API_KEY and credentials with 5-minute rotation-aware cache',
    icon: FiKey,
    color: COLORS.purple,
    checkKey: 'secrets',
  },
  {
    id: 'gemini',
    name: 'Vertex AI / Gemini',
    description: 'Operator crowd advice via gemini-pro — cached, rate-limited, prompt-sanitised',
    icon: FiCpu,
    color: COLORS.pink,
    checkKey: 'gemini',
  },
  {
    id: 'identity',
    name: 'Identity Platform',
    description: 'Google Identity Services for operator sign-in; custom claims for RBAC',
    icon: FiShield,
    color: COLORS.blue,
    checkKey: 'identity',
  },
  {
    id: 'cloud-armor',
    name: 'Cloud Armor',
    description: 'WAF, rate limiting, XSS/SQLi blocking on the Cloud Run edge',
    icon: FiShield,
    color: COLORS.amber,
    checkKey: 'armor',
  },
  {
    id: 'logging',
    name: 'Cloud Logging',
    description: 'Structured JSON logs streamed to Cloud Logging via stdout on Cloud Run',
    icon: FiCloud,
    color: COLORS.cyan,
    checkKey: 'logging',
  },
];

function StatusDot({ status }) {
  if (status === 'loading')
    return <FiLoader size={14} style={{ color: '#6B7280', animation: 'spin 1s linear infinite' }} />;
  if (status === 'connected')
    return <FiCheckCircle size={14} style={{ color: COLORS.emerald }} />;
  if (status === 'unavailable')
    return <FiAlertCircle size={14} style={{ color: COLORS.amber }} />;
  return <FiActivity size={14} style={{ color: '#374151' }} />;
}

export default function GcpServicesPanel() {
  const [health, setHealth] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          const data = await res.json();
          setHealth(data);
          setLastChecked(new Date());
        }
      } catch {
        setHealth({ status: 'unreachable' });
      }
    };
    check();
    const t = setInterval(check, 15000);
    return () => clearInterval(t);
  }, []);

  function getStatus(service) {
    if (!health) return 'loading';
    if (service.checkKey === 'server') return health.status === 'ok' ? 'connected' : 'unavailable';
    if (service.checkKey === 'redis')  return health.redis === 'connected' ? 'connected' : 'unavailable';
    if (service.checkKey === 'kafka')  return health.kafka === 'connected' ? 'connected' : 'unavailable';
    if (health.status === 'ok') return 'connected';
    return 'unknown';
  }

  const connectedCount = GCP_SERVICES.filter(s => getStatus(s) === 'connected').length;

  const summaryItems = [
    { label: 'Services Active',  value: `${connectedCount} / ${GCP_SERVICES.length}`, color: COLORS.emerald },
    { label: 'Redis Cache',  value: health?.redis === 'connected' ? 'Online' : 'Offline',   color: health?.redis === 'connected' ? COLORS.emerald : COLORS.amber },
    { label: 'Kafka Bus',    value: health?.kafka === 'connected' ? 'Online' : 'Offline',   color: health?.kafka === 'connected' ? COLORS.emerald : COLORS.amber },
    { label: 'GCP Project',  value: health?.gcp || 'Not set',                              color: COLORS.blue },
  ];

  return (
    <div style={{ padding: '24px', fontFamily: "'JetBrains Mono', monospace" }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px', fontFamily: "'Space Grotesk', sans-serif" }}>
          GCP SERVICES STACK
        </div>
        <div style={{ fontSize: '11px', color: '#6B7280' }}>
          Live status of all Google Cloud services — updated every 15 s
          {lastChecked && ` · last checked ${lastChecked.toLocaleTimeString()}`}
        </div>
      </div>

      {/* Summary bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        {summaryItems.map(({ label, value, color }) => (
          <div
            key={label}
            style={{
              padding: '12px 16px',
              border: `1px solid ${color}30`,
              borderLeft: `3px solid ${color}`,
              background: `${color}08`,
            }}
          >
            <div style={{ fontSize: '10px', color: '#6B7280', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Service cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
        {GCP_SERVICES.map((service) => {
          const status = getStatus(service);
          const Icon = service.icon;
          return (
            <div
              key={service.id}
              style={{
                padding: '16px',
                border: `1px solid ${service.color}20`,
                borderLeft: `3px solid ${service.color}`,
                background: `${service.color}06`,
                display: 'flex',
                gap: '14px',
                alignItems: 'flex-start',
              }}
            >
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '6px',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: `${service.color}18`,
                color: service.color,
              }}>
                <Icon size={18} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 700, fontSize: '13px', color: '#EDEDED' }}>{service.name}</span>
                  <StatusDot status={status} />
                </div>
                <p style={{ fontSize: '11px', color: '#6B7280', lineHeight: 1.5, margin: '0 0 6px' }}>
                  {service.description}
                </p>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: status === 'connected'   ? COLORS.emerald
                       : status === 'unavailable' ? COLORS.amber
                       : '#6B7280',
                }}>
                  {status === 'loading' ? 'checking…' : status}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
