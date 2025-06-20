import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@shared/api-client';
import type { AudioRequest, NarrationSegment } from '@shared/audio-types';

interface AudioPlayerProps {
  segments?: NarrationSegment[];
  emotion?: string;
  intensity?: number;
  text?: string;
  userId?: string;
  storyId?: number;
  characters?: any[];
  voice?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
}

export function AudioPlayer({
  segments,
  emotion,
  intensity,
  text,
  userId,
  storyId,
  characters,
  voice,
  className = '',
  size = 'md',
  variant = 'default'
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  const buttonSizes = {
    sm: 'h-8 w-8 p-0',
    md: 'h-10 w-10 p-0',
    lg: 'h-12 w-12 p-0'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const playEmotionSample = async () => {
    if (!emotion || !text) {
      toast({
        title: "Missing Data",
        description: "Emotion and text are required for playback",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await apiClient.generateEmotionSample({
        emotion,
        intensity: intensity || 5,
        text,
        userId,
        storyId,
        characters,
        voice
      });

      if (!response.success || !response.data?.audioUrl) {
        throw new Error(response.error || 'Failed to generate audio');
      }

      const audio = new Audio(response.data.audioUrl);
      audioRef.current = audio;
      
      audio.onended = () => {
        setIsPlaying(false);
        audioRef.current = null;
      };
      
      audio.onerror = () => {
        setIsPlaying(false);
        setIsLoading(false);
        toast({
          title: "Playback Failed",
          description: "Could not play audio sample",
          variant: "destructive",
        });
      };

      await audio.play();
      setIsPlaying(true);
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      setIsPlaying(false);
      toast({
        title: "Audio Generation Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const playNarration = async () => {
    if (!segments || segments.length === 0) return;

    if (currentSegmentIndex >= segments.length) {
      setCurrentSegmentIndex(0);
      return;
    }

    const segment = segments[currentSegmentIndex];
    const audio = new Audio(segment.audioUrl);
    audioRef.current = audio;

    audio.onended = () => {
      const nextIndex = currentSegmentIndex + 1;
      if (nextIndex < segments.length) {
        setCurrentSegmentIndex(nextIndex);
      } else {
        setIsPlaying(false);
        setCurrentSegmentIndex(0);
        audioRef.current = null;
      }
    };

    audio.onerror = () => {
      setIsPlaying(false);
      toast({
        title: "Playback Failed",
        description: `Could not play segment ${currentSegmentIndex + 1}`,
        variant: "destructive",
      });
    };

    await audio.play();
    setIsPlaying(true);
  };

  useEffect(() => {
    if (isPlaying && segments && currentSegmentIndex < segments.length) {
      playNarration();
    }
  }, [currentSegmentIndex]);

  const handlePlay = async () => {
    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
      return;
    }

    if (segments && segments.length > 0) {
      await playNarration();
    } else {
      await playEmotionSample();
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Button
        onClick={handlePlay}
        disabled={isLoading}
        size={size}
        variant={variant}
        className={buttonSizes[size]}
      >
        {isLoading ? (
          <Loader2 className={`${iconSizes[size]} animate-spin`} />
        ) : isPlaying ? (
          <Pause className={iconSizes[size]} />
        ) : (
          <Play className={iconSizes[size]} />
        )}
      </Button>

      {audioRef.current && (
        <Button
          onClick={toggleMute}
          size={size}
          variant="ghost"
          className={buttonSizes[size]}
        >
          {isMuted ? (
            <VolumeX className={iconSizes[size]} />
          ) : (
            <Volume2 className={iconSizes[size]} />
          )}
        </Button>
      )}

      {segments && segments.length > 0 && (
        <span className="text-sm text-muted-foreground">
          {currentSegmentIndex + 1} / {segments.length}
        </span>
      )}
    </div>
  );
}