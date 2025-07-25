import { useState, useRef, useEffect } from "react";
import { Play, Pause, VolumeX, Volume2, Loader2, Headphones, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { toast, toastMessages } from "@/lib/toast-utils";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

interface StoryPlayButtonProps {
  storyId: number;
  variant?: 'full' | 'compact' | 'mini';
  className?: string;
  showTitle?: boolean;
}

interface NarrationStatus {
  canNarrate: boolean;
  emotions: string[];
  storyTitle?: string;
  reason?: string;
}

interface NarrationSegment {
  text: string;
  emotion: string;
  audioUrl?: string;
  duration?: number;
}

/**
 * Self-contained story narration component that can be used anywhere
 * Automatically fetches story data and checks if user has voice samples
 */
export function StoryPlayButton({ 
  storyId, 
  variant = 'compact', 
  className = "",
  showTitle = true 
}: StoryPlayButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentSegment, setCurrentSegment] = useState(0);
  const [narrationSegments, setNarrationSegments] = useState<NarrationSegment[]>([]);
  const [audioVisualData, setAudioVisualData] = useState<number[]>(new Array(40).fill(0));
  const [narrationStatus, setNarrationStatus] = useState<NarrationStatus | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [volume, setVolume] = useState(0.85); // Default to 85% volume for better audio quality
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const visualizerIntervalRef = useRef<number | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Check narration capability on mount
  useEffect(() => {
    if (user) {
      checkNarrationStatus();
    }
  }, [storyId, user]);

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

  // Apply volume when it changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const checkNarrationStatus = async () => {
    if (!user) return;
    
    setIsCheckingStatus(true);
    try {
      const response = await apiRequest(`/api/stories/${storyId}/narration/check`, {
        method: 'GET'
      });
      setNarrationStatus(response);
    } catch (error) {
      console.error('Error checking narration status:', error);
      setNarrationStatus({
        canNarrate: false,
        emotions: [],
        reason: 'Unable to check narration capability'
      });
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const generateNarration = async () => {
    if (!user || !narrationStatus?.canNarrate) return;

    setIsLoading(true);
    try {
      // Get story content and narrative analysis
      const [storyResponse, analysisResponse] = await Promise.all([
        apiRequest(`/api/stories/${storyId}`, { method: 'GET' }),
        apiRequest(`/api/stories/${storyId}/narrative`, { method: 'GET' })
      ]);

      if (!storyResponse.content || !analysisResponse.emotions) {
        throw new Error('Story content or analysis not found');
      }

      // Generate narration using existing working route
      const response = await apiRequest(`/api/stories/${storyId}/narration`, {
        method: 'POST',
        body: JSON.stringify({
          content: storyResponse.content,
          emotions: analysisResponse.emotions
        })
      });

      console.log('Narration response:', response);
      if (response.segments) {
        console.log('Setting segments:', response.segments);
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
        
        const visualData = Array.from(dataArray.slice(0, 40)).map(value => (value / 255) * 100);
        setAudioVisualData(visualData);
      }
    };

    visualizerIntervalRef.current = window.setInterval(updateVisualizer, 100);
  };

  const playNarration = async () => {
    console.log('playNarration called with segments:', narrationSegments.length);
    if (narrationSegments.length === 0) {
      await generateNarration();
      return;
    }

    console.log('Current segment:', currentSegment, 'Segment data:', narrationSegments[currentSegment]);
    if (audioRef.current && narrationSegments[currentSegment]?.audioUrl) {
      try {
        const segment = narrationSegments[currentSegment];
        console.log('Playing segment with audioUrl:', segment.audioUrl);
        audioRef.current.src = segment.audioUrl;
        audioRef.current.muted = isMuted;
        audioRef.current.volume = volume; // Apply volume setting
        
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
          } else {
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

  // Debug rendering
  console.log('StoryPlayButton render:', { user: !!user, storyId, variant, isCheckingStatus, narrationStatus });
  
  // Don't render if no user
  if (!user) {
    console.log('StoryPlayButton: No user, not rendering');
    return null;
  }

  // Mini variant - just a play button
  if (variant === 'mini') {
    return (
      <Button
        onClick={playNarration}
        disabled={isLoading || !narrationStatus?.canNarrate}
        size="sm"
        variant="default"
        className={`${className} text-purple-400 hover:text-purple-300`}
        title="Play story narration"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Headphones className="w-4 h-4" />
        )}
      </Button>
    );
  }

  // Compact variant - horizontal button with basic info
  if (variant === 'compact') {
    return (
      <div className={`flex items-center space-x-3 bg-white/10 p-4 rounded-lg border border-purple-500/30 ${className}`}>
        <Button
          onClick={isPlaying ? pauseNarration : playNarration}
          disabled={isLoading || !narrationStatus?.canNarrate}
          size="lg"
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
          title="Play story narration"
        >
          {isLoading || isCheckingStatus ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              {isCheckingStatus ? 'Checking Voice...' : 'Generating...'}
            </>
          ) : isPlaying ? (
            <>
              <Pause className="w-5 h-5 mr-2" />
              Pause Story
            </>
          ) : (
            <>
              <Headphones className="w-5 h-5 mr-2" />
              Play Story
            </>
          )}
        </Button>

        {/* Audio visualizer bars - always visible */}
        <div className="flex items-center space-x-1">
          {Array.from({ length: 20 }, (_, index) => (
            <div
              key={index}
              className={`w-1 bg-gradient-to-t transition-all duration-100 ${
                isPlaying 
                  ? 'from-purple-500 to-pink-500' 
                  : narrationStatus?.canNarrate 
                    ? 'from-purple-400/50 to-pink-400/50'
                    : 'from-gray-500 to-gray-400'
              }`}
              style={{ 
                height: `${isPlaying 
                  ? Math.max(4, (audioVisualData[index] || 0) * 30) 
                  : Math.max(4, Math.random() * 20)
                }px` 
              }}
            />
          ))}
        </div>

        <div className="text-sm text-white">
          <div className="font-medium">Story Narration</div>
          <div className="text-xs text-gray-300">
            {narrationStatus?.canNarrate 
              ? '✓ Voice ready' 
              : narrationStatus?.reason || 'Checking voices...'}
          </div>
        </div>
      </div>
    );
  }

  // Full variant - complete player with visualizer
  return (
    <Card className={`w-full bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-purple-500/30 ${className}`}>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center">
                <Headphones className="w-5 h-5 mr-2" />
                Story Narration
              </h3>
              <p className="text-sm text-gray-400">
                {narrationStatus?.canNarrate 
                  ? "Narrated with your voice samples"
                  : "Record emotion voices to unlock personalized narration"
                }
              </p>
              {showTitle && narrationStatus?.storyTitle && (
                <p className="text-sm text-purple-300 mt-1">
                  {narrationStatus.storyTitle}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Button
                  onClick={toggleMute}
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </Button>
                <div className="flex items-center space-x-2">
                  <Slider
                    value={[volume * 100]}
                    onValueChange={(value) => {
                      const newVolume = value[0] / 100;
                      setVolume(newVolume);
                      if (audioRef.current) {
                        audioRef.current.volume = newVolume;
                      }
                    }}
                    max={100}
                    step={5}
                    className="w-24"
                    aria-label="Volume"
                  />
                  <span className="text-xs text-gray-400 w-10">
                    {Math.round(volume * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Audio Visualizer */}
          {narrationStatus?.canNarrate && (
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
          )}

          {/* Progress Bar */}
          {narrationSegments.length > 0 && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <div className="flex justify-between text-xs text-gray-400">
                <span>Segment {currentSegment + 1} of {narrationSegments.length}</span>
                {narrationSegments[currentSegment]?.emotion && (
                  <span className="capitalize">Current: {narrationSegments[currentSegment].emotion}</span>
                )}
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-center space-x-4">
            <Button
              onClick={isPlaying ? pauseNarration : playNarration}
              disabled={isLoading || !narrationStatus?.canNarrate}
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
              title="Play story narration"
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
                  {narrationSegments.length > 0 ? 'Continue Story' : 'Play Story'}
                </>
              )}
            </Button>
          </div>

          {/* Instructions for users without voice samples */}
          {!narrationStatus?.canNarrate && (
            <div className="text-center p-4 bg-yellow-900/20 rounded-lg border border-yellow-500/30">
              <p className="text-sm text-yellow-300 flex items-center justify-center">
                <Mic className="w-4 h-4 mr-2" />
                Record your voice for different emotions to unlock personalized story narration
              </p>
              {narrationStatus?.emotions && narrationStatus.emotions.length > 0 && (
                <p className="text-xs text-gray-400 mt-2">
                  Story contains: {narrationStatus.emotions.join(', ')}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Hidden audio element */}
        <audio ref={audioRef} preload="metadata" />
      </CardContent>
    </Card>
  );
}

// Export variants for easy use
export const MiniStoryPlayer = (props: Omit<StoryPlayButtonProps, 'variant'>) => 
  <StoryPlayButton {...props} variant="mini" />;

export const CompactStoryPlayer = (props: Omit<StoryPlayButtonProps, 'variant'>) => 
  <StoryPlayButton {...props} variant="compact" />;

export const FullStoryPlayer = (props: Omit<StoryPlayButtonProps, 'variant'>) => 
  <StoryPlayButton {...props} variant="full" />;