"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import UpgradeBanner from "./UpgradeBanner";
import { getDownload } from "@/lib/downloadHelper";
import { useGestureControls } from "@/hooks/useGestureControls";

// ─── Props ────────────────────────────────────────────────────────────────────

interface VideoPlayerProps {
  video: {
    _id: string;
    videotitle: string;
    filepath: string;
  };
  /** Gesture callbacks – supplied by the parent watch page */
  onOpenComments?: () => void;
  onNextVideo?: () => void;
  onClosePlayer?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function VideoPlayer({
  video,
  onOpenComments,
  onNextVideo,
  onClosePlayer,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { user } = useUser();
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [initialSeekDone, setInitialSeekDone] = useState(false);
  const lastSavedTime = useRef(0);
  const [videoSrc, setVideoSrc] = useState<string>("");

  // Visual feedback state for gesture hints
  const [gestureHint, setGestureHint] = useState<string | null>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showHint = useCallback((text: string) => {
    setGestureHint(text);
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setGestureHint(null), 700);
  }, []);

  // ─── Video Source ───────────────────────────────────────────────────────────

  useEffect(() => {
    let localUrl = "";
    const loadSource = async () => {
      if (!video?._id) return;
      try {
        const saved = await getDownload(video._id);
        if (saved && saved.videoBlob) {
          console.log("Playing offline video from IndexedDB");
          localUrl = URL.createObjectURL(saved.videoBlob);
          setVideoSrc(localUrl);
        } else {
          setVideoSrc(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/${video.filepath}`);
        }
      } catch (err) {
        console.error("Failed to load local offline video, playing online:", err);
        setVideoSrc(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/${video.filepath}`);
      }
    };

    loadSource();
    return () => {
      if (localUrl) URL.revokeObjectURL(localUrl);
    };
  }, [video?._id, video?.filepath]);

  // ─── Viewing Limits ─────────────────────────────────────────────────────────

  const userPlan = user?.planType || "free";
  const limits: Record<string, number> = {
    free: 300,
    bronze: 420,
    silver: 600,
    gold: Infinity,
  };
  const limitSeconds = limits[userPlan.toLowerCase()] || 300;

  const syncProgress = async (time: number) => {
    if (!user || !video?._id) return;
    try {
      await axiosInstance.post(`/history/progress/${video._id}`, {
        userId: user._id,
        watchedTime: Math.round(time),
      });
      lastSavedTime.current = Math.round(time);
    } catch (err) {
      console.error("Error saving progress to MongoDB:", err);
    }
  };

  useEffect(() => {
    const fetchProgress = async () => {
      if (!video?._id) return;
      setIsLimitReached(false);
      setInitialSeekDone(false);
      lastSavedTime.current = 0;

      if (!user) return;

      try {
        const res = await axiosInstance.get(`/history/progress/${video._id}/${user._id}`);
        const progress = res.data?.watchedTime || 0;

        if (progress >= limitSeconds) setIsLimitReached(true);

        if (videoRef.current) {
          videoRef.current.currentTime = progress;
          lastSavedTime.current = progress;
        }
        setInitialSeekDone(true);
      } catch (err) {
        console.error("Error loading progress from MongoDB:", err);
        setInitialSeekDone(true);
      }
    };

    fetchProgress();

    return () => {
      if (videoRef.current && videoRef.current.currentTime > 0) {
        syncProgress(videoRef.current.currentTime);
      }
    };
  }, [video?._id, user?._id, limitSeconds]);

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const currentTime = videoRef.current.currentTime;

    if (currentTime >= limitSeconds) {
      videoRef.current.pause();
      setIsLimitReached(true);
      syncProgress(limitSeconds);
      return;
    }

    if (Math.abs(currentTime - lastSavedTime.current) >= 5) {
      syncProgress(currentTime);
    }
  };

  const handlePause = () => {
    if (videoRef.current) syncProgress(videoRef.current.currentTime);
  };

  // ─── Gesture Callbacks ──────────────────────────────────────────────────────
  // All callbacks silently no-op when the viewing limit banner is active,
  // preventing the user from seeking or interacting past the lock screen.

  const handleTogglePlay = useCallback(() => {
    if (isLimitReached || !videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      showHint("▶");
    } else {
      videoRef.current.pause();
      showHint("⏸");
    }
  }, [isLimitReached, showHint]);

  const handleSeek = useCallback(
    (seconds: number) => {
      if (isLimitReached || !videoRef.current) return;
      const next = Math.max(0, videoRef.current.currentTime + seconds);
      videoRef.current.currentTime = Math.min(next, videoRef.current.duration || next);
      showHint(seconds > 0 ? `+${seconds}s ⏩` : `${seconds}s ⏪`);
    },
    [isLimitReached, showHint]
  );

  const handleOpenCommentsGesture = useCallback(() => {
    if (isLimitReached) return;
    showHint("💬 Comments");
    onOpenComments?.();
  }, [isLimitReached, onOpenComments, showHint]);

  const handleNextVideoGesture = useCallback(() => {
    if (isLimitReached) return;
    showHint("⏭ Next Video");
    onNextVideo?.();
  }, [isLimitReached, onNextVideo, showHint]);

  const handleClosePlayerGesture = useCallback(() => {
    showHint("✕ Closing…");
    // Small delay so user sees the hint before navigation
    setTimeout(() => onClosePlayer?.(), 400);
  }, [onClosePlayer, showHint]);

  // ─── Attach Gesture Hook ────────────────────────────────────────────────────

  useGestureControls(videoRef, {
    onTogglePlay: handleTogglePlay,
    onSeek: handleSeek,
    onOpenComments: handleOpenCommentsGesture,
    onNextVideo: handleNextVideoGesture,
    onClosePlayer: handleClosePlayerGesture,
  });

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="relative aspect-video bg-black rounded-lg overflow-hidden group select-none">
      {videoSrc && (
        <video
          ref={videoRef}
          src={videoSrc}
          className="w-full h-full"
          controls={!isLimitReached}
          onTimeUpdate={handleTimeUpdate}
          onPause={handlePause}
          poster={`/placeholder.svg?height=480&width=854`}
        >
          Your browser does not support the video tag.
        </video>
      )}

      {/* Gesture feedback overlay */}
      {gestureHint && !isLimitReached && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          aria-hidden="true"
        >
          <span className="bg-black/60 text-white text-2xl font-bold px-6 py-3 rounded-2xl backdrop-blur-sm animate-pulse">
            {gestureHint}
          </span>
        </div>
      )}

      {isLimitReached && <UpgradeBanner planType={userPlan} />}
    </div>
  );
}
