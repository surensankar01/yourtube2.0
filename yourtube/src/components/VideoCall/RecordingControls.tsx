import React, { useState } from 'react';

interface RecordingControlsProps {
  onStart: () => void;
  onStop: () => void;
  downloadUrl?: string;
}

export const RecordingControls: React.FC<RecordingControlsProps> = ({ onStart, onStop, downloadUrl }) => {
  const [recording, setRecording] = useState(false);

  const handleStart = () => {
    onStart();
    setRecording(true);
  };

  const handleStop = () => {
    onStop();
    setRecording(false);
  };

  return (
    <div className="flex items-center space-x-4 mt-2">
      {!recording ? (
        <button
          onClick={handleStart}
          className="px-3 py-1 bg-green-600 text-white rounded"
        >
          Start Recording
        </button>
      ) : (
        <button
          onClick={handleStop}
          className="px-3 py-1 bg-red-600 text-white rounded"
        >
          Stop Recording
        </button>
      )}
      {downloadUrl && (
        <a
          href={downloadUrl}
          download="call-recording.webm"
          className="px-3 py-1 bg-blue-600 text-white rounded"
        >
          Download
        </a>
      )}
    </div>
  );
};
