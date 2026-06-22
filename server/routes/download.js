import express from "express";
import { checkLimit, downloadVideo, getDownloadHistory } from "../controllers/download.js";
import { verifyTokenOptional } from "../middleware/verifyToken.js";

const router = express.Router();

router.get("/check-limit/:userId", verifyTokenOptional, checkLimit);
router.get("/video/:videoId", verifyTokenOptional, downloadVideo);
router.get("/history/:userId", verifyTokenOptional, getDownloadHistory);

export default router;
