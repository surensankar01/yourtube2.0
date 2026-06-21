import video from "../Modals/video.js";
import history from "../Modals/history.js";

export const handlehistory = async (req, res) => {
  const { userId } = req.body;
  const { videoId } = req.params;
  try {
    await history.create({ viewer: userId, videoid: videoId });
    await video.findByIdAndUpdate(videoId, { $inc: { views: 1 } });
    return res.status(200).json({ history: true });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
export const handleview = async (req, res) => {
  const { videoId } = req.params;
  try {
    await video.findByIdAndUpdate(videoId, { $inc: { views: 1 } });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
export const getallhistoryVideo = async (req, res) => {
  const { userId } = req.params;
  try {
    const historyvideo = await history
      .find({ viewer: userId })
      .populate({
        path: "videoid",
        model: "videofiles",
      })
      .exec();
    return res.status(200).json(historyvideo);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const saveProgress = async (req, res) => {
  const { videoId } = req.params;
  const { userId, watchedTime } = req.body;

  if (!userId || watchedTime === undefined) {
    return res.status(400).json({ message: "User ID and watchedTime are required" });
  }

  try {
    let record = await history.findOne({ viewer: userId, videoid: videoId });
    if (record) {
      record.watchedTime = watchedTime;
      await record.save();
    } else {
      record = await history.create({
        viewer: userId,
        videoid: videoId,
        watchedTime: watchedTime,
      });
      // Increment video view count for first watch
      await video.findByIdAndUpdate(videoId, { $inc: { views: 1 } });
    }
    return res.status(200).json({ success: true, watchedTime: record.watchedTime });
  } catch (error) {
    console.error("Error saving progress:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getProgress = async (req, res) => {
  const { videoId, userId } = req.params;

  if (!userId || !videoId) {
    return res.status(400).json({ message: "User ID and Video ID are required" });
  }

  try {
    const record = await history.findOne({ viewer: userId, videoid: videoId });
    const watchedTime = record ? record.watchedTime : 0;
    return res.status(200).json({ watchedTime });
  } catch (error) {
    console.error("Error getting progress:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

