import mongoose from "mongoose";
const userschema = mongoose.Schema({
  email: { type: String, required: true },
  name: { type: String },
  channelname: { type: String },
  description: { type: String },
  image: { type: String },
  joinedon: { type: Date, default: Date.now },
  planType: {
    type: String,
    enum: ["free", "bronze", "silver", "gold"],
    default: "free"
  },
  razorpayCustomerId: { type: String },
  phoneNumber: { type: String, unique: true, sparse: true }
});

export default mongoose.model("user", userschema);

