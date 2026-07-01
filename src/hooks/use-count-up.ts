import { useEffect, useState } from "react";

function easeOutExpo(t: number): number {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export function useCountUp(
  target: number,
  enabled: boolean,
  options?: { duration?: number; decimals?: number },
): number {
  const duration = options?.duration ?? 1000;
  const decimals = options?.decimals ?? 0;
  const [value, setValue] = useState(enabled ? 0 : target);

  useEffect(() => {
    if (!enabled || !Number.isFinite(target)) {
      setValue(target);
      return;
    }

    let start: number | null = null;
    let frame: number;

    const step = (timestamp: number) => {
      if (start === null) start = timestamp;
      const elapsed = timestamp - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutExpo(progress);
      const next = target * eased;
      const factor = Math.pow(10, decimals);
      setValue(Math.round(next * factor) / factor);
      if (progress < 1) {
        frame = requestAnimationFrame(step);
      } else {
        setValue(target);
      }
    };

    setValue(0);
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, enabled, duration, decimals]);

  return value;
}
