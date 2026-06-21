import mongoose from "mongoose";

const otpSchema = new mongoose.Schema(
  {
    identifier: {
      type: String,
      required: true,
      index: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: "5m" }, // TTL index to auto-delete after 5 minutes
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("otp", otpSchema);
