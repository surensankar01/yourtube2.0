import React, { useEffect, useState } from "react";
import VideoCard from "@/components/videocard";
import axiosInstance from "@/lib/axiosinstance";
import { Compass, Film, Flame, Trophy, Newspaper, Music } from "lucide-react";

export default function Explore() {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const res = await axiosInstance.get("/video/getall");
        setVideos(res.data);
      } catch (error) {
        console.error("Error fetching explore videos:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchVideos();
  }, []);

  const categories = [
    { name: "Trending", icon: <Flame className="w-6 h-6 text-red-500" />, color: "bg-red-50 dark:bg-red-950/20" },
    { name: "Music", icon: <Music className="w-6 h-6 text-blue-500" />, color: "bg-blue-50 dark:bg-blue-950/20" },
    { name: "Movies", icon: <Film className="w-6 h-6 text-purple-500" />, color: "bg-purple-50 dark:bg-purple-950/20" },
    { name: "Gaming", icon: <Trophy className="w-6 h-6 text-green-500" />, color: "bg-green-50 dark:bg-green-950/20" },
    { name: "News", icon: <Newspaper className="w-6 h-6 text-orange-500" />, color: "bg-orange-50 dark:bg-orange-950/20" },
  ];

  return (
    <main className="flex-1 p-6 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3 border-b pb-4">
          <Compass className="w-8 h-8 text-red-600 animate-pulse" />
          <h1 className="text-3xl font-extrabold tracking-tight">Explore</h1>
        </div>

        {/* Category Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {categories.map((cat) => (
            <div
              key={cat.name}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-red-500 dark:hover:border-red-500 cursor-pointer transition-all hover:shadow-md ${cat.color}`}
            >
              {cat.icon}
              <span className="mt-2 text-sm font-semibold">{cat.name}</span>
            </div>
          ))}
        </div>

        {/* Videos Section */}
        <div>
          <h2 className="text-xl font-bold mb-4">Trending Videos</h2>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, idx) => (
                <div key={idx} className="space-y-3 animate-pulse">
                  <div className="aspect-video bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
                  <div className="flex gap-3">
                    <div className="w-9 h-9 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4" />
                      <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : Array.isArray(videos) && videos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {videos.map((video) => (
                <VideoCard key={video._id} video={video} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-zinc-500">
              No videos found in Explore.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
