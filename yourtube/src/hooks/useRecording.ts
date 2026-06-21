import { useRef, useState, useEffect } from 'react';

/**
 * Hook to record a MediaStream (e.g., combined local+remote tracks) and provide download functionality.
 * Uses the native MediaRecorder API; data is stored in memory until user clicks download.
 */
export function useRecording(stream: MediaStream | null) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    if (!stream) return;
    // Stop any previous recorder when stream changes
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    const options = { mimeType: 'video/webm; codecs=vp8,opus' } as MediaRecorderOptions;
    const recorder = new MediaRecorder(stream, options);
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        setRecordedChunks((prev) => [...prev, e.data]);
      }
    };
    recorder.onstop = () => setIsRecording(false);
    mediaRecorderRef.current = recorder;
  }, [stream]);

  const start = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'recording') {
      setRecordedChunks([]);
      mediaRecorderRef.current.start();
      setIsRecording(true);
    }
  };

  const stop = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const download = (filename: string = 'call-recording.webm') => {
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
