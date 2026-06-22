import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import { createServer } from "http";
import { Server } from "socket.io";
import userroutes from "./routes/auth.js";
import videoroutes from "./routes/video.js";
import likeroutes from "./routes/like.js";
import watchlaterroutes from "./routes/watchlater.js";
import historyrroutes from "./routes/history.js";
import commentroutes from "./routes/comment.js";
import paymentroutes from "./routes/payment.js";
import downloadroutes from "./routes/download.js";
import roomroutes from "./routes/room.js";
import { initSocket } from "./socket/index.js";
dotenv.config();
const app = express();
import path from "path";
app.use(cors());
app.use(express.json({ limit: "30mb", extended: true }));
app.use(express.urlencoded({ limit: "30mb", extended: true }));
app.use("/uploads", express.static(path.join("uploads")));
app.get("/", (req, res) => {
  res.send("You tube backend is working");
});
app.use(bodyParser.json());
app.use("/user", userroutes);
app.use("/video", videoroutes);
app.use("/like", likeroutes);
app.use("/watch", watchlaterroutes);
app.use("/history", historyrroutes);
app.use("/comment", commentroutes);
app.use("/payment", paymentroutes);
app.use("/download", downloadroutes);
app.use("/room", roomroutes);

const PORT = Number(process.env.PORT) || 5000;

// Create HTTP server so Socket.io can share the same port
const httpServer = createServer(app);

// Attach Socket.io with CORS for local dev
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// Boot signalling server
initSocket(io);

function startServer(port, attempt = 0) {
  // Guard against invalid or out‑of‑range ports
  const numericPort = Number(port);
  if (Number.isNaN(numericPort) || numericPort < 0 || numericPort > 65535) {
    console.error(`❌ Invalid port number: ${port}`);
    process.exit(1);
  }
  if (attempt > 5) {
    console.error('❌ Unable to start server after multiple attempts.');
    process.exit(1);
    return;
  }
  // Attempt to listen on the current port
  httpServer.listen(numericPort)
    .once('listening', () =>
      console.log(`✅ Server running on port ${numericPort}`)
    )
    .once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`⚠️ Port ${numericPort} in use, trying next port...`);
        // Close the server before retrying a new port
        httpServer.close(() => startServer(numericPort + 1, attempt + 1));
      } else {
        console.error('❌ Server failed to start:', err);
        process.exit(1);
      }
    });
}

startServer(PORT);

const DBURL = process.env.DB_URL;

// Function to attempt primary DB connection, fallback to local MongoDB if needed
async function connectDB() {
  try {
    await mongoose.connect(DBURL, {
      serverSelectionTimeoutMS: 10000,
      family: 4,
    });
    console.log("✅ MongoDB connected (primary).");
  } catch (primaryError) {
    console.warn("⚠️ Primary MongoDB connection failed:", primaryError.message);
    // Attempt fallback to a local MongoDB instance
    const fallbackURL = "mongodb://127.0.0.1:27017/yourtube";
    try {
      await mongoose.connect(fallbackURL, {
        serverSelectionTimeoutMS: 10000,
        family: 4,
      });
      console.log("✅ Connected to fallback local MongoDB.");
    } catch (fallbackError) {
      console.error("❌ Both primary and fallback MongoDB connections failed:", fallbackError);
    }
  }
}

connectDB();