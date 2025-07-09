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
      // If already playing something else, stop it
      if (audioRef.current.src && audioRef.current.src !== audioUrl) {
        audioRef.current.pause();
        setIsPlaying(false);
        setProgress(0);
      }
      
      // Set up new audio
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
        }
      };
      
      audioRef.current.onerror = (e) => {
        console.error('Audio playback error:', e);
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
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Playback error:', error);
      setIsPlaying(false);
    }
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
          className="flex-shrink-0"
        >
          {isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
        </Button>

        {/* Progress Bar */}
        <div className="flex-1">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
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