import React from 'react';
import { useNavigate } from 'react-router-dom';
import LiquidEther from '../components/LiquidEther';
import GoogleAuthPanel from '../components/GoogleAuthPanel';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: '#070A0F', overflow: 'hidden' }}>
      {/* 3D Liquid Ethernet Background */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, opacity: 0.65 }}>
        <LiquidEther color="#00e5ff" complexity={0.8} speed={0.4} />
      </div>

      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', zIndex: 10 }}>
        
        {/* HEADER */}
        <div style={{ padding: '24px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', background: '#00E0FF', color: '#0A0A0A', fontWeight: 900, fontSize: '18px', clipPath: 'polygon(0% 0%, 100% 0%, 85% 100%, 0% 100%)' }}>
               SV
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif", color: '#EDEDED', letterSpacing: '2px' }}>
              SMARTVENUE <span style={{ color: '#00E0FF' }}>AI</span>
            </div>
          </div>
        </div>

        {/* HERO LOGIN AREA */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
          <div style={{ maxWidth: '600px', width: '100%', textAlign: 'center', marginBottom: '40px' }}>
            <h1 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif", color: '#EDEDED', lineHeight: 1.1, marginBottom: '20px', textTransform: 'uppercase' }}>
              Intelligent Crowd <br/> <span style={{ color: '#00E0FF' }}>Control Infrastructure</span>
            </h1>
            <p style={{ fontSize: '15px', color: '#8892B0', fontFamily: "'Inter', sans-serif", maxWidth: '500px', margin: '0 auto', lineHeight: 1.6 }}>
              A high-performance command center for real-time venue telemetry, predictive crowd flow intelligence, and operational incident response.
            </p>
          </div>

          <div style={{ width: '100%', maxWidth: '400px' }}>
            <GoogleAuthPanel onContinue={() => navigate('/workspace')} />
          </div>
        </div>
        
        <div style={{ padding: '24px', textAlign: 'center', color: '#8892B0', fontSize: '11px', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px' }}>
          SECURE OPERATIONAL GATEWAY v2.1.4 
        </div>

      </div>
    </div>
  );
}
