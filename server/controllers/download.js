import path from "path";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import Download from "../Modals/download.js";
import User from "../Modals/Auth.js";
import Video from "../Modals/video.js";

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const DAILY_LIMIT = 1; // Free users: 1 download per day (as per approved spec)

// Check daily download limit
export const checkLimit = async (req, res) => {
  const userId = req.user?._id || req.params.userId;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isPremium = user.planType && user.planType !== "free";

    if (isPremium) {
      return res.status(200).json({
        limitReached: false,
        isPremium: true,
        count: 0,
        limit: Infinity,
      });
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const count = await Download.countDocuments({
      viewer: userId,
      downloadedAt: { $gte: startOfToday },
    });

    return res.status(200).json({
      limitReached: count >= DAILY_LIMIT,
      isPremium: false,
      count,
      limit: DAILY_LIMIT,
    });
  } catch (error) {
    console.error("Error checking download limit:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Download a video
export const downloadVideo = async (req, res) => {
  const { videoId } = req.params;
  const userId = req.user?._id || req.query.userId;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    const isPremium = user.planType && user.planType !== "free";

    // 1. Enforce Daily Limit (unless premium)
    if (!isPremium) {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const count = await Download.countDocuments({
        viewer: userId,
        downloadedAt: { $gte: startOfToday },
      });

      if (count >= DAILY_LIMIT) {
        return res.status(403).json({
          message: `Daily download limit of ${DAILY_LIMIT} reached. Upgrade to premium for unlimited downloads!`,
        });
      }
    }

    // 2. Resolve original video file path
    // video.filepath is normally like: uploads\filename.mp4
    const originalPath = path.resolve(video.filepath);

    if (!fs.existsSync(originalPath)) {
      return res.status(404).json({ message: "Source video file not found on server" });
    }

    // 3. Log download history
    await Download.create({
      viewer: userId,
      videoid: videoId,
      downloadedAt: new Date(),
    });

    // 4. Stream video file based on plan status
    if (isPremium) {
      // Premium user gets original quality directly
      res.setHeader("Content-Disposition", `attachment; filename="${video.filename}"`);
      res.setHeader("Content-Type", video.filetype || "video/mp4");
      return res.sendFile(originalPath);
    } else {
      // Free user gets low-res (360p) version
      const dir = path.dirname(originalPath);
      const ext = path.extname(originalPath);
      const base = path.basename(originalPath, ext);
      const lowResFileName = `lowres_${video._id}.mp4`;
      const lowResPath = path.join(dir, lowResFileName);

      // Check if low-res cached version already exists
      if (fs.existsSync(lowResPath)) {
        res.setHeader("Content-Disposition", `attachment; filename="${base}_360p.mp4"`);
        res.setHeader("Content-Type", "video/mp4");
        return res.sendFile(lowResPath);
      }

      // Perform downscaling/transcoding
      console.log(`Transcoding video ${video._id} to 360p...`);
      ffmpeg(originalPath)
        .size("?x360")
        .videoBitrate("500k")
        .outputOptions("-movflags +faststart")
        .toFormat("mp4")
        .on("start", (cmd) => {
          console.log("FFmpeg command started:", cmd);
        })
        .on("end", () => {
          console.log("Transcoding finished successfully.");
          res.setHeader("Content-Disposition", `attachment; filename="${base}_360p.mp4"`);
          res.setHeader("Content-Type", "video/mp4");
          return res.sendFile(lowResPath);
        })
        .on("error", (err) => {
          console.error("FFmpeg transcoding error:", err);
          // Fallback to original path in case transcoding fails
          if (!res.headersSent) {
            res.setHeader("Content-Disposition", `attachment; filename="${video.filename}"`);
            res.setHeader("Content-Type", video.filetype || "video/mp4");
            return res.sendFile(originalPath);
          }
        })
        .save(lowResPath);
    }
  } catch (error) {
    console.error("Error during download:", error);
    if (!res.headersSent) {
      return res.status(500).json({ message: "Internal server error" });
    }
  }
};

// Get download history
export const getDownloadHistory = async (req, res) => {
  const userId = req.user?._id || req.params.userId;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    const downloads = await Download.find({ viewer: userId })
      .populate({
        path: "videoid",
        model: "videofiles",
      })
      .sort({ downloadedAt: -1 })
      .exec();

    return res.status(200).json(downloads);
  } catch (error) {
    console.error("Error fetching download history:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
