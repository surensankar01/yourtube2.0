import React, { useRef, useEffect } from "react";

interface VideoTileProps {
  stream: MediaStream;
  isLocal?: boolean;
  muted?: boolean;
  label?: string;
}

/**
 * Renders a video element bound to a MediaStream.
 * For local streams we enable autoplay+muted to avoid echo.
 */
export default function VideoTile({ stream, isLocal = false, muted = false, label }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video && stream) {
      video.srcObject = stream;
      video.play().catch((e) => console.error("Video play error", e));
    }
    return () => {
      if (video) {
        video.pause();
        video.srcObject = null;
      }
    };
  }, [stream]);

  return (
    <div className="relative rounded-lg overflow-hidden shadow-lg bg-black">
      <video
        ref={videoRef}
        muted={isLocal || muted}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />
      {label && (
        <div className="absolute bottom-0 left-0 bg-black/50 text-white text-sm px-2 py-1 rounded-tr-lg">
          {label}
        </div>
      )}
    </div>
  );
}
