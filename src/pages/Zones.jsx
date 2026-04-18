/**
 * Zones Page
 * Manage zones, configure capacity, view status
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../services/api.js';

export default function Zones() {
  const navigate = useNavigate();
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', capacity: 1000, location: '' });

  useEffect(() => {
    const fetchZones = async () => {
      try {
        const res = await api.getZones();
        setZones(res.data.zones || []);
      } catch (err) {
        console.error('Failed to fetch zones:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchZones();
  }, []);

  const handleCreateZone = async () => {
    // FIX #8: validate required fields before firing the API call
    if (!formData.name.trim()) {
      alert('Zone name is required');
      return;
    }
    try {
      const res = await api.createZone(formData.name, formData.capacity, formData.location);
      setZones([...zones, res.data.zone]);
      setFormData({ name: '', capacity: 1000, location: '' });
      setShowForm(false);
    } catch (err) {
      console.error('Failed to create zone:', err);
    }
  };

  const handleDeleteZone = async (zoneId) => {
    try {
      await api.deleteZone(zoneId);
      setZones(zones.filter(z => z.id !== zoneId));
    } catch (err) {
      console.error('Failed to delete zone:', err);
    }
  };

  if (loading) {
    return (
      <div style={{ background: '#0A0A0A', color: '#EDEDED', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace" }}>Loading zones...</div>
      </div>
    );
  }

  return (
    <div style={{ background: '#0A0A0A', color: '#EDEDED', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* HEADER */}
      <div style={{ padding: '20px 32px', borderBottom: '2px solid #1A1A1A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }}>
            ZONES
          </div>
          <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
            Manage zones and capacity
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
      <div style={{ flex: 1, overflow: 'auto', padding: '32px' }}>
        {/* CREATE ZONE BUTTON */}
        <div style={{ marginBottom: '32px' }}>
          <button
            onClick={() => setShowForm(!showForm)}
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
            + CREATE ZONE
          </button>
        </div>

        {/* CREATE FORM */}
        {showForm && (
          <div style={{ padding: '24px', border: '2px solid #1A1A1A', marginBottom: '32px' }}>
            <div style={{ display: 'grid', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#6B7280', display: 'block', marginBottom: '4px' }}>
                  Zone Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#1A1A1A',
                    border: '1px solid #1A1A1A',
                    color: '#EDEDED',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '12px',
                  }}
                  placeholder="e.g., Downtown"
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: '#6B7280', display: 'block', marginBottom: '4px' }}>
                  Capacity
                </label>
                <input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#1A1A1A',
                    border: '1px solid #1A1A1A',
                    color: '#EDEDED',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '12px',
                  }}
                  placeholder="e.g., 5000"
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: '#6B7280', display: 'block', marginBottom: '4px' }}>
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#1A1A1A',
                    border: '1px solid #1A1A1A',
                    color: '#EDEDED',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '12px',
                  }}
                  placeholder="e.g., North Gate"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button
                onClick={handleCreateZone}
                style={{
                  padding: '8px 16px',
                  background: '#00E0FF',
                  color: '#0A0A0A',
                  border: 'none',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                CREATE
              </button>
              <button
                onClick={() => setShowForm(false)}
                style={{
                  padding: '8px 16px',
                  background: '#1A1A1A',
                  color: '#EDEDED',
                  border: '1px solid #1A1A1A',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                CANCEL
              </button>
            </div>
          </div>
        )}

        {/* ZONES LIST */}
        <div>
          <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px', fontFamily: "'Space Grotesk', sans-serif" }}>
            ZONES ({zones.length})
          </div>
          {zones.length === 0 ? (
            <div style={{ fontSize: '12px', color: '#6B7280', fontStyle: 'italic' }}>
              No zones created yet
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {zones.map((zone) => (
                <div
                  key={zone.id}
                  style={{
                    padding: '16px',
                    border: '1px solid #1A1A1A',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '4px' }}>
                      {zone.name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6B7280' }}>
                      Capacity: {zone.capacity} | Location: {zone.location}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteZone(zone.id)}
                    style={{
                      padding: '6px 12px',
                      background: '#FF3B3B',
                      color: '#0A0A0A',
                      border: 'none',
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '10px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    DELETE
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
