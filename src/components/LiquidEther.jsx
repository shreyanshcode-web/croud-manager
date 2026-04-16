import { useEffect, useRef } from 'react';
import './LiquidEther.css';

export default function LiquidEther({
  colors = ['#5227FF', '#FF9FFC', '#B497CF'],
  mouseForce = 20,
  cursorSize = 100,
  isViscous = false,
  viscous = 30,
  iterationsViscous = 32,
  iterationsPoisson = 32,
  resolution = 0.5,
  dt = 0.014,
  BFECC = true,
  isBounce = false,
  autoDemo = true,
  autoSpeed = 0.5,
  autoIntensity = 2.2,
  takeoverDuration = 0.25,
  autoResumeDelay = 3000,
  autoRampDuration = 0.6,
  className = '',
  style = {},
}) {
  const containerRef = useRef(null);
  const blobRef = useRef(null);
  const accentRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    const blob = blobRef.current;
    const accent = accentRef.current;
    if (!container || !blob || !accent) return undefined;

    let animationId = 0;
    let lastInteraction = performance.now();
    const current = { x: 50, y: 50 };
    const target = { x: 50, y: 50 };
    const auto = { x: 35, y: 45 };
    const autoTarget = { x: 62, y: 58 };

    const clampPercent = (value) => {
      if (isBounce) return Math.max(8, Math.min(92, value));
      return value;
    };

    const retargetAuto = () => {
      autoTarget.x = 15 + Math.random() * 70;
      autoTarget.y = 18 + Math.random() * 64;
    };

    const setTargetFromClient = (clientX, clientY) => {
      const rect = container.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      target.x = clampPercent(((clientX - rect.left) / rect.width) * 100);
      target.y = clampPercent(((clientY - rect.top) / rect.height) * 100);
      lastInteraction = performance.now();
    };

    const handlePointerMove = (event) => {
      setTargetFromClient(event.clientX, event.clientY);
    };

    const handleTouchMove = (event) => {
      if (event.touches.length !== 1) return;
      setTargetFromClient(event.touches[0].clientX, event.touches[0].clientY);
    };

    const animate = () => {
      const now = performance.now();
      const isIdle = autoDemo && now - lastInteraction > autoResumeDelay;

      if (isIdle) {
        const dx = autoTarget.x - auto.x;
        const dy = autoTarget.y - auto.y;
        const distance = Math.hypot(dx, dy);

        if (distance < 1.2) {
          retargetAuto();
        } else {
          auto.x += (dx / Math.max(distance, 1)) * autoSpeed * (1 + autoRampDuration);
          auto.y += (dy / Math.max(distance, 1)) * autoSpeed * (1 + autoRampDuration);
        }

        target.x += (auto.x - target.x) * takeoverDuration;
        target.y += (auto.y - target.y) * takeoverDuration;
      }

      const smoothing = 0.045 + Math.min(iterationsPoisson / 700, 0.05) + (BFECC ? 0.01 : 0);
      current.x += (target.x - current.x) * smoothing;
      current.y += (target.y - current.y) * smoothing;

      const forceScale = 0.35 + mouseForce * 0.01;
      const accentScale = 0.22 + autoIntensity * 0.05 + (isViscous ? viscous * 0.002 : 0.02);
      const blur = 16 + resolution * 26 + dt * 120 + iterationsViscous * 0.15;

      blob.style.left = `${current.x}%`;
      blob.style.top = `${current.y}%`;
      blob.style.width = `${cursorSize * forceScale}px`;
      blob.style.height = `${cursorSize * forceScale}px`;
      blob.style.filter = `blur(${blur}px)`;

      accent.style.left = `${100 - current.x}%`;
      accent.style.top = `${100 - current.y}%`;
      accent.style.width = `${cursorSize * (0.8 + accentScale)}px`;
      accent.style.height = `${cursorSize * (0.8 + accentScale)}px`;
      accent.style.filter = `blur(${blur * 1.4}px)`;

      animationId = window.requestAnimationFrame(animate);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    animationId = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(animationId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [
    BFECC,
    autoDemo,
    autoIntensity,
    autoRampDuration,
    autoResumeDelay,
    autoSpeed,
    cursorSize,
    dt,
    isBounce,
    isViscous,
    iterationsPoisson,
    iterationsViscous,
    mouseForce,
    resolution,
    takeoverDuration,
    viscous,
  ]);

  const palette = [...colors, colors[colors.length - 1] || '#B497CF'];

  return (
    <div
      ref={containerRef}
      className={`liquid-ether-container ${className}`.trim()}
      style={{
        ...style,
        background: `radial-gradient(circle at 20% 20%, ${palette[0]}20, transparent 38%),
          radial-gradient(circle at 80% 18%, ${palette[1]}26, transparent 42%),
          radial-gradient(circle at 50% 80%, ${palette[2]}20, transparent 45%),
          linear-gradient(135deg, rgba(5, 8, 16, 0.92), rgba(15, 22, 41, 0.84))`,
      }}
    >
      <div ref={blobRef} className="liquid-ether-blob" style={{ background: palette[0] }} />
      <div ref={accentRef} className="liquid-ether-blob liquid-ether-blob--accent" style={{ background: palette[1] }} />
      <div className="liquid-ether-noise" style={{ background: `linear-gradient(135deg, ${palette[2]}10, transparent 55%)` }} />
    </div>
  );
}
