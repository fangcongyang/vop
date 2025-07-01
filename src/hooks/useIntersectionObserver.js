import { useEffect, useRef } from "react";

export function useIntersectionObserver(ref, callback, options) {
    const callbackRef = useRef(callback);
    callbackRef.current = callback;
    useEffect(() => {
      if (!ref.current) return;
      let running = false;
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(async (entry) => {
          if (entry.isIntersecting && !running) {
            running = true;
            await callbackRef.current();
            running = false;
          }
        });
      }, options);
      observer.observe(ref.current);
      return () => {
        observer.disconnect();
      };
    }, [ref, options]);
  }