import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Play, 
  Pause, 
  Square, 
  Volume2, 
  Download, 
  Mic, 
  Clock,
  Users,
  Zap,
  DollarSign
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface EnhancedNarrationPlayerProps {
  storyId: number;
  variant?: 'mini' | 'compact' | 'full';
}

interface NarrationSegment {
  id: string;
  text: string;
  emotion: string;
  character?: string;
  isUserVoice: boolean;
  duration: number;
  startTime: number;
  endTime: number;
  confidence: number;
}

interface NarrationResult {
  segments: NarrationSegment[];
  totalDuration: number;
  finalAudioUrl: string;
  emotionVoicesUsed: { [emotion: string]: string };
  cacheHitRate: number;
  generationStats: {
    totalSegments: number;
    userVoiceSegments: number;
    cachedSegments: number;
    newGenerations: number;
  };
}

export function EnhancedNarrationPlayer({ storyId, variant = 'full' }: EnhancedNarrationPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentSegment, setCurrentSegment] = useState<NarrationSegment | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const queryClient = useQueryClient();

  // Check if user is ready for narration
  const { data: voiceStats } = useQuery({
    queryKey: ['/api/voice-selection/stats'],
  });

  // Generate narration mutation
  const generateNarrationMutation = useMutation({
    mutationFn: () => apiRequest(`/api/stories/${storyId}/enhanced-narration`, {
      method: 'POST',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/narration/cost-tracking'] });
    },
  });

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      
      // Update current segment based on time
      if (generateNarrationMutation.data?.segments) {
        const current = generateNarrationMutation.data.segments.find(
          (segment: NarrationSegment) => 
            audio.currentTime >= segment.startTime && audio.currentTime <= segment.endTime
        );
        setCurrentSegment(current || null);
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      setCurrentSegment(null);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [generateNarrationMutation.data]);

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleStop = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
    setIsPlaying(false);
    setCurrentTime(0);
    setCurrentSegment(null);
  };

  const handleSeek = (progress: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = (progress / 100) * duration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    return duration > 0 ? (currentTime / duration) * 100 : 0;
  };

  // Mini variant - just a button
  if (variant === 'mini') {
    return (
      <Button
        onClick={() => generateNarrationMutation.mutate()}
        disabled={generateNarrationMutation.isPending || !voiceStats?.readyForNarration}
        size="sm"
        variant="outline"
        className="gap-2"
      >
        <Mic className="h-4 w-4" />
        {generateNarrationMutation.isPending ? 'Generating...' : 'Generate Narration'}
      </Button>
    );
  }

  // Compact variant - horizontal player
  if (variant === 'compact') {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {generateNarrationMutation.data ? (
                <>
                  <Button
                    onClick={handlePlayPause}
                    size="sm"
                    variant="outline"
                    className="gap-1"
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button
                    onClick={handleStop}
                    size="sm"
                    variant="outline"
                  >
                    <Square className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => generateNarrationMutation.mutate()}
                  disabled={generateNarrationMutation.isPending || !voiceStats?.readyForNarration}
                  size="sm"
                  className="gap-2"
                >
                  <Mic className="h-4 w-4" />
                  {generateNarrationMutation.isPending ? 'Generating...' : 'Generate Narration'}
                </Button>
              )}
            </div>

            {generateNarrationMutation.data && (
              <>
                <div className="flex-1 space-y-1">
                  <Progress value={getProgressPercentage()} className="h-2" />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {generateNarrationMutation.data.generationStats.userVoiceSegments} user voices
                  </Badge>
                  <Button size="sm" variant="ghost" asChild>
                    <a href={generateNarrationMutation.data.finalAudioUrl} download>
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </>
            )}

            {generateNarrationMutation.data && (
              <audio
                ref={audioRef}
                src={generateNarrationMutation.data.finalAudioUrl}
                preload="metadata"
              />
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Full variant - complete player with visualizer
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="h-5 w-5" />
          Enhanced Story Narration
          {generateNarrationMutation.data && (
            <Badge variant="secondary" className="ml-auto">
              {Math.round(generateNarrationMutation.data.cacheHitRate * 100)}% cached
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Readiness Check */}
        {!voiceStats?.readyForNarration && (
          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-sm text-yellow-800 mb-2">
              Voice clone not ready for narration. You need at least 3 emotion samples.
            </p>
            <p className="text-xs text-yellow-600">
              Current progress: {voiceStats?.userRecordedEmotions || 0}/{voiceStats?.totalEmotionsInConfig || 10} emotions
            </p>
          </div>
        )}

        {/* Generation Button */}
        {!generateNarrationMutation.data && (
          <div className="text-center space-y-4">
            <Button
              onClick={() => generateNarrationMutation.mutate()}
              disabled={generateNarrationMutation.isPending || !voiceStats?.readyForNarration}
              size="lg"
              className="gap-2"
            >
              <Mic className="h-5 w-5" />
              {generateNarrationMutation.isPending ? 'Generating Narration...' : 'Generate Enhanced Narration'}
            </Button>
            
            {generateNarrationMutation.isPending && (
              <p className="text-sm text-gray-600">
                This may take a few minutes depending on story length...
              </p>
            )}
          </div>
        )}

        {/* Audio Player */}
        {generateNarrationMutation.data && (
          <div className="space-y-4">
            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
              <Button
                onClick={handlePlayPause}
                size="lg"
                className="gap-2"
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                {isPlaying ? 'Pause' : 'Play'}
              </Button>
              
              <Button
                onClick={handleStop}
                variant="outline"
                size="lg"
              >
                <Square className="h-5 w-5" />
              </Button>
              
              <Button variant="outline" size="lg" asChild>
                <a href={generateNarrationMutation.data.finalAudioUrl} download>
                  <Download className="h-5 w-5" />
                </a>
              </Button>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <Progress 
                value={getProgressPercentage()} 
                className="h-3 cursor-pointer"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const progress = ((e.clientX - rect.left) / rect.width) * 100;
                  handleSeek(progress);
                }}
              />
              <div className="flex justify-between text-sm text-gray-500">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Current Segment Info */}
            {currentSegment && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={currentSegment.isUserVoice ? "default" : "secondary"}>
                    {currentSegment.isUserVoice ? 'Your Voice' : 'AI Voice'}
                  </Badge>
                  <Badge variant="outline">
                    {currentSegment.emotion}
                  </Badge>
                  {currentSegment.character && (
                    <Badge variant="outline">
                      {currentSegment.character}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-blue-800">
                  "{currentSegment.text.substring(0, 100)}..."
                </p>
              </div>
            )}

            <Separator />

            {/* Generation Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Duration</span>
                </div>
                <p className="text-lg font-bold">{Math.round(generateNarrationMutation.data.totalDuration)}s</p>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Users className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">User Voices</span>
                </div>
                <p className="text-lg font-bold text-blue-600">
                  {generateNarrationMutation.data.generationStats.userVoiceSegments}
                </p>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Zap className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">Cached</span>
                </div>
                <p className="text-lg font-bold text-green-600">
                  {Math.round(generateNarrationMutation.data.cacheHitRate * 100)}%
                </p>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <DollarSign className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-medium">Segments</span>
                </div>
                <p className="text-lg font-bold text-purple-600">
                  {generateNarrationMutation.data.generationStats.totalSegments}
                </p>
              </div>
            </div>

            {/* Emotions Used */}
            <div>
              <h4 className="text-sm font-medium mb-2">Emotions Used:</h4>
              <div className="flex flex-wrap gap-1">
                {Object.keys(generateNarrationMutation.data.emotionVoicesUsed).map((emotion) => (
                  <Badge key={emotion} variant="outline" className="text-xs">
                    {emotion}
                  </Badge>
                ))}
              </div>
            </div>

            <audio
              ref={audioRef}
              src={generateNarrationMutation.data.finalAudioUrl}
              preload="metadata"
            />
          </div>
        )}

        {/* Error Handling */}
        {generateNarrationMutation.error && (
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <p className="text-sm text-red-800">
              Failed to generate narration: {(generateNarrationMutation.error as any)?.message || 'Unknown error'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}