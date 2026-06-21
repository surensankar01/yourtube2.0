import express from "express";
import {
  deletecomment,
  dislikeComment,
  editcomment,
  getallcomment,
  likeComment,
  postcomment,
  translateComment,
} from "../controllers/comment.js";

const routes = express.Router();

// Existing routes
routes.get("/:videoid", getallcomment);
routes.post("/postcomment", postcomment);
routes.delete("/deletecomment/:id", deletecomment);
routes.post("/editcomment/:id", editcomment);

// Task 6 – new routes
routes.post("/like/:id", likeComment);
routes.post("/dislike/:id", dislikeComment);
routes.post("/translate", translateComment);

export default routes;

