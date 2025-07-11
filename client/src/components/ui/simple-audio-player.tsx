import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Volume2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

interface SimpleAudioPlayerProps {
  audioUrl: string | null;
  className?: string;
  showVolumeControl?: boolean;
}

export function SimpleAudioPlayer({ 
  audioUrl, 
  className = "",
  showVolumeControl = true
}: SimpleAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.volume = volume;
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  // Update audio source when URL changes
  useEffect(() => {
    if (audioRef.current && audioUrl) {
      // Convert relative URL to absolute for comparison
      const absoluteUrl = audioUrl.startsWith('http') ? audioUrl : `${window.location.origin}${audioUrl}`;
      
      // If already playing something else, stop it
      if (audioRef.current.src && audioRef.current.src !== absoluteUrl) {
        audioRef.current.pause();
        setIsPlaying(false);
        setProgress(0);
      }
      
      // Set up new audio with the original URL (relative or absolute)
      audioRef.current.src = audioUrl;
      
      // Set up event handlers
      audioRef.current.onended = () => {
        setIsPlaying(false);
        setProgress(0);
      };
      
      audioRef.current.ontimeupdate = () => {
        if (audioRef.current && audioRef.current.duration) {
          const progressPercent = (audioRef.current.currentTime / audioRef.current.duration) * 100;
          setProgress(progressPercent);
          setCurrentTime(audioRef.current.currentTime);
        }
      };
      
      audioRef.current.onloadedmetadata = () => {
        if (audioRef.current) {
          setDuration(audioRef.current.duration);
        }
      };
      
      audioRef.current.onerror = (e) => {
        console.error('Audio playback error:', e, 'URL:', audioUrl);
        setIsPlaying(false);
      };
    }
  }, [audioUrl]);

  // Handle volume changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const handlePlayPause = async () => {
    if (!audioRef.current || !audioUrl) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        console.log('Attempting to play audio:', audioUrl);
        console.log('Audio element src:', audioRef.current.src);
        console.log('Audio ready state:', audioRef.current.readyState);
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (error: any) {
      console.error('Playback error:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        audioUrl,
        readyState: audioRef.current?.readyState,
        networkState: audioRef.current?.networkState,
        error: audioRef.current?.error
      });
      setIsPlaying(false);
    }
  };

  const handleSeek = (newProgress: number) => {
    if (!audioRef.current || !audioRef.current.duration) return;
    
    const newTime = (newProgress / 100) * audioRef.current.duration;
    audioRef.current.currentTime = newTime;
    setProgress(newProgress);
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!audioUrl) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center gap-4">
        <Button
          onClick={handlePlayPause}
          size="sm"
          variant="outline"
          className="flex-shrink-0 bg-green-600 hover:bg-green-700 text-white border-green-600"
        >
          {isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
        </Button>

        {/* Progress Bar - Clickable for seeking */}
        <div className="flex-1 space-y-1">
          <div 
            className="h-2 bg-muted rounded-full overflow-hidden cursor-pointer relative"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const clickedProgress = (x / rect.width) * 100;
              handleSeek(clickedProgress);
            }}
          >
            <div 
              className="h-full bg-primary transition-all duration-200 pointer-events-none"
              style={{ width: `${progress}%` }}
            />
          </div>
          {/* Time display */}
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Volume Control */}
        {showVolumeControl && (
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-muted-foreground" />
            <Slider
              value={[volume * 100]}
              onValueChange={([value]) => setVolume(value / 100)}
              max={100}
              step={1}
              className="w-24"
            />
          </div>
        )}
      </div>
    </div>
  );
}