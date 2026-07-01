import { useEffect, useRef, useState, type RefObject } from "react";

export function useInView(options?: { threshold?: number; triggerOnce?: boolean }) {
  const threshold = options?.threshold ?? 0.15;
  const triggerOnce = options?.triggerOnce ?? true;
  const ref = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (triggerOnce) observer.disconnect();
        } else if (!triggerOnce) {
          setInView(false);
        }
      },
      { threshold },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, triggerOnce]);

  return { ref: ref as RefObject<HTMLElement>, inView };
}
