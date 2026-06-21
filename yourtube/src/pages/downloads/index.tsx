import { useEffect, useState } from "react";
import Link from "next/link";
import { Trash2, Film, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAllDownloads, deleteDownload, DownloadedVideo } from "@/lib/downloadHelper";
import { useUser } from "@/lib/AuthContext";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export default function DownloadsPage() {
  const [downloads, setDownloads] = useState<DownloadedVideo[]>([]);
  const [objectUrls, setObjectUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const { user } = useUser();

  const loadDownloads = async () => {
    try {
      const data = await getAllDownloads();
      setDownloads(data);
    } catch (error) {
      console.error("Error loading local downloads:", error);
      toast.error("Failed to load local downloads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDownloads();
  }, []);

  // Manage Object URLs to prevent memory leaks
  useEffect(() => {
    const urls: Record<string, string> = {};
    downloads.forEach((item) => {
      if (item.videoBlob) {
        urls[item.videoId] = URL.createObjectURL(item.videoBlob);
      }
    });
    setObjectUrls(urls);

    // Clean up
    return () => {
      Object.values(urls).forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, [downloads]);

  const handleDelete = async (videoId: string) => {
    try {
      await deleteDownload(videoId);
      setDownloads((prev) => prev.filter((d) => d.videoId !== videoId));
      toast.success("Download removed from device");
    } catch (error) {
      console.error("Error deleting download:", error);
      toast.error("Failed to delete download");
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-6 flex justify-center items-center h-[50vh]">
        <p className="text-gray-600">Loading downloads...</p>
      </div>
    );
  }

  return (
    <main className="flex-1 p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Downloads</h1>
      </div>

      {!user && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg">
          You are currently viewing downloads in offline/guest mode. Sign in to sync your download limits.
        </div>
      )}

      {downloads.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <Film className="w-16 h-16 mx-auto text-gray-400" />
          <h2 className="text-xl font-semibold">No downloaded videos</h2>
          <p className="text-gray-500 max-w-sm mx-auto">
            Videos you download will appear here so you can watch them offline anytime.
          </p>
          <Link href="/">
            <Button>Find videos to download</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 font-medium">
            {downloads.length} {downloads.length === 1 ? "video" : "videos"} available offline
          </p>
          <div className="grid gap-6 max-w-4xl">
            {downloads.map((item) => {
              const localUrl = objectUrls[item.videoId];
              const downloadDate = item.downloadedAt
                ? new Date(item.downloadedAt)
                : new Date();

              return (
                <div
                  key={item.videoId}
                  className="flex flex-col sm:flex-row gap-4 p-4 border rounded-xl hover:shadow-md transition-shadow bg-card text-card-foreground group"
                >
                  <Link href={`/watch/${item.videoId}`} className="flex-shrink-0">
                    <div className="relative aspect-video w-full sm:w-56 bg-black rounded-lg overflow-hidden flex items-center justify-center">
                      {localUrl ? (
                        <video
                          src={localUrl}
                          className="object-cover w-full h-full"
                          preload="metadata"
                        />
                      ) : (
                        <Film className="w-8 h-8 text-gray-600" />
                      )}
                      <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <span className="bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                          Play Offline
                        </span>
                      </div>
                    </div>
                  </Link>

                  <div className="flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <Link href={`/watch/${item.videoId}`}>
                        <h3 className="font-semibold text-lg line-clamp-2 hover:text-blue-600 transition-colors">
                          {item.videotitle}
                        </h3>
                      </Link>
                      <p className="text-sm text-gray-600 font-medium">
                        {item.videochanel}
                      </p>
                      <p className="text-xs text-gray-500">
                        Downloaded {formatDistanceToNow(downloadDate)} ago (
                        {downloadDate.toLocaleDateString()})
                      </p>
                    </div>

                    <div className="flex items-center justify-end mt-4 sm:mt-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-800 hover:bg-red-50"
                        onClick={() => handleDelete(item.videoId)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Download
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}
