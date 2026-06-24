import { useCallback, useEffect, useRef, useState } from "react";

/**
 * "Focus mode" for the board. Best-effort native Fullscreen API with a
 * full-viewport overlay fallback (iOS Safari and some browsers reject element
 * fullscreen), a body-scroll lock, and auto-exit when the user leaves native
 * fullscreen (e.g. presses Esc). Overlay-only Esc handling lives next to the
 * kiosk markup so it can defer to an open drawer first.
 */
export function useKiosk() {
  const targetRef = useRef<HTMLDivElement | null>(null);
  const [kiosk, setKiosk] = useState(false);
  const usedNativeFs = useRef(false);

  const enter = useCallback(() => {
    setKiosk(true);
    const el = targetRef.current;
    if (el?.requestFullscreen) {
      el.requestFullscreen()
        .then(() => {
          usedNativeFs.current = true;
        })
        .catch(() => {
          usedNativeFs.current = false;
        });
    }
  }, []);

  const exit = useCallback(() => {
    setKiosk(false);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    usedNativeFs.current = false;
  }, []);

  // Leaving native fullscreen (Esc / browser chrome) should leave kiosk too.
  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement && usedNativeFs.current) {
        usedNativeFs.current = false;
        setKiosk(false);
      }
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Lock page scroll while kiosk is up (matters for the overlay fallback).
  useEffect(() => {
    if (!kiosk) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [kiosk]);

  return { kiosk, enter, exit, targetRef };
}
