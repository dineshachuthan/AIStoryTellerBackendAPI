import { useState, useEffect, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast, toastMessages } from "@/lib/toast-utils";
import { ArrowLeft, Play, Pause, SkipBack, SkipForward, Volume2, Share2, Users, Settings, Mic, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { ConfidenceMeter, useConfidenceTracking } from "@/components/confidence-meter";
import { useAuth } from "@/hooks/use-auth";

interface NarrationSegment {
  text: string;
  emotion: string;
  intensity: number;
  voiceUrl?: string;
  startTime: number;
  duration: number;
  characterName?: string;
}

interface StoryNarration {
  storyId: number;
  totalDuration: number;
  segments: NarrationSegment[];
  pacing: 'slow' | 'normal' | 'fast';
}

export default function StoryPlayer() {
  const { storyId } = useParams();
  const [, setLocation] = useLocation();

  const queryClient = useQueryClient();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [grandmaNarration, setGrandmaNarration] = useState(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());

  // Authentication and user context
  const { user } = useAuth();
  
  // Confidence tracking
  const confidenceTracking = storyId && user ? useConfidenceTracking(parseInt(storyId), user.id) : null;

  // Fetch story details
  const { data: story, isLoading: storyLoading } = useQuery({
    queryKey: [`/api/stories/${storyId}`],
    queryFn: () => apiClient.stories.get(parseInt(storyId!)),
    enabled: !!storyId,
  });

  // Fetch story narration
  const { data: narration, isLoading: narrationLoading } = useQuery<StoryNarration>({
    queryKey: [`/api/stories/${storyId}/narration`],
    queryFn: () => apiClient.stories.getNarration(parseInt(storyId!)),
    enabled: !!storyId,
  });

  // Fetch voice assignments
  const { data: voiceAssignments = [] } = useQuery({
    queryKey: [`/api/stories/${storyId}/voice-assignments`],
    queryFn: () => apiClient.stories.getVoiceAssignments ? apiClient.stories.getVoiceAssignments(parseInt(storyId!)) : [],
    enabled: !!storyId,
  });

  // Generate grandma/grandpa narration
  const generateNarrationMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/stories/${storyId}/grandma-narration`, {
        method: 'POST',
      });
    },
    onSuccess: (data) => {
      setGrandmaNarration(data);
      toast.success("Your personalized story narration is ready to play.");
    },
    onError: (error) => {
      toast.error("Could not generate narration. Please try again.");
    },
  });

  const currentNarration = grandmaNarration || narration;
  const currentSegment = grandmaNarration?.segments?.[currentSegmentIndex] 
    ? {
        text: grandmaNarration.segments[currentSegmentIndex].text,
        emotion: grandmaNarration.segments[currentSegmentIndex].emotion,
        intensity: grandmaNarration.segments[currentSegmentIndex].intensity,
        voiceUrl: grandmaNarration.segments[currentSegmentIndex].audioUrl,
        startTime: currentSegmentIndex * 2000,
        duration: 2000
      }
    : currentNarration?.segments?.[currentSegmentIndex];
  
  // Calculate total duration - use grandmaNarration if available, fallback to computed
  const computedTotalDuration = grandmaNarration?.segments?.length 
    ? grandmaNarration.segments.length * 2000 
    : currentNarration?.segments?.reduce((total, segment) => total + (segment.duration || 2000), 0) || 0;
  const effectiveTotalDuration = (grandmaNarration?.totalDuration && !isNaN(grandmaNarration.totalDuration)) 
    ? grandmaNarration.totalDuration 
    : (currentNarration?.totalDuration && !isNaN(currentNarration.totalDuration))
    ? currentNarration.totalDuration 
    : computedTotalDuration || 12000; // Default 12 seconds for 6 segments
  const progress = effectiveTotalDuration > 0 ? (currentTime / effectiveTotalDuration) * 100 : 0;

  // Auto-start story playback when component loads - DISABLED to prevent automatic narration failures
  // useEffect(() => {
  //   if (story && !grandmaNarration && !generateNarrationMutation.isPending && !isPlaying) {
  //     // Always use character-based narration for proper audio playback
  //     playCharacterNarration();
  //   }
  // }, [story, grandmaNarration]);

  // Auto-play when grandma narration is loaded
  useEffect(() => {
    if (grandmaNarration && grandmaNarration.segments && grandmaNarration.segments.length > 0 && !isPlaying) {
      setCurrentSegmentIndex(0);
      setIsPlaying(true);
      
      // Convert simple segments to narration segments for playback
      const firstSegment = {
        text: grandmaNarration.segments[0].text,
        voiceUrl: grandmaNarration.segments[0].audioUrl,
        emotion: grandmaNarration.segments[0].emotion,
        intensity: grandmaNarration.segments[0].intensity,
        startTime: 0,
        duration: 2000 // 2 seconds per segment
      };
      
      playSegmentAudio(firstSegment, 0);
    }
  }, [grandmaNarration]);

  // Generate character-based narration with user voice samples
  const playCharacterNarration = async () => {
    if (!story) return;

    try {
      // Generate character-based narration using user voice samples for emotions
      const response = await apiRequest(`/api/stories/${storyId}/character-narration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          useUserVoices: true,
          userId: user?.id || null
        }),
      });

      setGrandmaNarration(response);
      
      // Start playing the first segment
      if (response.segments && response.segments.length > 0) {
        setCurrentSegmentIndex(0);
        playSegmentAudio(response.segments[0], 0);
        setIsPlaying(true);
        
        // Track playback start for confidence meter
        if (confidenceTracking) {
          confidenceTracking.trackPlayback();
        }
      }

    } catch (error) {
      console.error("Character narration error:", error);
      toast.error("Could not generate character-based narration.");
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isPlaying && narration) {
      interval = setInterval(() => {
        setCurrentTime(prev => {
          const newTime = prev + 100; // Update every 100ms
          
          // Check if we need to move to next segment
          const nextSegment = narration.segments.find(
            segment => segment.startTime <= newTime && segment.startTime + segment.duration > newTime
          );
          
          if (nextSegment) {
            const newIndex = narration.segments.indexOf(nextSegment);
            if (newIndex !== currentSegmentIndex) {
              setCurrentSegmentIndex(newIndex);
              playSegmentAudio(nextSegment);
            }
          }
          
          // Stop if we've reached the end
          if (newTime >= narration.totalDuration) {
            setIsPlaying(false);
            return narration.totalDuration;
          }
          
          return newTime;
        });
      }, 100);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, narration, currentSegmentIndex]);

  const playSegmentAudio = (segment: NarrationSegment, segmentIndex: number) => {
    if (segment.voiceUrl) {
      console.log("Playing segment:", segment.text, "URL:", segment.voiceUrl, "Index:", segmentIndex);
      
      // Create new audio element for each segment to avoid conflicts
      const audioElement = new Audio();
      audioElement.src = segment.voiceUrl;
      audioElement.volume = volume;
      audioElement.muted = false;
      audioElement.preload = 'auto';
      audioElement.crossOrigin = 'anonymous';
      
      // Update the ref for volume controls
      audioRef.current = audioElement;
      
      // Ensure audio can play - handle browser autoplay policies
      audioElement.play().then(() => {
        console.log("Audio playback started successfully");
        console.log("Audio volume:", audioElement.volume);
        console.log("Audio muted:", audioElement.muted);
        console.log("Audio duration:", audioElement.duration);
        console.log("Audio current time:", audioElement.currentTime);
      }).catch(error => {
        console.error("Audio playback failed:", error);
        // Try to enable audio context for future plays
        if (error.name === 'NotAllowedError') {
          console.log("Audio blocked by browser policy - user interaction required");
        }
      });
      
      audioElement.onended = () => {
        // Auto-advance to next segment
        const currentNarration = grandmaNarration || narration;
        if (currentNarration && segmentIndex < currentNarration.segments.length - 1) {
          const nextIndex = segmentIndex + 1;
          console.log("Auto-advancing from", segmentIndex, "to", nextIndex);
          setCurrentSegmentIndex(nextIndex);
          
          // Convert simple segment to narration segment for playback
          const nextSegment = grandmaNarration ? {
            text: grandmaNarration.segments[nextIndex].text,
            voiceUrl: grandmaNarration.segments[nextIndex].audioUrl,
            emotion: grandmaNarration.segments[nextIndex].emotion,
            intensity: grandmaNarration.segments[nextIndex].intensity,
            startTime: nextIndex * 2000,
            duration: 2000
          } : currentNarration.segments[nextIndex];
          
          playSegmentAudio(nextSegment, nextIndex);
        } else {
          // End of story
          setIsPlaying(false);
          console.log("Story playback completed - reached end");
          
          // Track completion for confidence meter
          if (confidenceTracking) {
            confidenceTracking.trackPlayback();
          }
        }
      };
      
      audioRef.current.onerror = (error) => {
        console.error("Audio loading error:", error);
        setIsPlaying(false);
      };
      
      const playPromise = audioRef.current.play();
      if (playPromise) {
        playPromise
          .then(() => {
            console.log("Audio playback started successfully");
            console.log("Audio volume:", audioRef.current?.volume);
            console.log("Audio muted:", audioRef.current?.muted);
            console.log("Audio duration:", audioRef.current?.duration);
            console.log("Audio current time:", audioRef.current?.currentTime);
          })
          .catch(error => {
            console.error("Audio playback error:", error);
            console.error("Error details:", error.name, error.message);
            setIsPlaying(false);
          });
      }
    }
  };

  const togglePlayPause = async () => {
    if (isPlaying) {
      setIsPlaying(false);
      if (audioRef.current) {
        audioRef.current.pause();
      }
    } else {
      // Create audio context with user interaction for browser policies
      try {
        // Test audio capability with user interaction
        const testAudio = new Audio();
        testAudio.volume = 0.01; // Very low volume test
        testAudio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvGogBSl+0PLvgjMKLoPn8dC';
        await testAudio.play();
        testAudio.pause();
        console.log("Audio context initialized successfully");
      } catch (error) {
        console.log("Audio context initialization:", error.message);
      }
      
      // Generate character-based narration if not already available
      if (!narration && !grandmaNarration) {
        playCharacterNarration();
      } else if (grandmaNarration) {
        // Use generated narration - convert simple segment to narration segment
        if (grandmaNarration.segments && grandmaNarration.segments.length > 0) {
          setCurrentSegmentIndex(0);
          const firstSegment = {
            text: grandmaNarration.segments[0].text,
            voiceUrl: grandmaNarration.segments[0].audioUrl,
            emotion: grandmaNarration.segments[0].emotion,
            intensity: grandmaNarration.segments[0].intensity,
            startTime: 0,
            duration: 2000
          };
          playSegmentAudio(firstSegment, 0);
          setIsPlaying(true);
        }
      } else if (currentSegment) {
        playSegmentAudio(currentSegment, currentSegmentIndex);
        setIsPlaying(true);
      }
    }
  };

  const skipToPrevious = () => {
    if (currentSegmentIndex > 0) {
      const prevIndex = currentSegmentIndex - 1;
      const prevSegment = currentNarration?.segments[prevIndex];
      if (prevSegment) {
        setCurrentSegmentIndex(prevIndex);
        setCurrentTime(prevSegment.startTime);
        if (isPlaying) {
          playSegmentAudio(prevSegment, prevIndex);
        }
      }
    }
  };

  const skipToNext = () => {
    if (currentNarration && currentSegmentIndex < currentNarration.segments.length - 1) {
      const nextIndex = currentSegmentIndex + 1;
      const nextSegment = currentNarration.segments[nextIndex];
      setCurrentSegmentIndex(nextIndex);
      setCurrentTime(nextSegment.startTime);
      if (isPlaying) {
        playSegmentAudio(nextSegment, nextIndex);
      }
    }
  };

  const seekToTime = (time: number) => {
    setCurrentTime(time);
    const segment = narration?.segments.find(
      s => s.startTime <= time && s.startTime + s.duration > time
    );
    if (segment) {
      const segmentIndex = narration?.segments.indexOf(segment) || 0;
      setCurrentSegmentIndex(segmentIndex);
      if (isPlaying) {
        playSegmentAudio(segment);
      }
    }
  };

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!timelineRef.current || !narration) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const targetTime = percentage * narration.totalDuration;
    
    seekToTime(targetTime);
  };

  const formatTime = (ms: number) => {
    if (!ms || isNaN(ms) || ms < 0) return "0:00";
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getEmotionColor = (emotion: string) => {
    const colors = {
      happy: 'text-yellow-400',
      sad: 'text-blue-400',
      angry: 'text-red-400',
      fear: 'text-purple-400',
      surprise: 'text-green-400',
      excitement: 'text-orange-400',
      neutral: 'text-gray-400',
    };
    return colors[emotion as keyof typeof colors] || 'text-gray-400';
  };

  if (narrationLoading) {
    return (
      <div className="bg-dark-bg text-dark-text min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Preparing Story Narration...</h2>
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-tiktok-red mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!narration) {
    return (
      <div className="bg-dark-bg text-dark-text min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Story Not Available</h2>
          <Button onClick={() => setLocation("/")} className="bg-tiktok-red hover:bg-tiktok-red/80">
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark-bg text-dark-text min-h-screen">
      <audio ref={audioRef} className="hidden" />
      
      <div className="flex flex-col h-screen">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-dark-card border-b border-gray-800">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setLocation("/")}
            className="text-dark-text hover:bg-gray-800"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h2 className="text-lg font-semibold truncate mx-4">{story?.title}</h2>
          <div className="flex space-x-2">
            <Button variant="ghost" size="icon" className="text-dark-text hover:bg-gray-800">
              <Share2 className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-dark-text hover:bg-gray-800">
              <Users className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-dark-text hover:bg-gray-800">
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Confidence Meter - Disabled due to NaN issues */}
          {/* {storyId && user?.id && (
            <ConfidenceMeter storyId={parseInt(storyId)} userId={user.id} />
          )} */}

          {/* Story Info */}
          <Card className="bg-dark-card border-gray-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-dark-text">{story?.title}</CardTitle>
                <Badge variant="outline" className="text-tiktok-cyan border-tiktok-cyan">
                  {story?.category}
                </Badge>
              </div>
              <CardDescription className="text-gray-text">
                {story?.summary || "A collaborative story experience"}
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Current Segment Display */}
          {currentSegment && (
            <Card className="bg-dark-card border-gray-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    {currentSegment.characterName && (
                      <Badge variant="outline" className="text-tiktok-pink border-tiktok-pink">
                        {currentSegment.characterName}
                      </Badge>
                    )}
                    <Badge 
                      variant="outline" 
                      className={`${getEmotionColor(currentSegment.emotion)} border-current`}
                    >
                      {currentSegment.emotion}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: 10 }, (_, i) => (
                      <div
                        key={i}
                        className={`w-1 h-4 rounded ${
                          i < currentSegment.intensity
                            ? 'bg-tiktok-red'
                            : 'bg-gray-600'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                
                <p className="text-dark-text text-lg leading-relaxed">
                  {currentSegment.text}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Compact Player Controls */}
          <Card className="bg-dark-card border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={skipToPrevious}
                  disabled={currentSegmentIndex === 0}
                  className="text-dark-text hover:bg-gray-800"
                >
                  <SkipBack className="h-5 w-5" />
                </Button>
                
                <Button
                  onClick={togglePlayPause}
                  className="bg-tiktok-red hover:bg-tiktok-red/80 rounded-full w-12 h-12 flex items-center justify-center"
                >
                  {isPlaying ? (
                    <Pause className="h-6 w-6" />
                  ) : (
                    <Play className="h-6 w-6 ml-0.5" />
                  )}
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={skipToNext}
                  disabled={!currentNarration || currentSegmentIndex === (currentNarration?.segments?.length || 0) - 1}
                  className="text-dark-text hover:bg-gray-800"
                >
                  <SkipForward className="h-5 w-5" />
                </Button>
                
                <div className="flex items-center space-x-2 text-xs text-gray-text">
                  <span>{formatTime(currentTime)}</span>
                  <span>/</span>
                  <span>{formatTime(effectiveTotalDuration)}</span>
                </div>
              </div>
              
              <div 
                ref={timelineRef}
                className="relative h-2 bg-gray-700 rounded-full cursor-pointer mb-2"
                onClick={handleTimelineClick}
              >
                <div 
                  className="absolute top-0 left-0 h-full bg-tiktok-red rounded-full transition-all duration-100"
                  style={{ width: `${progress}%` }}
                />
                
                {/* Segment markers */}
                {currentNarration?.segments?.map((segment, index) => (
                  <div
                    key={index}
                    className="absolute top-0 w-0.5 h-full bg-gray-500 opacity-50"
                    style={{ 
                      left: `${effectiveTotalDuration > 0 ? (segment.startTime / effectiveTotalDuration) * 100 : 0}%` 
                    }}
                  />
                ))}
              </div>
              
              <div className="flex items-center justify-center space-x-2">
                <Volume2 className="h-4 w-4 text-gray-text" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={(e) => {
                    const newVolume = parseFloat(e.target.value);
                    setVolume(newVolume);
                    if (audioRef.current) {
                      audioRef.current.volume = newVolume;
                      console.log("Volume changed to:", newVolume);
                    }
                  }}
                  className="w-20 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-xs text-gray-text min-w-[3ch]">{Math.round(volume * 100)}%</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (audioRef.current) {
                      const testAudio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvGogBSl+0PLvgjMKLoPn8dC');
                      testAudio.volume = volume;
                      testAudio.play().catch(e => console.log('Test audio failed:', e));
                    }
                  }}
                  className="text-xs px-2 py-1 text-gray-text"
                >
                  Test
                </Button>
              </div>
            </CardContent>
          </Card>


        </div>


      </div>
    </div>
  );
}