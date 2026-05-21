import React, { useEffect, useRef, useState } from 'react';

interface AnimatedNumberProps {
  value: number;
  durationMs?: number;
  suffix?: string;
  prefix?: string;
}

/**
 * Counts from the previous value up to `value` over `durationMs`. Used
 * on dashboard stat cards so the numbers animate in on first render and
 * on data refresh, which makes the dashboard feel less static without
 * affecting the underlying source of truth.
 */
const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  durationMs = 800,
  suffix = '',
  prefix = '',
}) => {
  const [display, setDisplay] = useState(value);
  const previousRef = useRef(value);

  useEffect(() => {
    const from = previousRef.current;
    const to = value;
    if (from === to) {
      setDisplay(to);
      return;
    }
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      // ease-out cubic so the count lands gently.
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = from + (to - from) * eased;
      setDisplay(next);
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        previousRef.current = to;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs]);

  const rounded = Number.isInteger(value) ? Math.round(display) : Math.round(display * 10) / 10;
  return (
    <span>
      {prefix}
      {rounded}
      {suffix}
    </span>
  );
};

export default AnimatedNumber;
