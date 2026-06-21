import mongoose from "mongoose";

const roomschema = mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
    },
    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    maxPeers: {
      type: Number,
      default: 4,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 86400, // Auto-delete after 24 hours (TTL index)
    },
  }
);

export default mongoose.model("room", roomschema);
