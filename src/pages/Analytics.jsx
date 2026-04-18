/**
 * Analytics Page
 * Historical data, trends, and insights
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../services/api.js';

export default function Analytics() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState(null);
  const [history, setHistory] = useState(null);
  const [fetchError, setFetchError] = useState(null); // FIX #6: track API errors

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await api.getAnalyticsSummary();
        setSummary(res.data);
        setFetchError(null);
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
        setFetchError(err.message || 'Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  const handleZoneSelect = async (zoneId) => {
    setSelectedZone(zoneId);
    try {
      const res = await api.getAnalyticsHistory(zoneId);
      setHistory(res.data);
    } catch (err) {
      console.error('Failed to fetch zone history:', err);
    }
  };

  if (loading) {
    return (
      <div style={{ background: '#0A0A0A', color: '#EDEDED', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace" }}>Loading analytics...</div>
      </div>
    );
  }

  // FIX #6: show error state when fetch failed
  if (fetchError && !summary) {
    return (
      <div style={{ background: '#0A0A0A', color: '#EDEDED', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          textAlign: 'center',
          padding: '32px',
          border: '1px solid #FF3B3B',
          borderLeft: '3px solid #FF3B3B',
          background: 'rgba(255,59,59,0.05)',
        }}>
          <div style={{ color: '#FF3B3B', fontSize: '12px', fontWeight: 700, marginBottom: '8px' }}>FAILED TO LOAD ANALYTICS</div>
          <div style={{ color: '#6B7280', fontSize: '11px' }}>{fetchError}</div>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: '16px', padding: '8px 16px', background: '#FF3B3B', color: '#0A0A0A', border: 'none', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
          >
            RETRY
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#0A0A0A', color: '#EDEDED', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* HEADER */}
      <div style={{ padding: '20px 32px', borderBottom: '2px solid #1A1A1A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }}>
            ANALYTICS
          </div>
          <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
            Historical data and insights
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
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
          <button
            onClick={() => navigate('/dashboard')}
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
            DASHBOARD
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ flex: 1, overflow: 'auto', padding: '32px' }}>
        {/* SUMMARY STATS */}
        {summary && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px', fontFamily: "'Space Grotesk', sans-serif" }}>
              SYSTEM SUMMARY
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              <div style={{ padding: '16px', border: '1px solid #1A1A1A', background: 'rgba(0,224,255,0.05)' }}>
                <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '8px' }}>Total People</div>
                <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
                  {summary.totalPeople}
                </div>
              </div>
              <div style={{ padding: '16px', border: '1px solid #1A1A1A', background: 'rgba(0,224,255,0.05)' }}>
                <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '8px' }}>Avg Density</div>
                <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
                  {summary.avgDensity}%
                </div>
              </div>
              <div style={{ padding: '16px', border: '1px solid #1A1A1A', background: 'rgba(255,59,59,0.05)' }}>
                <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '8px' }}>Peak Density</div>
                <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: '#FF3B3B' }}>
                  {summary.peakDensity}%
                </div>
              </div>
              <div style={{ padding: '16px', border: '1px solid #1A1A1A', background: 'rgba(255,184,0,0.05)' }}>
                <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '8px' }}>Alerts</div>
                <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: '#FFB800' }}>
                  {summary.alertsTriggered}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ZONE HISTORY */}
        <div>
          <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px', fontFamily: "'Space Grotesk', sans-serif" }}>
            ZONE HISTORY
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {['Zone A', 'Zone B', 'Zone C'].map((zone) => (
              <div
                key={zone}
                onClick={() => handleZoneSelect(zone)}
                style={{
                  padding: '16px',
                  border: selectedZone === zone ? '2px solid #00E0FF' : '1px solid #1A1A1A',
                  background: selectedZone === zone ? 'rgba(0,224,255,0.1)' : 'rgba(0,0,0,0.3)',
                  cursor: 'pointer',
                  transition: 'all 150ms linear',
                }}
                onMouseEnter={(e) => {
                  if (selectedZone !== zone) {
                    e.currentTarget.style.borderColor = '#00E0FF';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedZone !== zone) {
                    e.currentTarget.style.borderColor = '#1A1A1A';
                  }
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '8px' }}>{zone}</div>
                <div style={{ fontSize: '11px', color: '#6B7280' }}>
                  Click to view history
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SELECTED ZONE DETAILS */}
        {selectedZone && history && (
          <div style={{ marginTop: '32px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px', fontFamily: "'Space Grotesk', sans-serif" }}>
              {selectedZone} DETAILS
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              <div style={{ padding: '16px', border: '1px solid #1A1A1A' }}>
                <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '8px' }}>Average Density</div>
                <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
                  {history.averageDensity}%
                </div>
              </div>
              <div style={{ padding: '16px', border: '1px solid #1A1A1A' }}>
                <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '8px' }}>Peak Density</div>
                <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: '#FF3B3B' }}>
                  {history.peakDensity}%
                </div>
              </div>
              <div style={{ padding: '16px', border: '1px solid #1A1A1A' }}>
                <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '8px' }}>Min Density</div>
                <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: '#10B981' }}>
                  {history.minDensity}%
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
