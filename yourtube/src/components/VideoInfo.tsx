import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  Clock,
  Download,
  MoreHorizontal,
  Share,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { getDownload, saveDownload, deleteDownload } from "@/lib/downloadHelper";
import { toast } from "sonner";
import axios from "axios";

const VideoInfo = ({ video }: any) => {
  const [likes, setlikes] = useState(video.Like || 0);
  const [dislikes, setDislikes] = useState(video.Dislike || 0);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const { user } = useUser();
  const [isWatchLater, setIsWatchLater] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    const checkDownloaded = async () => {
      if (video?._id) {
        const saved = await getDownload(video._id);
        setIsDownloaded(!!saved);
      }
    };
    checkDownloaded();
  }, [video?._id]);

  const handleDownload = async () => {
    if (!user) {
      toast.error("Please sign in to download videos");
      return;
    }

    try {
      setIsDownloading(true);
      setDownloadProgress(0);

      // 1. Check download limit
      const limitCheck = await axiosInstance.get(`/download/check-limit/${user._id}`);
      if (limitCheck.data.limitReached) {
        toast.error(`Daily download limit of ${limitCheck.data.limit} reached. Upgrade to premium for unlimited downloads!`);
        setIsDownloading(false);
        return;
      }

      const quality = user.planType && user.planType !== "free" ? "Premium (Original Quality)" : "Standard (360p)";
      toast.info(`Starting download: ${quality}`);

      // 2. Fetch video as a blob using Axios with progress tracking
      const response = await axios({
        url: `${axiosInstance.defaults.baseURL || "http://localhost:5000"}/download/video/${video._id}?userId=${user._id}`,
        method: "GET",
        responseType: "blob",
        onDownloadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setDownloadProgress(percentCompleted);
          } else {
            setDownloadProgress((prev) => (prev < 95 ? prev + 5 : prev));
          }
        },
      });

      // 3. Save video file to IndexedDB
      await saveDownload(
        {
          videoId: video._id,
          videotitle: video.videotitle,
          videochanel: video.videochanel,
          downloadedAt: new Date().toISOString(),
          filepath: video.filepath,
        },
        response.data
      );

      setIsDownloaded(true);
      toast.success("Download complete! Video is now available offline.");
    } catch (error: any) {
      console.error("Download failed:", error);
      const msg = error.response?.data?.message || "Failed to download video. Please try again.";
      toast.error(msg);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDeleteDownload = async () => {
    try {
      await deleteDownload(video._id);
      setIsDownloaded(false);
      toast.success("Download deleted from device");
    } catch (error) {
      console.error("Failed to delete download:", error);
      toast.error("Failed to delete download");
    }
  };

  useEffect(() => {
    setlikes(video.Like || 0);
    setDislikes(video.Dislike || 0);
    setIsLiked(false);
    setIsDisliked(false);
  }, [video]);

  useEffect(() => {
    const handleviews = async () => {
      if (user) {
        try {
          return await axiosInstance.post(`/history/${video._id}`, {
            userId: user?._id,
          });
        } catch (error) {
          return console.log(error);
        }
      } else {
        return await axiosInstance.post(`/history/views/${video?._id}`);
      }
    };
    handleviews();
  }, [user]);
  const handleLike = async () => {
    if (!user) return;
    try {
      const res = await axiosInstance.post(`/like/${video._id}`, {
        userId: user?._id,
      });
      if (res.data.liked) {
        if (isLiked) {
          setlikes((prev: any) => prev - 1);
          setIsLiked(false);
        } else {
          setlikes((prev: any) => prev + 1);
          setIsLiked(true);
          if (isDisliked) {
            setDislikes((prev: any) => prev - 1);
            setIsDisliked(false);
          }
        }
      }
    } catch (error) {
      console.log(error);
    }
  };
  const handleWatchLater = async () => {
    try {
      const res = await axiosInstance.post(`/watch/${video._id}`, {
        userId: user?._id,
      });
      if (res.data.watchlater) {
        setIsWatchLater(!isWatchLater);
      } else {
        setIsWatchLater(false);
      }
    } catch (error) {
      console.log(error);
    }
  };
  const handleDislike = async () => {
    if (!user) return;
    try {
      const res = await axiosInstance.post(`/like/${video._id}`, {
        userId: user?._id,
      });
      if (!res.data.liked) {
        if (isDisliked) {
          setDislikes((prev: any) => prev - 1);
          setIsDisliked(false);
        } else {
          setDislikes((prev: any) => prev + 1);
          setIsDisliked(true);
          if (isLiked) {
            setlikes((prev: any) => prev - 1);
            setIsLiked(false);
          }
        }
      }
    } catch (error) {
      console.log(error);
    }
  };
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{video.videotitle}</h1>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="w-10 h-10">
            <AvatarFallback>{video.videochanel[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-medium">{video.videochanel}</h3>
            <p className="text-sm text-gray-600">1.2M subscribers</p>
          </div>
          <Button className="ml-4">Subscribe</Button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-gray-100 rounded-full">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-l-full"
              onClick={handleLike}
            >
              <ThumbsUp
                className={`w-5 h-5 mr-2 ${
                  isLiked ? "fill-black text-black" : ""
                }`}
              />
              {likes.toLocaleString()}
            </Button>
            <div className="w-px h-6 bg-gray-300" />
            <Button
              variant="ghost"
              size="sm"
              className="rounded-r-full"
              onClick={handleDislike}
            >
              <ThumbsDown
                className={`w-5 h-5 mr-2 ${
                  isDisliked ? "fill-black text-black" : ""
                }`}
              />
              {dislikes.toLocaleString()}
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className={`bg-gray-100 rounded-full ${
              isWatchLater ? "text-primary" : ""
            }`}
            onClick={handleWatchLater}
          >
            <Clock className="w-5 h-5 mr-2" />
            {isWatchLater ? "Saved" : "Watch Later"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="bg-gray-100 rounded-full"
          >
            <Share className="w-5 h-5 mr-2" />
            Share
          </Button>
          {isDownloading ? (
            <Button
              variant="ghost"
              size="sm"
              className="bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 font-medium"
              disabled
            >
              <span className="animate-pulse mr-2">⬇</span>
              {downloadProgress}%
            </Button>
          ) : isDownloaded ? (
            <Button
              variant="ghost"
              size="sm"
              className="bg-green-100 text-green-700 rounded-full hover:bg-red-100 hover:text-red-700 font-medium transition-colors"
              onClick={handleDeleteDownload}
              title="Click to remove from downloads"
            >
              <span className="mr-2">✓</span>
              Downloaded
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="bg-gray-100 rounded-full font-medium"
              onClick={handleDownload}
            >
              <Download className="w-5 h-5 mr-2" />
              Download
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="bg-gray-100 rounded-full"
          >
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        </div>
      </div>
      <div className="bg-gray-100 rounded-lg p-4">
        <div className="flex gap-4 text-sm font-medium mb-2">
          <span>{video.views.toLocaleString()} views</span>
          <span>{formatDistanceToNow(new Date(video.createdAt))} ago</span>
        </div>
        <div className={`text-sm ${showFullDescription ? "" : "line-clamp-3"}`}>
          <p>
            Sample video description. This would contain the actual video
            description from the database.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 p-0 h-auto font-medium"
          onClick={() => setShowFullDescription(!showFullDescription)}
        >
          {showFullDescription ? "Show less" : "Show more"}
        </Button>
      </div>
    </div>
  );
};

export default VideoInfo;
