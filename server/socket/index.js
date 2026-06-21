/**
 * server/socket/index.js
 * Socket.io signalling server for WebRTC peer-to-peer video calls.
 *
 * In-memory room state (rooms map) is intentionally kept simple.
 * Rooms are validated against MongoDB via REST before joining.
 */

// rooms: { [roomId]: { [socketId]: { userId, userName } } }
const rooms = {};

export const initSocket = (io) => {
  io.on("connection", (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    // ─── Join Room ───────────────────────────────────────────────
    socket.on("join-room", ({ roomId, userId, userName }) => {
      if (!roomId || !userId) return;

      // Enforce max 4 participants
      const roomPeers = rooms[roomId] ? Object.keys(rooms[roomId]).length : 0;
      if (roomPeers >= 4) {
        socket.emit("room-full", { message: "Room is full (max 4 participants)" });
        return;
      }

      socket.join(roomId);

      if (!rooms[roomId]) rooms[roomId] = {};
      rooms[roomId][socket.id] = { userId, userName };

      // Send current user list to the new joiner
      const currentUsers = Object.entries(rooms[roomId])
        .filter(([sid]) => sid !== socket.id)
        .map(([sid, data]) => ({ socketId: sid, ...data }));

      socket.emit("room-users", currentUsers);

      // Notify existing peers
      socket.to(roomId).emit("user-joined", {
        socketId: socket.id,
        userId,
        userName,
      });

      console.log(`[Socket] ${userName} joined room ${roomId}`);
    });

    // ─── WebRTC Signalling Relay ──────────────────────────────────
    socket.on("offer", ({ to, offer }) => {
      io.to(to).emit("offer", { from: socket.id, offer });
    });

    socket.on("answer", ({ to, answer }) => {
      io.to(to).emit("answer", { from: socket.id, answer });
    });

    socket.on("ice-candidate", ({ to, candidate }) => {
      io.to(to).emit("ice-candidate", { from: socket.id, candidate });
    });

    // ─── Screen Share Notification ────────────────────────────────
    socket.on("screen-share-started", ({ roomId }) => {
      socket.to(roomId).emit("screen-share-started", { from: socket.id });
    });

    socket.on("screen-share-stopped", ({ roomId }) => {
      socket.to(roomId).emit("screen-share-stopped", { from: socket.id });
    });

    // ─── Disconnect / Leave ───────────────────────────────────────
    socket.on("leave-room", ({ roomId }) => {
      handleLeave(socket, io, roomId);
    });

    socket.on("disconnect", () => {
      // Find which room this socket was in
      for (const roomId of Object.keys(rooms)) {
        if (rooms[roomId]?.[socket.id]) {
          handleLeave(socket, io, roomId);
          break;
        }
      }
      console.log(`[Socket] Disconnected: ${socket.id}`);
    });
  });
};

function handleLeave(socket, io, roomId) {
  if (!rooms[roomId]?.[socket.id]) return;

  const { userId, userName } = rooms[roomId][socket.id];
  delete rooms[roomId][socket.id];

  // Notify remaining peers
  socket.to(roomId).emit("user-left", { socketId: socket.id, userId, userName });

  // Clean up empty rooms
  if (Object.keys(rooms[roomId]).length === 0) {
    delete rooms[roomId];
  }

  socket.leave(roomId);
  console.log(`[Socket] ${userName} left room ${roomId}`);
}
