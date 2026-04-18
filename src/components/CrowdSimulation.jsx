/**
 * CrowdSimulation — Canvas-based particle system
 * Moving dots (people), distance-based clustering, density coloring
 * Brutalist: hard edges, no shadows, mechanical motion
 *
 * Fix #1: Store actual class instances (not plain-object spreads) so that
 *         .update() and .draw() prototype methods are preserved.
 * Fix #13: density and riskLevel state are now rendered as an overlay badge.
 */
import { useEffect, useRef, useState } from 'react';

const PARTICLE_COUNT = 200;
const CLUSTER_DISTANCE = 60;

class Particle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 2;
    this.vy = (Math.random() - 0.5) * 2;
    this.radius = 3;
  }

  update(width, height) {
    this.x += this.vx;
    this.y += this.vy;

    if (this.x - this.radius < 0 || this.x + this.radius > width) this.vx *= -1;
    if (this.y - this.radius < 0 || this.y + this.radius > height) this.vy *= -1;

    this.x = Math.max(this.radius, Math.min(width - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(height - this.radius, this.y));
  }

  draw(ctx, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

export default function CrowdSimulation() {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const [density, setDensity] = useState(0);
  const [riskLevel, setRiskLevel] = useState('LOW');
  const animationRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const displayWidth = rect.width;
    const displayHeight = rect.height;

    // FIX #1: Store actual Particle instances — spreading them into plain objects
    // strips prototype methods (.update, .draw), causing TypeError on every frame.
    particlesRef.current = Array.from(
      { length: PARTICLE_COUNT },
      () => new Particle(Math.random() * displayWidth, Math.random() * displayHeight)
    );

    const animate = () => {
      ctx.fillStyle = '#0A0A0A';
      ctx.fillRect(0, 0, displayWidth, displayHeight);

      // Grid lines
      ctx.strokeStyle = '#1A1A1A';
      ctx.lineWidth = 1;
      for (let i = 0; i < displayWidth; i += 60) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, displayHeight);
        ctx.stroke();
      }
      for (let i = 0; i < displayHeight; i += 60) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(displayWidth, i);
        ctx.stroke();
      }

      const particles = particlesRef.current;
      particles.forEach(p => p.update(displayWidth, displayHeight));

      let totalDensity = 0;
      particles.forEach((p, i) => {
        let neighbors = 0;
        particles.forEach((other, j) => {
          if (i !== j) {
            const dx = p.x - other.x;
            const dy = p.y - other.y;
            if (Math.sqrt(dx * dx + dy * dy) < CLUSTER_DISTANCE) neighbors++;
          }
        });
        totalDensity += neighbors;
        const color = neighbors > 15 ? '#FF3B3B' : neighbors > 8 ? '#FFB800' : '#00E0FF';
        p.draw(ctx, color);
      });

      const avgDensity = Math.round((totalDensity / PARTICLE_COUNT) * 10);
      setDensity(avgDensity);
      if (avgDensity > 80) setRiskLevel('CRITICAL');
      else if (avgDensity > 60) setRiskLevel('HIGH');
      else if (avgDensity > 40) setRiskLevel('MEDIUM');
      else setRiskLevel('LOW');

      // Heat zones
      ctx.fillStyle = 'rgba(255, 59, 59, 0.08)';
      particles.forEach(p => {
        let neighbors = 0;
        particles.forEach(other => {
          const dx = p.x - other.x;
          const dy = p.y - other.y;
          if (Math.sqrt(dx * dx + dy * dy) < CLUSTER_DISTANCE) neighbors++;
        });
        if (neighbors > 15) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, CLUSTER_DISTANCE, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const riskColor =
    riskLevel === 'CRITICAL' ? '#FF3B3B'
    : riskLevel === 'HIGH'   ? '#FFB800'
    : riskLevel === 'MEDIUM' ? '#00E0FF'
    : '#10B981';

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* FIX #13: Display density + risk level — state was computed but never rendered */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      >
        <div style={{
          padding: '4px 10px',
          background: 'rgba(10,10,10,0.85)',
          border: `1px solid ${riskColor}`,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '10px',
          color: riskColor,
          fontWeight: 700,
          letterSpacing: '1px',
        }}>
          RISK: {riskLevel}
        </div>
        <div style={{
          padding: '4px 10px',
          background: 'rgba(10,10,10,0.85)',
          border: '1px solid #1A1A1A',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '10px',
          color: '#6B7280',
        }}>
          DENSITY: {density}
        </div>
      </div>

      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          cursor: 'crosshair',
          border: '1px solid #1A1A1A',
        }}
      />

      {/* Scanline overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.03) 0px, rgba(0,0,0,0.03) 1px, transparent 1px, transparent 2px)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
