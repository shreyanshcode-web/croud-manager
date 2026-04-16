import { useEffect, useMemo, useRef, useState } from 'react';
import './ScrollReveal.css';

export default function ScrollReveal({
  children,
  scrollContainerRef,
  enableBlur = true,
  baseOpacity = 0.1,
  baseRotation = 3,
  blurStrength = 4,
  containerClassName = '',
  textClassName = '',
  rotationEnd = 'bottom bottom',
  wordAnimationEnd = 'bottom bottom',
}) {
  const containerRef = useRef(null);
  const [progress, setProgress] = useState(0);

  const words = useMemo(() => {
    if (typeof children !== 'string') return null;
    return children.split(/(\s+)/);
  }, [children]);

  useEffect(() => {
    const element = containerRef.current;
    const scroller = scrollContainerRef?.current || window;
    if (!element) return undefined;

    const computeProgress = () => {
      const rect = element.getBoundingClientRect();
      const viewport = scroller === window ? window.innerHeight : scroller.clientHeight;
      const start = viewport * 0.95;
      const end = viewport * 0.2;
      const next = (start - rect.top) / Math.max(start - end, 1);
      setProgress(Math.max(0, Math.min(1, next)));
    };

    computeProgress();
    const target = scroller === window ? window : scroller;
    target.addEventListener('scroll', computeProgress, { passive: true });
    window.addEventListener('resize', computeProgress);

    return () => {
      target.removeEventListener('scroll', computeProgress);
      window.removeEventListener('resize', computeProgress);
    };
  }, [rotationEnd, scrollContainerRef, wordAnimationEnd]);

  return (
    <h2
      ref={containerRef}
      className={`scroll-reveal ${containerClassName}`.trim()}
      style={{
        transformOrigin: '0% 50%',
        transform: `rotate(${baseRotation * (1 - progress)}deg)`,
      }}
    >
      <p className={`scroll-reveal-text ${textClassName}`.trim()}>
        {words
          ? words.map((word, index) => {
              if (/^\s+$/.test(word)) return word;
              const wordProgress = Math.max(0, Math.min(1, progress * 1.15 - index * 0.03));
              return (
                <span
                  key={`${word}-${index}`}
                  className="word"
                  style={{
                    opacity: baseOpacity + (1 - baseOpacity) * wordProgress,
                    filter: enableBlur ? `blur(${(1 - wordProgress) * blurStrength}px)` : 'none',
                    transform: `translateY(${(1 - wordProgress) * 8}px)`,
                  }}
                >
                  {word}
                </span>
              );
            })
          : children}
      </p>
    </h2>
  );
}
