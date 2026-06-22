import { useRef, useState } from 'react';

/**
 * Hook to record a combined VoIP call session (mixed local audio, screen audio,
 * and remote peer audios) along with the active video track.
 */
export function useRecording() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  const start = (
    localStream: MediaStream | null,
    screenStream: MediaStream | null,
    peerStreams: { stream: MediaStream }[]
  ) => {
    // 1. Gather all audio tracks to mix
    const audioTracks: MediaStreamTrack[] = [];
    if (localStream && localStream.getAudioTracks().length > 0) {
      audioTracks.push(localStream.getAudioTracks()[0]);
    }
    if (screenStream && screenStream.getAudioTracks().length > 0) {
      audioTracks.push(screenStream.getAudioTracks()[0]);
    }
    peerStreams.forEach((p) => {
      if (p.stream && p.stream.getAudioTracks().length > 0) {
        audioTracks.push(p.stream.getAudioTracks()[0]);
      }
    });

    // 2. Select video track (prefer screen share, fallback to camera)
    let videoTrack: MediaStreamTrack | null = null;
    if (screenStream && screenStream.getVideoTracks().length > 0) {
      videoTrack = screenStream.getVideoTracks()[0];
    } else if (localStream && localStream.getVideoTracks().length > 0) {
      videoTrack = localStream.getVideoTracks()[0];
    }

    if (!videoTrack) {
      console.error("No video track found to record.");
      return;
    }

    // 3. Create mixed recording stream
    let recordingStream: MediaStream;
    try {
      if (audioTracks.length > 0) {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioCtx;
        const dest = audioCtx.createMediaStreamDestination();

        audioTracks.forEach((track) => {
          const trackStream = new MediaStream([track]);
          const source = audioCtx.createMediaStreamSource(trackStream);
          source.connect(dest);
        });

        // Combine selected video track and mixed audio track
        recordingStream = new MediaStream([videoTrack, dest.stream.getAudioTracks()[0]]);
      } else {
        recordingStream = new MediaStream([videoTrack]);
      }
    } catch (err) {
      console.error("Failed to mix recording audio, recording with video track only:", err);
      recordingStream = new MediaStream([videoTrack]);
    }

    // 4. Initialize MediaRecorder
    try {
      setRecordedChunks([]);
      const options = { mimeType: 'video/webm; codecs=vp8,opus' };
      const recorder = new MediaRecorder(recordingStream, options);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          setRecordedChunks((prev) => [...prev, e.data]);
        }
      };

      recorder.onstop = () => {
        setIsRecording(false);
        if (audioContextRef.current) {
          audioContextRef.current.close().catch(() => {});
          audioContextRef.current = null;
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(1000); // push chunk every second
      setIsRecording(true);
    } catch (err) {
      console.error("MediaRecorder start error:", err);
    }
  };

  const stop = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const download = (filename: string = 'call-recording.webm') => {
    if (recordedChunks.length === 0) return;
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return { isRecording, start, stop, download, recordedChunks };
}
