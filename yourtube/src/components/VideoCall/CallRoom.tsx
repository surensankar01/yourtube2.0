import React, { useEffect, useState, useCallback } from "react";
import { useWebRTC, PeerStream } from "../../hooks/useWebRTC";
import { useSocketRoom } from "../../hooks/useSocketRoom";
import { useScreenShare } from "../../hooks/useScreenShare";
import { useRecording } from "../../hooks/useRecording";
import VideoTile from "./VideoTile";
import { Toolbar } from "./Toolbar";
import { useRouter } from "next/router";
import { useUser } from "../../lib/AuthContext";

/**
 * Main call room UI.
 * Handles local media, remote peers, signalling, screen share and recording.
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
    userId: user?.uid,
    userName: user?.displayName || "Anonymous",
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
      // clean up UI
      // peer removal is handled inside useWebRTC via removePeer
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
    onScreenShareStarted: async ({ from }: any) => {
      // remote peer started screen share – we just receive the stream via normal track events
    },
    onScreenShareStopped: async ({ from }: any) => {
      // remote stopped screen share – tracks will be removed automatically
    },
  });

  const [roomId, setRoomId] = useState<string>("");
  const [isRecording, setIsRecording] = useState(false);
  const { screenStream, start: startShare, stop: stopShare } = useScreenShare();
  const {
    start: startRec,
    stop: stopRec,
    download,
    isRecording: recActive,
  } = useRecording(localStream);

  // ---------- Initialise everything on mount ----------
  useEffect(() => {
    if (!router.isReady) return;
    const init = async () => {
      const stream = await startLocalStream();
      if (!stream) return;
      const queryRoomId = router.query.roomId as string | undefined;
      const id = await joinRoom(queryRoomId); // auto‑generate if none supplied
      setRoomId(id);
    };
    init();
    return () => {
      leaveRoom();
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady]);

  // ---------- Screen share handling ----------
  const handleScreenShare = useCallback(async () => {
    if (screenStream) {
      // stop sharing
      stopShare();
      replaceVideoTrack(localStream?.getVideoTracks()[0]!);
      stopScreenShare();
    } else {
      const stream = await startShare();
      replaceVideoTrack(stream.getVideoTracks()[0]);
      startScreenShare();
    }
  }, [screenStream, replaceVideoTrack, startShare, stopShare, startScreenShare, stopScreenShare, localStream]);

  // ---------- Recording handling ----------
  const handleRecord = useCallback(() => {
    if (recActive) {
      stopRec();
      setIsRecording(false);
    } else {
      startRec();
      setIsRecording(true);
    }
  }, [recActive, startRec, stopRec]);

  const downloadRecord = useCallback(() => {
    download(`${roomId}-recording.webm`);
  }, [download, roomId]);

  if (error) return <div className="p-4 text-red-600">{error}</div>;

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      <header className="p-4 bg-gray-800 flex justify-between items-center">
        <h2 className="text-xl font-semibold">Room: {roomId}</h2>
        <button onClick={() => router.back()} className="text-sm underline">
          Leave &amp; Return
        </button>
      </header>

      <main className="flex-1 overflow-auto p-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Local video */}
        {localStream && (
          <VideoTile
            stream={localStream}
            isLocal
            muted
            label="You"
          />
        )}
        {/* Remote peers */}
        {peerStreams.map((p: PeerStream) => (
          <VideoTile key={p.socketId} stream={p.stream} label={p.userName} />
        ))}
      </main>

      <footer className="p-2 bg-gray-800">
        <Toolbar
          onToggleAudio={toggleMute}
          onToggleVideo={toggleCamera}
          onHangup={() => router.back()}
          onShareScreen={handleScreenShare}
          onDownloadRecord={downloadRecord}
          isAudioOn={!isMuted}
          isVideoOn={!isCameraOff}
          isRecording={isRecording}
        />
        {/* Simple record button overlay if you want extra control */}
        <div className="mt-2 flex justify-center">
          <button
            onClick={handleRecord}
            className="px-4 py-2 bg-red-600 rounded"
          >
            {recActive ? "Stop Recording" : "Start Recording"}
          </button>
        </div>
      </footer>
    </div>
  );
}
