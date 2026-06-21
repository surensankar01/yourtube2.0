import Comments from "@/components/Comments";
import RelatedVideos from "@/components/RelatedVideos";
import VideoInfo from "@/components/VideoInfo";
import Videopplayer from "@/components/Videopplayer";
import axiosInstance from "@/lib/axiosinstance";
import { useRouter } from "next/router";
import React, { useCallback, useEffect, useRef, useState } from "react";

const WatchPage = () => {
  const router = useRouter();
  const { id } = router.query;

  const [currentVideo, setCurrentVideo] = useState<any>(null);
  const [allVideos, setAllVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Ref to the comments section for triple-tap-left gesture
  const commentsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchVideo = async () => {
      if (!id || typeof id !== "string") return;
      try {
        const res = await axiosInstance.get("/video/getall");
        const allVids: any[] = res.data || [];
        const matched = allVids.find((v: any) => v._id === id);
        setCurrentVideo(matched || null);
        setAllVideos(allVids);
      } catch (error) {
        console.error("Error fetching videos:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchVideo();
  }, [id]);

  // ─── Gesture Callbacks ─────────────────────────────────────────────────────

  /** Triple-tap LEFT → smoothly scroll to the comments section */
  const handleOpenComments = useCallback(() => {
    if (commentsRef.current) {
      commentsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  /** Triple-tap CENTER → navigate to the next video in the fetched list */
  const handleNextVideo = useCallback(() => {
    if (!allVideos.length || !id) return;
    const currentIndex = allVideos.findIndex((v: any) => v._id === id);
    const nextIndex = (currentIndex + 1) % allVideos.length; // wraps around
    const nextVideo = allVideos[nextIndex];
    if (nextVideo?._id) {
      router.push(`/watch/${nextVideo._id}`);
    }
  }, [allVideos, id, router]);

  /** Triple-tap RIGHT → go back to the previous page */
  const handleClosePlayer = useCallback(() => {
    router.back();
  }, [router]);

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500 text-sm animate-pulse">Loading video…</p>
      </div>
    );
  }

  if (!currentVideo) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500 text-sm">Video not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: player + info + comments */}
          <div className="lg:col-span-2 space-y-4">
            <Videopplayer
              video={currentVideo}
              onOpenComments={handleOpenComments}
              onNextVideo={handleNextVideo}
              onClosePlayer={handleClosePlayer}
            />

            <VideoInfo video={currentVideo} />

            {/* Comments anchor – triple-tap left scrolls here */}
            <div ref={commentsRef} id="comments-section">
              <Comments videoId={id} />
            </div>
          </div>

          {/* Right column: related videos */}
          <div className="space-y-4">
            <RelatedVideos videos={allVideos} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default WatchPage;

