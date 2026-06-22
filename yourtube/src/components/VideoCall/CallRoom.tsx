"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useWebRTC, PeerStream } from "../../hooks/useWebRTC";
import { useSocketRoom } from "../../hooks/useSocketRoom";
import { useScreenShare } from "../../hooks/useScreenShare";
import { useRecording } from "../../hooks/useRecording";
import VideoTile from "./VideoTile";
import { Toolbar } from "./Toolbar";
import { useRouter } from "next/router";
import { useUser } from "../../lib/AuthContext";
import { Users, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

/**
 * Main call room UI.
 * Handles local media, remote peers, signalling, screen share, recording,
 * participant list and invite link copy.
 */
export default function CallRoom() {
  const router = useRouter();
  const { user } = useUser();

  const {
    localStream,
    peerStreams,
    error,
    startLocalStream,
    createPeerConnection,
    replaceVideoTrack,
    replaceAudioTrack,
    getMixedAudioTrack,
    stopAudioMixing,
    toggleMute,
    toggleCamera,
    isMuted,
    isCameraOff,
    cleanup,
  } = useWebRTC();

  const {
    joinRoom,
    leaveRoom,
    sendOffer,
    sendAnswer,
    sendIceCandidate,
    startScreenShare,
    stopScreenShare,
  } = useSocketRoom({
    userId: user?._id,
    userName: user?.name || "Anonymous",
    onUserJoined: async (payload: any) => {
      const pc = createPeerConnection(
        payload.socketId,
        payload.userId,
        payload.userName,
        (candidate: any) => sendIceCandidate(payload.socketId, candidate)
      );
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendOffer(payload.socketId, offer);
    },
    onUserLeft: ({ socketId }: any) => {
      setParticipants((prev) => prev.filter((p) => p.socketId !== socketId));
    },
    onOffer: async ({ from, offer }: any) => {
      const pc = createPeerConnection(
        from,
        "remote",
        "remote",
        (candidate: any) => sendIceCandidate(from, candidate)
      );
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      sendAnswer(from, answer);
    },
    onAnswer: async ({ from, answer }: any) => {
      const pc = createPeerConnection(
        from,
        "remote",
        "remote",
        (candidate: any) => sendIceCandidate(from, candidate)
      );
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    },
    onIceCandidate: ({ from, candidate }: any) => {
      const pc = createPeerConnection(
        from,
        "remote",
        "remote",
        (c: any) => sendIceCandidate(from, c)
      );
      pc.addIceCandidate(new RTCIceCandidate(candidate));
    },
    onScreenShareStarted: async ({ from }: any) => {},
    onScreenShareStopped: async ({ from }: any) => {},
    onRoomUsers: (users: any[]) => {
      setParticipants(users);
    },
  });

  const [roomId, setRoomId] = useState<string>("");
  const [isRecording, setIsRecording] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [copied, setCopied] = useState(false);
  const [participants, setParticipants] = useState<
    { socketId: string; userId: string; userName: string }[]
  >([]);

  const { screenStream, start: startShare, stop: stopShare } = useScreenShare();
  const {
    start: startRec,
    stop: stopRec,
    download,
    isRecording: recActive,
  } = useRecording();

  // ---------- Initialise everything on mount ----------
  useEffect(() => {
    if (!router.isReady) return;
    const init = async () => {
      const stream = await startLocalStream();
      if (!stream) return;
      const queryRoomId = router.query.roomId as string | undefined;
      const id = await joinRoom(queryRoomId);
      setRoomId(id);
    };
    init();
    return () => {
      leaveRoom();
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady]);

  // Keep participant list up to date when remote peers change
  useEffect(() => {
    setParticipants(
      peerStreams.map((p: PeerStream) => ({
        socketId: p.socketId,
        userId: p.userId || "",
        userName: p.userName || "Participant",
      }))
    );
  }, [peerStreams]);

  // ---------- Screen share ----------
  const handleScreenShare = useCallback(async () => {
    if (screenStream) {
      stopShare();
      replaceVideoTrack(localStream?.getVideoTracks()[0]!);
      stopAudioMixing();
      if (localStream && localStream.getAudioTracks().length > 0) {
        replaceAudioTrack(localStream.getAudioTracks()[0]);
      }
      stopScreenShare();
    } else {
      const stream = await startShare();
      replaceVideoTrack(stream.getVideoTracks()[0]);
      const mixedTrack = getMixedAudioTrack(stream);
      if (mixedTrack) {
        replaceAudioTrack(mixedTrack);
      }
      startScreenShare();
    }
  }, [
    screenStream,
    replaceVideoTrack,
    replaceAudioTrack,
    getMixedAudioTrack,
    stopAudioMixing,
    startShare,
    stopShare,
    startScreenShare,
    stopScreenShare,
    localStream,
  ]);

  // ---------- Recording ----------
  const handleRecord = useCallback(() => {
    if (recActive) {
      stopRec();
      setIsRecording(false);
    } else {
      startRec(localStream, screenStream, peerStreams);
      setIsRecording(true);
    }
  }, [recActive, startRec, stopRec, localStream, screenStream, peerStreams]);

  const downloadRecord = useCallback(() => {
    download(`${roomId}-recording.webm`);
  }, [download, roomId]);

  // ---------- Invite link ----------
  const handleCopyLink = useCallback(async () => {
    if (!roomId) return;
    const link = `${window.location.origin}/video-call/${roomId}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Invite link copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Failed to copy link");
    }
  }, [roomId]);

  if (error)
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-red-400 text-center">
          <p className="text-xl font-semibold mb-2">Camera/Microphone Error</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );

  const allParticipants = [
    { socketId: "local", userId: user?._id || "", userName: user?.name || "You (Local)" },
    ...participants,
  ];

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="px-4 py-3 bg-gray-800 border-b border-gray-700 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <div>
            <p className="text-xs text-gray-400">Room ID</p>
            <p className="text-sm font-mono font-semibold text-blue-300">
              {roomId || "Connecting…"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Participants toggle */}
          <button
            onClick={() => setShowParticipants((v) => !v)}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
          >
            <Users className="w-4 h-4" />
            <span>{allParticipants.length}</span>
            {showParticipants ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>

          {/* Copy invite link */}
          <button
            onClick={handleCopyLink}
            disabled={!roomId}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {copied ? (
              <><Check className="w-4 h-4 text-green-300" /> Copied</>
            ) : (
              <><Copy className="w-4 h-4" /> Invite</>
            )}
          </button>

          <button
            onClick={() => {
              leaveRoom();
              cleanup();
              router.push("/video-call");
            }}
            className="text-sm px-3 py-1.5 bg-red-700 hover:bg-red-600 rounded-lg transition-colors"
          >
            Leave
          </button>
        </div>
      </header>

      {/* Participants panel */}
      {showParticipants && (
        <div className="bg-gray-800 border-b border-gray-700 px-4 py-3">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">
            Participants ({allParticipants.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {allParticipants.map((p) => (
              <div
                key={p.socketId}
                className="flex items-center gap-2 bg-gray-700 rounded-full px-3 py-1"
              >
                <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold uppercase">
                  {(p.userName || "?")[0]}
                </div>
                <span className="text-xs">{p.userName}</span>
                {p.socketId === "local" && (
                  <span className="text-[10px] text-green-400">(You)</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Video grid */}
      <main className="flex-1 overflow-auto p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {localStream && (
          <VideoTile
            stream={screenStream || localStream}
            isLocal
            muted
            label={
              screenStream
                ? `${user?.name || "You"} (Sharing Screen)`
                : user?.name || "You"
            }
          />
        )}
        {peerStreams.map((p: PeerStream) => (
          <VideoTile
            key={p.socketId}
            stream={p.stream}
            label={p.userName || "Participant"}
          />
        ))}
        {/* Placeholder when alone */}
        {peerStreams.length === 0 && localStream && (
          <div className="bg-gray-800 rounded-xl flex flex-col items-center justify-center aspect-video text-gray-500 border-2 border-dashed border-gray-700">
            <Users className="w-10 h-10 mb-2" />
            <p className="text-sm">Waiting for others to join…</p>
            <p className="text-xs mt-1">Share the invite link above</p>
          </div>
        )}
      </main>

      {/* Footer controls */}
      <footer className="p-3 bg-gray-800 border-t border-gray-700 space-y-2">
        <Toolbar
          onToggleAudio={toggleMute}
          onToggleVideo={toggleCamera}
          onHangup={() => {
            leaveRoom();
            cleanup();
            router.push("/video-call");
          }}
          onShareScreen={handleScreenShare}
          onDownloadRecord={downloadRecord}
          isAudioOn={!isMuted}
          isVideoOn={!isCameraOff}
          isRecording={isRecording}
        />
        <div className="flex justify-center">
          <button
            onClick={handleRecord}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
              recActive
                ? "bg-red-600 hover:bg-red-700 animate-pulse"
                : "bg-gray-700 hover:bg-gray-600"
            }`}
          >
            {recActive ? "⏹ Stop Recording" : "⏺ Start Recording"}
          </button>
        </div>
      </footer>
    </div>
  );
}
