import React from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Share2, Download } from 'lucide-react';

interface ToolbarProps {
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onHangup: () => void;
  onShareScreen: () => void;
  onDownloadRecord: () => void;
  isAudioOn: boolean;
  isVideoOn: boolean;
  isRecording: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  onToggleAudio,
  onToggleVideo,
  onHangup,
  onShareScreen,
  onDownloadRecord,
  isAudioOn,
  isVideoOn,
  isRecording,
}) => {
  return (
    <div className="flex space-x-4 bg-gray-800 p-2 rounded justify-center items-center">
      <button 
        onClick={onToggleAudio} 
        className="flex items-center gap-1.5 px-3 py-1.5 rounded hover:bg-gray-700 text-white transition-colors"
      >
        {isAudioOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4 text-red-500" />} 
        {isAudioOn ? 'Mute' : 'Unmute'}
      </button>
      <button 
        onClick={onToggleVideo} 
        className="flex items-center gap-1.5 px-3 py-1.5 rounded hover:bg-gray-700 text-white transition-colors"
      >
        {isVideoOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4 text-red-500" />} 
        {isVideoOn ? 'Video Off' : 'Video On'}
      </button>
      <button 
        onClick={onShareScreen} 
        className="flex items-center gap-1.5 px-3 py-1.5 rounded hover:bg-gray-700 text-white transition-colors"
      >
        <Share2 className="h-4 w-4" /> Share Screen
      </button>
      
      {isRecording && (
        <button
          onClick={onDownloadRecord}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white transition-colors font-medium animate-bounce"
        >
          <Download className="h-4 w-4" /> Download Recording
        </button>
      )}

      <button 
        onClick={onHangup} 
        className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-red-600 hover:bg-red-700 text-white transition-colors font-medium ml-auto"
      >
        <PhoneOff className="h-4 w-4" /> Hang Up
      </button>
    </div>
  );
};

