import React from 'react';
import { FiMapPin, FiTruck, FiNavigation } from 'react-icons/fi';

export default function TransportHub({ data, intelligence }) {
  const { transport } = data;
  const routingAnalysis = intelligence?.arrivalPlan;

  const groupedTransport = transport.reduce((accumulator, current) => {
    if (!accumulator[current.type]) accumulator[current.type] = [];
    accumulator[current.type].push(current);
    return accumulator;
  }, {});

  return (
    <div className="fade-in">
      <div className="section-header">
        <div>
          <h1 className="page-title">External Mobility & Transit</h1>
          <p className="page-subtitle">Arrival and departure integration</p>
        </div>
      </div>

      <div className="dashboard-grid-2">
        <div
          className="glass-card"
          style={{
            borderTop: '4px solid var(--accent-emerald)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div className="glass-card-header">
            <div className="glass-card-title">
              <FiNavigation /> Smart Pre-Arrival Plan Generator
            </div>
          </div>

          <div
            style={{
              flex: 1,
              background: 'rgba(0,0,0,0.2)',
              padding: '16px',
              borderRadius: '8px',
            }}
          >
            <p
              style={{
                fontSize: '13px',
                color: 'var(--text-muted)',
                marginBottom: '12px',
              }}
            >
              Generated from the live mobility model for an attendee targeting{' '}
              <strong style={{ color: 'white' }}>Lower East A</strong>:
            </p>

            <div style={{ display: 'grid', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div
                  style={{
                    padding: '8px',
                    background: 'var(--bg-elevated)',
                    borderRadius: '8px',
                    color: 'var(--accent-cyan)',
                  }}
                >
                  <FiTruck />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                    }}
                  >
                    Travel Option
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>
                    {routingAnalysis?.recommendation}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div
                  style={{
                    padding: '8px',
                    background: 'var(--bg-elevated)',
                    borderRadius: '8px',
                    color: 'var(--accent-amber)',
                  }}
                >
                  <FiMapPin />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                    }}
                  >
                    Arrival and Route
                  </div>
                  <div style={{ fontSize: '13px' }}>
                    <strong>{routingAnalysis?.arrivalWindow}</strong> Use{' '}
                    <strong>{routingAnalysis?.targetGate}</strong> on arrival.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div
                  style={{
                    minWidth: '52px',
                    padding: '8px',
                    background: 'var(--bg-elevated)',
                    borderRadius: '8px',
                    color: 'var(--accent-emerald)',
                    fontWeight: 700,
                    textAlign: 'center',
                  }}
                >
                  {routingAnalysis?.confidence}%
                </div>
                <div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                    }}
                  >
                    Model Confidence
                  </div>
                  <div style={{ fontSize: '13px' }}>
                    Recommended mode: <strong>{routingAnalysis?.mode}</strong>
                  </div>
                </div>
              </div>

              <div
                style={{
                  padding: '12px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px dashed var(--accent-emerald)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontStyle: 'italic',
                }}
              >
                Tip: {routingAnalysis?.tip}
              </div>
            </div>

            <button
              className="header-btn"
              style={{ width: '100%', marginTop: '16px', justifyContent: 'center' }}
            >
              Send SMS Notification
            </button>
          </div>
        </div>

        <div className="glass-card" style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
          <div className="glass-card-header">
            <div className="glass-card-title">Live Transport Feeds</div>
          </div>

          {Object.entries(groupedTransport).map(([type, vehicles]) => (
            <div key={type} style={{ marginBottom: '20px' }}>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  marginBottom: '8px',
                }}
              >
                {type} Lines
              </div>

              {vehicles.sort((left, right) => left.eta - right.eta).map((vehicle) => (
                <div key={vehicle.id} className="transport-row">
                  <div className={`transport-type-icon ${type}`}>
                    {type === 'Metro' ? 'M' : type === 'Bus' ? 'B' : 'S'}
                  </div>
                  <div className="transport-info">
                    <div className="transport-line">{vehicle.line}</div>
                    <div className="transport-detail">
                      <div
                        className="progress-bar"
                        style={{
                          width: '100px',
                          height: '4px',
                          display: 'inline-block',
                          marginRight: '8px',
                        }}
                      >
                        <div
                          className={`progress-bar-fill ${
                            vehicle.capacity > 85
                              ? 'red'
                              : vehicle.capacity > 60
                                ? 'amber'
                                : 'emerald'
                          }`}
                          style={{ width: `${vehicle.capacity}%` }}
                        ></div>
                      </div>
                      {vehicle.passengers} / {vehicle.maxPassengers} passengers
                    </div>
                  </div>
                  <div>
                    <div className={`transport-eta ${vehicle.status}`}>{vehicle.eta}m</div>
                    <div
                      style={{
                        fontSize: '10px',
                        textAlign: 'right',
                        textTransform: 'uppercase',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {vehicle.status.replace('-', ' ')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
