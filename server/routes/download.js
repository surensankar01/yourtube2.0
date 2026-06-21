import express from "express";
import { checkLimit, downloadVideo, getDownloadHistory } from "../controllers/download.js";

const router = express.Router();

router.get("/check-limit/:userId", checkLimit);
router.get("/video/:videoId", downloadVideo);
router.get("/history/:userId", getDownloadHistory);

export default router;
