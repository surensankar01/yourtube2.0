import { useEffect, useRef, useCallback } from "react";
import { getSocket } from "../lib/socketClient";
import { generateRoomId } from "../lib/roomUtils";

/**
 * Hook that encapsulates all Socket.io signalling logic for a video‑call room.
 * It expects the caller to provide the current user's id / name and optional callbacks.
 */
export function useSocketRoom({ 
  userId, 
  userName, 
  onUserJoined, 
  onUserLeft, 
  onOffer, 
  onAnswer, 
  onIceCandidate, 
  onScreenShareStarted, 
  onScreenShareStopped 
}: any) {
  const socketRef = useRef<any>(null);
  const roomIdRef = useRef<string>("");

  const joinRoom = useCallback(async (roomId?: string) => {
    const socket = getSocket();
    socketRef.current = socket;
    const finalRoomId = roomId || generateRoomId();
    roomIdRef.current = finalRoomId;
    if (!socket.connected) socket.connect();
    socket.emit("join-room", { roomId: finalRoomId, userId, userName });

    // ── W-01 fix: remove listeners before re-adding to prevent stacking ──────
    socket.off("room-users").on("room-users", (peers: any[]) => {
      peers.forEach((p) => onUserJoined && onUserJoined(p));
    });
    socket.off("user-joined").on("user-joined", (payload: any) => onUserJoined && onUserJoined(payload));
    socket.off("user-left").on("user-left", (payload: any) => onUserLeft && onUserLeft(payload));
    socket.off("offer").on("offer", ({ from, offer }: any) => onOffer && onOffer({ from, offer }));
    socket.off("answer").on("answer", ({ from, answer }: any) => onAnswer && onAnswer({ from, answer }));
    socket.off("ice-candidate").on("ice-candidate", ({ from, candidate }: any) => onIceCandidate && onIceCandidate({ from, candidate }));
    socket.off("screen-share-started").on("screen-share-started", ({ from }: any) => onScreenShareStarted && onScreenShareStarted({ from }));
    socket.off("screen-share-stopped").on("screen-share-stopped", ({ from }: any) => onScreenShareStopped && onScreenShareStopped({ from }));
    socket.off("room-full").on("room-full", (msg: any) => alert(msg.message));
    return finalRoomId;
  }, [userId, userName, onUserJoined, onUserLeft, onOffer, onAnswer, onIceCandidate, onScreenShareStarted, onScreenShareStopped]);

  const leaveRoom = useCallback(() => {
    const socket = socketRef.current;
    if (socket && roomIdRef.current) {
      socket.emit("leave-room", { roomId: roomIdRef.current });
      socket.disconnect();
    }
  }, []);

  const sendOffer = useCallback((to: any, offer: any) => {
    socketRef.current?.emit("offer", { to, offer });
  }, []);

  const sendAnswer = useCallback((to: any, answer: any) => {
    socketRef.current?.emit("answer", { to, answer });
  }, []);

  const sendIceCandidate = useCallback((to: any, candidate: any) => {
    socketRef.current?.emit("ice-candidate", { to, candidate });
  }, []);

  const startScreenShare = useCallback(() => {
    socketRef.current?.emit("screen-share-started", { roomId: roomIdRef.current });
  }, []);

  const stopScreenShare = useCallback(() => {
    socketRef.current?.emit("screen-share-stopped", { roomId: roomIdRef.current });
  }, []);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      leaveRoom();
    };
  }, [leaveRoom]);

  return { joinRoom, leaveRoom, sendOffer, sendAnswer, sendIceCandidate, startScreenShare, stopScreenShare };
}

