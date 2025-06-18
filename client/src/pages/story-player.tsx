import { useState, useEffect, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Play, Pause, SkipBack, SkipForward, Volume2, Share2, Users, Settings, Mic, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { ConfidenceMeter, useConfidenceTracking } from "@/components/confidence-meter";

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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [grandmaNarration, setGrandmaNarration] = useState(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());

  // Confidence tracking
  const userId = 'user_123'; // Using test user ID
  const confidenceTracking = storyId ? useConfidenceTracking(parseInt(storyId), userId) : null;

  // Fetch story details
  const { data: story, isLoading: storyLoading } = useQuery({
    queryKey: [`/api/stories/${storyId}`],
    enabled: !!storyId,
  });

  // Fetch story narration
  const { data: narration, isLoading: narrationLoading } = useQuery<StoryNarration>({
    queryKey: [`/api/stories/${storyId}/narration`],
    enabled: !!storyId,
  });

  // Fetch voice assignments
  const { data: voiceAssignments = [] } = useQuery({
    queryKey: [`/api/stories/${storyId}/voice-assignments`],
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
      toast({
        title: "Narration Generated!",
        description: "Your personalized story narration is ready to play.",
      });
    },
    onError: (error) => {
      toast({
        title: "Generation Failed",
        description: "Could not generate narration. Please try again.",
        variant: "destructive",
      });
    },
  });

  const currentSegment = narration?.segments?.[currentSegmentIndex];
  const progress = narration && narration.totalDuration > 0 ? (currentTime / narration.totalDuration) * 100 : 0;

  // Auto-start story playback when component loads
  useEffect(() => {
    if (story && !narration && !grandmaNarration && !generateNarrationMutation.isPending && !isPlaying) {
      // Automatically generate and start character-based narration
      playCharacterNarration();
    }
  }, [story, narration, grandmaNarration]);

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
          userId: 'user_123' // Test user ID
        }),
      });

      setGrandmaNarration(response);
      
      // Start playing the first segment
      if (response.segments && response.segments.length > 0) {
        setCurrentSegmentIndex(0);
        playSegmentAudio(response.segments[0]);
        setIsPlaying(true);
        
        // Track playback start for confidence meter
        if (confidenceTracking) {
          confidenceTracking.trackPlayback();
        }
      }

    } catch (error) {
      console.error("Character narration error:", error);
      toast({
        title: "Narration Failed",
        description: "Could not generate character-based narration.",
        variant: "destructive",
      });
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

  const playSegmentAudio = (segment: NarrationSegment) => {
    if (segment.voiceUrl && audioRef.current) {
      audioRef.current.src = segment.voiceUrl;
      audioRef.current.volume = volume;
      audioRef.current.play().catch(console.error);
    }
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      setIsPlaying(false);
      if (audioRef.current) {
        audioRef.current.pause();
      }
    } else {
      // Generate character-based narration if not already available
      if (!narration && !grandmaNarration) {
        playCharacterNarration();
      } else if (grandmaNarration) {
        // Use generated narration
        if (grandmaNarration.segments && grandmaNarration.segments.length > 0) {
          setCurrentSegmentIndex(0);
          playSegmentAudio(grandmaNarration.segments[0]);
          setIsPlaying(true);
        }
      } else if (currentSegment) {
        playSegmentAudio(currentSegment);
        setIsPlaying(true);
      }
    }
  };

  const skipToPrevious = () => {
    if (currentSegmentIndex > 0) {
      const prevIndex = currentSegmentIndex - 1;
      const prevSegment = narration?.segments[prevIndex];
      if (prevSegment) {
        setCurrentSegmentIndex(prevIndex);
        setCurrentTime(prevSegment.startTime);
        if (isPlaying) {
          playSegmentAudio(prevSegment);
        }
      }
    }
  };

  const skipToNext = () => {
    if (narration && currentSegmentIndex < narration.segments.length - 1) {
      const nextIndex = currentSegmentIndex + 1;
      const nextSegment = narration.segments[nextIndex];
      setCurrentSegmentIndex(nextIndex);
      setCurrentTime(nextSegment.startTime);
      if (isPlaying) {
        playSegmentAudio(nextSegment);
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
          {/* Confidence Meter */}
          {storyId && (
            <ConfidenceMeter storyId={parseInt(storyId)} userId={userId} />
          )}

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

          {/* Timeline */}
          <Card className="bg-dark-card border-gray-800">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm text-gray-text">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(narration.totalDuration)}</span>
                </div>
                
                <div 
                  ref={timelineRef}
                  className="relative h-2 bg-gray-700 rounded-full cursor-pointer"
                  onClick={handleTimelineClick}
                >
                  <div 
                    className="absolute top-0 left-0 h-full bg-tiktok-red rounded-full transition-all duration-100"
                    style={{ width: `${progress}%` }}
                  />
                  
                  {/* Segment markers */}
                  {narration.segments.map((segment, index) => (
                    <div
                      key={index}
                      className="absolute top-0 w-0.5 h-full bg-gray-500 opacity-50"
                      style={{ 
                        left: `${(segment.startTime / narration.totalDuration) * 100}%` 
                      }}
                    />
                  ))}
                </div>
                
                <Progress value={progress} className="h-1" />
              </div>
            </CardContent>
          </Card>

          {/* Voice Cast */}
          <Card className="bg-dark-card border-gray-800">
            <CardHeader>
              <CardTitle className="text-dark-text flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Voice Cast
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {voiceAssignments.map((assignment: any) => (
                  <div key={assignment.id} className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg">
                    <div className="w-10 h-10 bg-tiktok-red rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold">
                        {assignment.character?.name?.charAt(0) || 'C'}
                      </span>
                    </div>
                    <div>
                      <p className="text-dark-text font-medium">
                        {assignment.character?.name || 'Character'}
                      </p>
                      <p className="text-gray-text text-sm">
                        {assignment.user?.firstName || 'Anonymous'} {assignment.user?.lastName || ''}
                      </p>
                    </div>
                    <div className="ml-auto">
                      {assignment.isCompleted ? (
                        <Badge className="bg-green-600 text-white">Complete</Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-400 border-gray-600">
                          Pending
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Player Controls */}
        <div className="bg-dark-card border-t border-gray-800 p-4">
          <div className="flex items-center justify-center space-x-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={skipToPrevious}
              disabled={currentSegmentIndex === 0}
              className="text-dark-text hover:bg-gray-800"
            >
              <SkipBack className="h-6 w-6" />
            </Button>
            
            <Button
              onClick={togglePlayPause}
              className="bg-tiktok-red hover:bg-tiktok-red/80 rounded-full w-16 h-16 flex items-center justify-center"
            >
              {isPlaying ? (
                <Pause className="h-8 w-8" />
              ) : (
                <Play className="h-8 w-8 ml-1" />
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={skipToNext}
              disabled={!narration || currentSegmentIndex === narration.segments.length - 1}
              className="text-dark-text hover:bg-gray-800"
            >
              <SkipForward className="h-6 w-6" />
            </Button>
          </div>
          
          <div className="flex items-center justify-center mt-4 space-x-2">
            <Volume2 className="h-4 w-4 text-gray-text" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-24 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}