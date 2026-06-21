import { useRef, useEffect, RefObject } from "react";
import { TAP_TIMEOUT, REGION_LEFT, REGION_CENTER, REGION_RIGHT } from "@/hooks/gestureConstants";

/**
 * Hook to enable multi‑tap gestures on a video element.
 *
 * @param videoRef   Ref to the HTMLVideoElement.
 * @param callbacks  Object containing the actions to perform for each gesture.
 */
export const useGestureControls = (
  videoRef: RefObject<HTMLVideoElement | null>,
  callbacks: {
    onTogglePlay: () => void;
    onSeek: (seconds: number) => void; // positive forward, negative rewind
    onOpenComments: () => void;
    onNextVideo: () => void;
    onClosePlayer: () => void;
  }
) => {
  const tapCountRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const lastTapTimeRef = useRef(0);
  // ── CE-06 fix: track pointerdown time so we can measure press duration ──
  const pointerDownTimeRef = useRef(0);

  const reset = () => {
    tapCountRef.current = 0;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  // Record when the pointer goes down so we can compute press duration
  const handlePointerDown = (_e: PointerEvent) => {
    pointerDownTimeRef.current = Date.now();
  };

  const handlePointerUp = (e: PointerEvent) => {
    const now = Date.now();
    // ── CE-06 fix: compare wall-clock times, not e.pressure ─────────────────
    const pressDuration = now - pointerDownTimeRef.current;
    // Only count quick taps (< 200 ms). Longer presses are ignored.
    if (pressDuration >= 200) {
      reset();
      return;
    }

    const elapsed = now - lastTapTimeRef.current;
    if (elapsed < TAP_TIMEOUT) {
      tapCountRef.current += 1;
    } else {
      tapCountRef.current = 1;
    }
    lastTapTimeRef.current = now;

    // Determine tap region (left / center / right)
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left; // offset within element
    const region =
      x < rect.width / 3
        ? REGION_LEFT
        : x > (rect.width * 2) / 3
        ? REGION_RIGHT
        : REGION_CENTER;

    // Restart timeout – when it fires we decide what to do
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      const count = tapCountRef.current;
      // Dispatch based on count & region
      if (count === 1 && region === REGION_CENTER) {
        callbacks.onTogglePlay();
      } else if (count === 2) {
        if (region === REGION_LEFT) callbacks.onSeek(-10);
        else if (region === REGION_RIGHT) callbacks.onSeek(10);
      } else if (count === 3) {
        if (region === REGION_LEFT) callbacks.onOpenComments();
        else if (region === REGION_CENTER) callbacks.onNextVideo();
        else if (region === REGION_RIGHT) callbacks.onClosePlayer();
      }
      reset();
    }, TAP_TIMEOUT);
  };

  // Attach listeners to the container that wraps the video element
  useEffect(() => {
    const element = videoRef.current?.parentElement;
    if (!element) return;
    element.addEventListener("pointerdown", handlePointerDown);
    element.addEventListener("pointerup", handlePointerUp);
    return () => {
      element.removeEventListener("pointerdown", handlePointerDown);
      element.removeEventListener("pointerup", handlePointerUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoRef]);
};

