import React from 'react';
import { useEffect, useRef, useState } from 'react';

interface AudioPlayerProps {
  audioUrl: string;
  onClose: () => void;
}

export const AudioPlayer = ({ audioUrl, onClose }: AudioPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const time = Number(e.target.value);
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-2 bg-base-200 rounded-lg p-2 mt-2">
      <audio ref={audioRef} src={audioUrl} />
      
      <button 
        onClick={togglePlayPause}
        className="btn btn-circle btn-sm"
      >
        <span className="text-lg">{isPlaying ? '⏸️' : '▶️'}</span>
      </button>

      <div className="flex-1 flex items-center gap-2">
        <span className="text-xs">{formatTime(currentTime)}</span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          value={currentTime}
          onChange={handleSeek}
          className="range range-xs flex-1"
        />
        <span className="text-xs">{formatTime(duration)}</span>
      </div>

      <button 
        onClick={onClose}
        className="btn btn-circle btn-sm btn-ghost"
      >
        ✕
      </button>
    </div>
  );
}; 