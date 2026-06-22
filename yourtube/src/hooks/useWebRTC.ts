import { useEffect, useRef, useState, useCallback } from "react";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export interface PeerStream {
  socketId: string;
  userId: string;
  userName: string;
  stream: MediaStream;
}

export function useWebRTC() {
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Record<string, RTCPeerConnection>>({});
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const screenSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peerStreams, setPeerStreams] = useState<PeerStream[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Start the local camera + microphone */
  const startLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.error("getUserMedia error:", err);
      setError("Could not access camera/microphone. Please check permissions.");
      return null;
    }
  }, []);

  /** Create a new RTCPeerConnection for a given remote peer, or return
   *  the existing one if it was already created. This prevents duplicate
   *  PCs being made when offer → answer → ice-candidate all arrive in
   *  sequence for the same peer (CE-07 fix). */
  const createPeerConnection = useCallback(
    (
      socketId: string,
      userId: string,
      userName: string,
      onIceCandidate: (candidate: RTCIceCandidate) => void
    ) => {
      // ── Return existing PC to avoid duplicate connection objects ──────────
      if (peersRef.current[socketId]) {
        return peersRef.current[socketId];
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);

      // Add local tracks to the connection
      localStreamRef.current?.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });

      // ICE candidate forwarding
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          onIceCandidate(event.candidate);
        }
      };

      // Receive remote stream
      pc.ontrack = (event) => {
        const remoteStream = event.streams[0];
        setPeerStreams((prev) => {
          const exists = prev.find((p) => p.socketId === socketId);
          if (exists) {
            return prev.map((p) =>
              p.socketId === socketId ? { ...p, stream: remoteStream } : p
            );
          }
          return [...prev, { socketId, userId, userName, stream: remoteStream }];
        });
      };

      pc.onconnectionstatechange = () => {
        if (
          pc.connectionState === "failed" ||
          pc.connectionState === "disconnected"
        ) {
          removePeer(socketId);
        }
      };

      peersRef.current[socketId] = pc;
      return pc;
    },
    []
  );

  const removePeer = useCallback((socketId: string) => {
    peersRef.current[socketId]?.close();
    delete peersRef.current[socketId];
    setPeerStreams((prev) => prev.filter((p) => p.socketId !== socketId));
  }, []);

  const getPeer = useCallback(
    (socketId: string) => peersRef.current[socketId],
    []
  );

  /** Replace the video track on all peer connections (for screen sharing) */
  const replaceVideoTrack = useCallback((newTrack: MediaStreamTrack) => {
    Object.values(peersRef.current).forEach((pc) => {
      const sender = pc
        .getSenders()
        .find((s) => s.track?.kind === "video");
      if (sender) sender.replaceTrack(newTrack);
    });
  }, []);

  /** Replace the audio track on all peer connections */
  const replaceAudioTrack = useCallback((newTrack: MediaStreamTrack) => {
    Object.values(peersRef.current).forEach((pc) => {
      const sender = pc
        .getSenders()
        .find((s) => s.track?.kind === "audio");
      if (sender) sender.replaceTrack(newTrack);
    });
  }, []);

  /** Mix local microphone and screen share audio if screen audio is present, and return the combined audio track */
  const getMixedAudioTrack = useCallback((screenStream: MediaStream | null) => {
    const micTrack = localStreamRef.current?.getAudioTracks()[0];
    if (!micTrack) return null;

    const screenAudioTrack = screenStream?.getAudioTracks()[0];
    if (!screenAudioTrack) {
      // Revert to pure microphone audio
      return micTrack;
    }

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      if (!audioDestinationRef.current) {
        audioDestinationRef.current = ctx.createMediaStreamDestination();
      }
      const dest = audioDestinationRef.current;

      if (micSourceRef.current) micSourceRef.current.disconnect();
      if (screenSourceRef.current) screenSourceRef.current.disconnect();

      const micStream = new MediaStream([micTrack]);
      micSourceRef.current = ctx.createMediaStreamSource(micStream);
      micSourceRef.current.connect(dest);

      const screenAudioStream = new MediaStream([screenAudioTrack]);
      screenSourceRef.current = ctx.createMediaStreamSource(screenAudioStream);
      screenSourceRef.current.connect(dest);

      return dest.stream.getAudioTracks()[0];
    } catch (err) {
      console.error("Failed to mix audio tracks:", err);
      return micTrack;
    }
  }, []);

  const stopAudioMixing = useCallback(() => {
    if (micSourceRef.current) {
      micSourceRef.current.disconnect();
      micSourceRef.current = null;
    }
    if (screenSourceRef.current) {
      screenSourceRef.current.disconnect();
      screenSourceRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
      audioDestinationRef.current = null;
    }
  }, []);

  /** Toggle microphone mute */
  const toggleMute = useCallback(() => {
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
    setIsMuted((prev) => !prev);
  }, []);

  /** Toggle camera on/off */
  const toggleCamera = useCallback(() => {
    localStreamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
    setIsCameraOff((prev) => !prev);
  }, []);

  /** Stop all local tracks and close all peer connections */
  const cleanup = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    Object.values(peersRef.current).forEach((pc) => pc.close());
    peersRef.current = {};
    localStreamRef.current = null;
    setLocalStream(null);
    setPeerStreams([]);
  }, []);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return {
    localStream,
    peerStreams,
    isMuted,
    isCameraOff,
    error,
    startLocalStream,
    createPeerConnection,
    removePeer,
    getPeer,
    replaceVideoTrack,
    replaceAudioTrack,
    getMixedAudioTrack,
    stopAudioMixing,
    toggleMute,
    toggleCamera,
    cleanup,
  };
}
