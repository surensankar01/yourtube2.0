import comment from "../Modals/comment.js";
import mongoose from "mongoose";

// Blocks injection-risk characters: < > { } [ ] \ |
const SPECIAL_CHAR_REGEX = /[<>{}\[\]\\|]/;

// ─── Post comment ─────────────────────────────────────────────────────────────

export const postcomment = async (req, res) => {
  const commentdata = req.body;

  // Server-side special character validation
  if (SPECIAL_CHAR_REGEX.test(commentdata.commentbody || "")) {
    return res
      .status(400)
      .json({ message: "Comment contains blocked special characters: < > { } [ ] \\ |" });
  }

  // city is accepted from req.body and stored as-is
  const postcomment = new comment(commentdata);
  try {
    await postcomment.save();
    return res.status(200).json({ comment: true });
  } catch (error) {
    console.error("postcomment error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// ─── Get all comments for a video ─────────────────────────────────────────────

export const getallcomment = async (req, res) => {
  const { videoid } = req.params;
  try {
    const commentvideo = await comment
      .find({ videoid })
      .sort({ createdAt: -1 }); // newest first
    return res.status(200).json(commentvideo);
  } catch (error) {
    console.error("getallcomment error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// ─── Delete comment ───────────────────────────────────────────────────────────

export const deletecomment = async (req, res) => {
  const { id: _id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }
  try {
    await comment.findByIdAndDelete(_id);
    return res.status(200).json({ comment: true });
  } catch (error) {
    console.error("deletecomment error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// ─── Edit comment ─────────────────────────────────────────────────────────────

export const editcomment = async (req, res) => {
  const { id: _id } = req.params;
  const { commentbody } = req.body;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }
  if (SPECIAL_CHAR_REGEX.test(commentbody || "")) {
    return res
      .status(400)
      .json({ message: "Comment contains blocked special characters: < > { } [ ] \\ |" });
  }
  try {
    const updatecomment = await comment.findByIdAndUpdate(
      _id,
      { $set: { commentbody } },
      { new: true }
    );
    res.status(200).json(updatecomment);
  } catch (error) {
    console.error("editcomment error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// ─── Like a comment ───────────────────────────────────────────────────────────
// Toggles the like. If the user already liked → removes like.
// If the user disliked → removes dislike and adds like.

export const likeComment = async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).send("comment unavailable");
  }

  try {
    const doc = await comment.findById(id);
    if (!doc) return res.status(404).json({ message: "Comment not found" });

    const alreadyLiked = doc.likes.some((lid) => lid.toString() === userId);

    if (alreadyLiked) {
      // Toggle off
      doc.likes = doc.likes.filter((lid) => lid.toString() !== userId);
    } else {
      // Add like; remove from dislikes if present
      doc.likes.push(userId);
      doc.dislikes = doc.dislikes.filter((did) => did.toString() !== userId);
    }

    await doc.save();
    return res.status(200).json({ likes: doc.likes, dislikes: doc.dislikes });
  } catch (error) {
    console.error("likeComment error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// ─── Dislike a comment ────────────────────────────────────────────────────────
// Toggles the dislike. Auto-deletes the comment when dislikes.length >= 2.

export const dislikeComment = async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).send("comment unavailable");
  }

  try {
    const doc = await comment.findById(id);
    if (!doc) return res.status(404).json({ message: "Comment not found" });

    const alreadyDisliked = doc.dislikes.some((did) => did.toString() === userId);

    if (alreadyDisliked) {
      // Toggle off
      doc.dislikes = doc.dislikes.filter((did) => did.toString() !== userId);
      await doc.save();
      return res.status(200).json({ likes: doc.likes, dislikes: doc.dislikes });
    }

    // Add dislike; remove from likes if present
    doc.dislikes.push(userId);
    doc.likes = doc.likes.filter((lid) => lid.toString() !== userId);

    // Auto-delete when 2 or more unique users have disliked
    if (doc.dislikes.length >= 2) {
      await comment.findByIdAndDelete(id);
      return res.status(200).json({ deleted: true });
    }

    await doc.save();
    return res.status(200).json({ likes: doc.likes, dislikes: doc.dislikes });
  } catch (error) {
    console.error("dislikeComment error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// ─── Translate comment ────────────────────────────────────────────────────────
// Uses the free Google Translate public endpoint (no API key required).
// Node 18+ has native fetch; no extra packages needed.

export const translateComment = async (req, res) => {
  const { text, targetLang } = req.body;

  if (!text || !targetLang) {
    return res.status(400).json({ message: "text and targetLang are required" });
  }

  try {
    const url =
      `https://translate.googleapis.com/translate_a/single` +
      `?client=gtx&sl=auto&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(text)}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Translation API responded with ${response.status}`);

    const data = await response.json();

    // Response shape: [ [ ["translated chunk", "original chunk", ...], ... ], ... ]
    const translated = data[0]?.map((chunk) => chunk[0]).join("") || text;

    return res.status(200).json({ translated });
  } catch (error) {
    console.error("translateComment error:", error);
    return res.status(500).json({ message: "Translation failed. Please try again." });
  }
};

