import { useState, useRef, useEffect } from "react";
import { Play, Pause, VolumeX, Volume2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface StoryNarratorProps {
  storyId: number;
  storyContent: string;
  emotions: Array<{
    emotion: string;
    intensity: number;
    context: string;
    quote?: string;
  }>;
  className?: string;
}

interface NarrationSegment {
  text: string;
  emotion: string;
  audioUrl?: string;
  duration?: number;
}

export function StoryNarrator({ storyId, storyContent, emotions, className = "" }: StoryNarratorProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentSegment, setCurrentSegment] = useState(0);
  const [narrationSegments, setNarrationSegments] = useState<NarrationSegment[]>([]);
  const [audioVisualData, setAudioVisualData] = useState<number[]>(new Array(40).fill(0));
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const visualizerIntervalRef = useRef<number | null>(null);
  const { toast } = useToast();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (visualizerIntervalRef.current) {
        clearInterval(visualizerIntervalRef.current);
      }
    };
  }, []);

  const generateNarration = async () => {
    setIsLoading(true);
    try {
      // Request narration generation from the server
      const response = await apiRequest(`/api/stories/${storyId}/generate-narration`, {
        method: 'POST',
        body: JSON.stringify({
          content: storyContent,
          emotions: emotions
        })
      });

      if (response.segments) {
        setNarrationSegments(response.segments);
        toast({
          title: "Narration Ready",
          description: "Your story narration has been generated using your voice samples."
        });
      }
    } catch (error) {
      console.error('Error generating narration:', error);
      toast({
        title: "Narration Error",
        description: "Could not generate story narration. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const setupAudioVisualizer = (audio: HTMLAudioElement) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 128;
      
      const source = audioContextRef.current.createMediaElementSource(audio);
      source.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);
    }

    const updateVisualizer = () => {
      if (analyserRef.current) {
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Convert to percentage and create visual bars
        const visualData = Array.from(dataArray.slice(0, 40)).map(value => (value / 255) * 100);
        setAudioVisualData(visualData);
      }
    };

    visualizerIntervalRef.current = setInterval(updateVisualizer, 100);
  };

  const playNarration = async () => {
    if (narrationSegments.length === 0) {
      await generateNarration();
      return;
    }

    if (audioRef.current && narrationSegments[currentSegment]?.audioUrl) {
      try {
        const segment = narrationSegments[currentSegment];
        audioRef.current.src = segment.audioUrl;
        audioRef.current.muted = isMuted;
        
        setupAudioVisualizer(audioRef.current);
        
        audioRef.current.ontimeupdate = () => {
          if (audioRef.current) {
            const progress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
            setProgress(progress);
          }
        };

        audioRef.current.onended = () => {
          if (currentSegment < narrationSegments.length - 1) {
            setCurrentSegment(prev => prev + 1);
            // Will automatically play next segment
          } else {
            // Story narration complete
            setIsPlaying(false);
            setCurrentSegment(0);
            setProgress(0);
            if (visualizerIntervalRef.current) {
              clearInterval(visualizerIntervalRef.current);
              setAudioVisualData(new Array(40).fill(0));
            }
          }
        };

        await audioRef.current.play();
        setIsPlaying(true);
      } catch (error) {
        console.error('Error playing narration:', error);
        toast({
          title: "Playback Error",
          description: "Could not play story narration.",
          variant: "destructive"
        });
      }
    }
  };

  const pauseNarration = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      if (visualizerIntervalRef.current) {
        clearInterval(visualizerIntervalRef.current);
      }
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // Auto-play next segment when currentSegment changes
  useEffect(() => {
    if (isPlaying && currentSegment > 0) {
      playNarration();
    }
  }, [currentSegment]);

  const hasUserVoiceEmotions = emotions.length > 0;
  const totalSegments = narrationSegments.length;
  const currentEmotion = narrationSegments[currentSegment]?.emotion || '';

  return (
    <Card className={`w-full bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-purple-500/30 ${className}`}>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">🎭 Story Narration</h3>
              <p className="text-sm text-gray-400">
                {hasUserVoiceEmotions 
                  ? "Narrated with your voice samples"
                  : "Record emotion voices to unlock personalized narration"
                }
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={toggleMute}
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Audio Visualizer */}
          <div className="bg-black/30 rounded-lg p-4">
            <div className="flex items-end justify-center space-x-1 h-20">
              {audioVisualData.map((height, index) => (
                <div
                  key={index}
                  className="bg-gradient-to-t from-purple-500 to-pink-500 rounded-sm transition-all duration-100 ease-out"
                  style={{
                    width: '6px',
                    height: `${Math.max(height, 5)}%`,
                    opacity: isPlaying ? 0.8 : 0.3
                  }}
                />
              ))}
            </div>
          </div>

          {/* Progress Bar */}
          {totalSegments > 0 && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <div className="flex justify-between text-xs text-gray-400">
                <span>Segment {currentSegment + 1} of {totalSegments}</span>
                {currentEmotion && (
                  <span className="capitalize">Current: {currentEmotion}</span>
                )}
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-center space-x-4">
            <Button
              onClick={isPlaying ? pauseNarration : playNarration}
              disabled={isLoading || !hasUserVoiceEmotions}
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating...
                </>
              ) : isPlaying ? (
                <>
                  <Pause className="w-5 h-5 mr-2" />
                  Pause Story
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  {totalSegments > 0 ? 'Continue Story' : 'Play Story'}
                </>
              )}
            </Button>
          </div>

          {/* Instructions for users without voice samples */}
          {!hasUserVoiceEmotions && (
            <div className="text-center p-4 bg-yellow-900/20 rounded-lg border border-yellow-500/30">
              <p className="text-sm text-yellow-300">
                📝 Record your voice for different emotions in the sections above to unlock personalized story narration
              </p>
            </div>
          )}
        </div>

        {/* Hidden audio element */}
        <audio ref={audioRef} preload="metadata" />
      </CardContent>
    </Card>
  );
}