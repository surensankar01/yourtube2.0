import mongoose from "mongoose";

const commentschema = mongoose.Schema(
  {
    userid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    videoid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "videofiles",
      required: true,
    },
    commentbody: { type: String },
    usercommented: { type: String },
    commentedon: { type: Date, default: Date.now },

    /** Users who liked this comment */
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],

    /** Users who disliked this comment.
     *  Comment is auto-deleted when dislikes.length >= 2. */
    dislikes: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],

    /** City of the commenter, detected via IP on the frontend */
    city: { type: String, default: "" },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("comment", commentschema);

