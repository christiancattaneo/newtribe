import React from 'react';

interface AudioPlayerProps {
  audioUrl: string;
  onClose: () => void;
}

export function AudioPlayer({ audioUrl, onClose }: AudioPlayerProps) {
  return (
    <>
      <audio src={audioUrl} autoPlay />
      <button 
        onClick={onClose}
        className="btn btn-sm"
      >
        Stop ⏹️
      </button>
    </>
  );
} 