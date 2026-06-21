import { useState, useCallback } from "react";

/** Hook to manage screen‑share media stream */
export function useScreenShare() {
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      throw new Error("Screen sharing not supported in this browser");
    }
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    setScreenStream(stream);
    return stream;
  }, []);

  const stop = useCallback(() => {
    screenStream?.getTracks().forEach((t) => t.stop());
    setScreenStream(null);
  }, [screenStream]);

  return { screenStream, start, stop };
}
