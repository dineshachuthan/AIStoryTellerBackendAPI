import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Headphones, Play, Pause, Save, Download, Loader2, RefreshCw, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface NarrationSegment {
  text: string;
  audioUrl?: string;
  duration?: number;
}

interface NarrationData {
  storyId: number;
  segments: NarrationSegment[];
  totalDuration: number;
  narratorVoice: string;
  narratorVoiceType: 'ai' | 'user';
}

interface StoryNarratorControlsProps {
  storyId: number;
  user: any;
  canNarrate: boolean;
  className?: string;
}

export default function StoryNarratorControls({ 
  storyId, 
  user, 
  canNarrate, 
  className = "" 
}: StoryNarratorControlsProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Temporary narration (in memory until saved)
  const [tempNarration, setTempNarration] = useState<NarrationData | null>(null);
  
  // Audio playback
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentSegmentRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);
  const [currentSegment, setCurrentSegment] = useState(0);
  const [progress, setProgress] = useState(0);

  
  const { toast } = useToast();

  // Get current narrator voice ID in real-time
  const { data: narratorVoiceData } = useQuery({
    queryKey: ['/api/user/narrator-voice'],
    queryFn: async () => {
      if (!user) return null;
      try {
        const response = await apiRequest('/api/user/narrator-voice', {
          method: 'GET'
        });
        return response;
      } catch (error) {
        console.error('Error fetching narrator voice:', error);
        return null;
      }
    },
    enabled: !!user
  });

  // Use React Query to fetch saved narration - this will respond to cache invalidations
  const { data: savedNarration, isLoading: isLoadingSaved } = useQuery({
    queryKey: [`/api/stories/${storyId}/narration/saved`, narratorVoiceData?.narratorVoiceId],
    queryFn: async () => {
      if (!user) return null;
      try {
        const response = await apiRequest(`/api/stories/${storyId}/narration/saved`, {
          method: 'GET'
        });
        
        // Check if narration matches current voice ID
        if (response && narratorVoiceData?.narratorVoiceId && 
            response.narratorVoice !== narratorVoiceData.narratorVoiceId) {
          console.log('Narration voice mismatch, cache invalid');
          return null;
        }
        
        return response || null;
      } catch (error) {
        // No saved narration found - this is normal
        console.log('No saved narration found');
        return null;
      }
    },
    enabled: !!user && !!storyId,
  });

  // Initialize audio element once
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    isMountedRef.current = true;
    
    return () => {
      // Critical cleanup on unmount
      isMountedRef.current = false;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []); // Empty deps - only run once

  // Set up audio event handlers
  useEffect(() => {
    if (!audioRef.current) return;
    
    const audio = audioRef.current;
    
    // Store current segment in a ref to avoid stale closure
    currentSegmentRef.current = currentSegment;
    
    const handleTimeUpdate = () => {
      const activeNarration = tempNarration || savedNarration;
      if (audio.duration && activeNarration) {
        // Calculate overall progress across all segments
        const segmentProgress = (audio.currentTime / audio.duration);
        const completedSegments = currentSegmentRef.current;
        const totalSegments = activeNarration.segments.length;
        const overallProgress = ((completedSegments + segmentProgress) / totalSegments) * 100;
        setProgress(overallProgress);
      }
    };

    const handleEnded = () => {
      // Check if component is still mounted before auto-advancing
      if (!isMountedRef.current) {
        return;
      }
      
      // Auto-play next segment
      const activeNarration = tempNarration || savedNarration;
      const currentIdx = currentSegmentRef.current;
      
      if (activeNarration && currentIdx < activeNarration.segments.length - 1) {
        // Move to next segment
        const nextSegmentIndex = currentIdx + 1;
        setCurrentSegment(nextSegmentIndex);
        currentSegmentRef.current = nextSegmentIndex;
        
        // Play next segment immediately if still mounted
        const nextSegment = activeNarration.segments[nextSegmentIndex];
        if (nextSegment?.audioUrl && isMountedRef.current) {
          audio.src = nextSegment.audioUrl;
          audio.play().catch(err => {
            console.error('Failed to auto-play next segment:', err);
            setIsPlaying(false);
          });
        }
      } else {
        // End of narration
        setIsPlaying(false);
        setCurrentSegment(0);
        currentSegmentRef.current = 0;
        setProgress(0);
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      // Remove event listeners
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [tempNarration, savedNarration]); // Removed currentSegment to prevent re-binding

  // Remove auto-play effect to avoid conflicts with onended handler

  // 1. Generate Narration (costs money)
  const generateNarration = async () => {
    if (!user || !canNarrate) return;

    // Check if we already have a narration with current voice ID
    if (savedNarration && narratorVoiceData?.narratorVoiceId && 
        savedNarration.narratorVoice === narratorVoiceData.narratorVoiceId) {
      toast({
        title: "Already Generated",
        description: "Story narration already exists with current voice",
      });
      return;
    }

    setIsGenerating(true);
    try {
      // Get story content and narrative analysis
      const [storyResponse, analysisResponse] = await Promise.all([
        apiRequest(`/api/stories/${storyId}`, { method: 'GET' }),
        apiRequest(`/api/stories/${storyId}/narrative`, { method: 'GET' })
      ]);

      if (!storyResponse.content || !analysisResponse.emotions) {
        throw new Error('Story content or analysis not found');
      }

      // Generate new narration (this costs money)
      const response = await apiRequest(`/api/stories/${storyId}/narration`, {
        method: 'POST',
        body: JSON.stringify({
          content: storyResponse.content,
          emotions: analysisResponse.emotions
        })
      });

      if (response.segments) {
        // Narration is automatically saved in backend during generation
        // Invalidate and refetch the saved narration query
        await queryClient.invalidateQueries({ queryKey: [`/api/stories/${storyId}/narration/saved`] });
        await queryClient.refetchQueries({ queryKey: [`/api/stories/${storyId}/narration/saved`] });
        
        setTempNarration(null); // Clear any temp narration
        setCurrentSegment(0);
        setProgress(0);
        
        toast({
          title: "Narration Ready",
          description: `Generated and saved ${response.segments.length} segments`
        });
      }
    } catch (error) {
      console.error('Error generating narration:', error);
      toast({
        title: "Generation Error",
        description: "Could not generate story narration. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // 2. Play Narration segment
  const playCurrentSegment = () => {
    const activeNarration = tempNarration || savedNarration;
    if (!activeNarration || !audioRef.current) return;

    const segment = activeNarration.segments[currentSegment];
    if (!segment?.audioUrl) return;

    audioRef.current.src = segment.audioUrl;
    
    const playSegment = () => {
      audioRef.current.play().catch(err => {
        console.error('Playback error:', err);
        setIsPlaying(false);
      });
    };
    
    if (audioRef.current.readyState >= 3) {
      playSegment();
    } else {
      audioRef.current.addEventListener('canplay', playSegment, { once: true });
    }
  };

  // Simple play function
  const playNarration = async () => {
    const activeNarration = tempNarration || savedNarration;
    
    // If no narration exists, generate it first
    if (!activeNarration || !activeNarration.segments.length) {
      await generateNarration();
      return;
    }
    
    if (!audioRef.current) return;
    
    if (isPlaying) {
      // Pause
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      // Stop any existing audio first to prevent overlaps
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      
      // Play
      setIsPlaying(true);
      const segment = activeNarration.segments[currentSegment];
      if (segment?.audioUrl) {
        // Always set the source to ensure proper loading
        audioRef.current.src = segment.audioUrl;
        
        // Wait for audio to be ready before playing
        const playAudio = () => {
          if (!isMountedRef.current || !audioRef.current) {
            console.error('Component unmounted or audio ref missing');
            return;
          }
          
          console.log('Attempting to play:', segment.audioUrl);
          console.log('Audio readyState:', audioRef.current.readyState);
          
          audioRef.current.play().then(() => {
            console.log('Playback started successfully');
          }).catch(err => {
            console.error('Playback error:', err);
            console.error('Error name:', err.name);
            console.error('Error message:', err.message);
            console.error('Audio src:', audioRef.current?.src);
            console.error('Audio readyState:', audioRef.current?.readyState);
            
            // Only reset isPlaying if component is still mounted
            if (isMountedRef.current) {
              setIsPlaying(false);
            }
          });
        };
        
        // If audio is already loaded, play immediately
        if (audioRef.current.readyState >= 3) {
          playAudio();
        } else {
          // Otherwise wait for it to load
          audioRef.current.addEventListener('canplay', playAudio, { once: true });
        }
      }
    }
  };

  const pauseNarration = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  // 3. Save Narration (to database for permanent storage)
  const saveNarration = async () => {
    if (!tempNarration) {
      toast({
        title: "Nothing to Save",
        description: "Generate a narration first before saving.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await apiRequest(`/api/stories/${storyId}/narration/save`, {
        method: 'POST',
        body: JSON.stringify(tempNarration)
      });

      if (response) {
        setSavedNarration(tempNarration);
        setTempNarration(null); // Clear temp after saving
        
        toast({
          title: "Narration Saved",
          description: "Your story narration has been saved permanently."
        });
      }
    } catch (error) {
      console.error('Error saving narration:', error);
      toast({
        title: "Save Error",
        description: "Could not save narration. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // 4. Play Story (from saved database - no generation cost)


  // Don't render if no user
  if (!user) return null;

  const activeNarration = tempNarration || savedNarration;
  const hasAnyNarration = tempNarration || savedNarration;

  return (
    <div className={`bg-gradient-to-br from-purple-900/20 to-blue-900/20 p-6 rounded-xl border border-purple-500/30 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white flex items-center">
          <Headphones className="w-5 h-5 mr-2 text-purple-400" />
          Story Narration
        </h3>
        <div className="flex items-center gap-2">
          <Button
            onClick={async () => {
              await queryClient.invalidateQueries({ queryKey: [`/api/stories/${storyId}/narration/saved`] });
              await queryClient.refetchQueries({ queryKey: [`/api/stories/${storyId}/narration/saved`] });
              toast({
                title: "Refreshed",
                description: "Narration data refreshed from server"
              });
            }}
            variant="ghost"
            size="sm"
            className="text-purple-200 hover:text-purple-100"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <div className="text-sm text-purple-200 bg-purple-900/30 px-3 py-1 rounded-full">
            {activeNarration ? `${activeNarration.segments.length} segments` : 'Ready to create'}
          </div>
        </div>
      </div>



      {/* TV-Style Media Player */}
      {hasAnyNarration && (
        <div className="mb-6">
          {/* TV Frame */}
          <div className="bg-gray-900 rounded-3xl p-4 shadow-2xl">
            {/* TV Screen */}
            <div className="bg-black rounded-2xl overflow-hidden relative">
              {/* Screen Content */}
              <div className={`p-8 min-h-[300px] flex flex-col justify-center ${!isPlaying && 'opacity-50'}`}>
                {/* Audio Visualizer */}
                <div className="flex items-center justify-center gap-2 mb-6 h-24">
                  {[...Array(20)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 bg-gradient-to-t from-green-500 via-yellow-500 to-red-500 rounded-full transition-all ${
                        isPlaying ? 'animate-audio-wave' : ''
                      }`}
                      style={{
                        height: isPlaying ? '100%' : '10%',
                        animationDelay: `${i * 0.05}s`,
                        animationDuration: `${0.6 + Math.random() * 0.4}s`,
                        opacity: isPlaying ? 1 : 0.3
                      }}
                    />
                  ))}
                </div>
                
                {/* Current Text Display */}
                <div className="text-center px-4">
                  {isPlaying && activeNarration ? (
                    <div>
                      <p className="text-green-400 text-sm mb-2 font-mono">
                        NOW PLAYING - SEGMENT {currentSegment + 1}/{activeNarration.segments.length}
                      </p>
                      <p className="text-white text-xl leading-relaxed font-medium">
                        "{activeNarration.segments[currentSegment]?.text || 'Loading...'}"
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-gray-500 text-lg">Press play to start narration</p>
                      <p className="text-gray-600 text-sm mt-2">{activeNarration?.segments.length || 0} segments ready</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* TV Status Indicator and Segment Info */}
              <div className="absolute top-4 right-4 flex items-center gap-3">
                <span className="text-gray-400 text-sm font-mono">
                  SEGMENT {currentSegment + 1}/{activeNarration?.segments.length || 0}
                </span>
                <div className={`w-3 h-3 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              </div>
              
              {/* Progress Info at Bottom */}
              <div className="absolute bottom-4 left-4 right-4">
                <div className="flex justify-between text-xs text-gray-500 font-mono">
                  <span>{Math.round(progress)}% COMPLETE</span>
                  <span>
                    {activeNarration?.segments[currentSegment]?.duration 
                      ? `${activeNarration.segments[currentSegment].duration.toFixed(1)}s` 
                      : 'ELEVENLABS VOICE'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* TV Control Panel */}
            <div className="mt-4 bg-gray-800 rounded-xl p-4">
              {/* Progress Bar */}
              <div className="mb-4">
                <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>00:00</span>
                  <span>{Math.round(progress)}%</span>
                </div>
              </div>
              
              {/* Media Controls */}
              <div className="flex items-center justify-center gap-4">
                {/* Skip Previous */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-400 hover:text-white"
                  onClick={() => {
                    if (currentSegment > 0) {
                      setCurrentSegment(currentSegment - 1);
                      currentSegmentRef.current = currentSegment - 1;
                      if (isPlaying) playNarration();
                    }
                  }}
                  disabled={currentSegment === 0}
                >
                  <SkipBack className="w-5 h-5" />
                </Button>
                
                {/* Play/Pause */}
                <Button
                  onClick={async () => {
                    if (isPlaying) {
                      pauseNarration();
                    } else {
                      await playNarration();
                    }
                  }}
                  size="icon"
                  className="w-14 h-14 rounded-full bg-green-600 hover:bg-green-700 text-white"
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6" />
                  ) : (
                    <Play className="w-6 h-6 ml-1" />
                  )}
                </Button>
                
                {/* Skip Next */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-400 hover:text-white"
                  onClick={() => {
                    if (activeNarration && currentSegment < activeNarration.segments.length - 1) {
                      setCurrentSegment(currentSegment + 1);
                      currentSegmentRef.current = currentSegment + 1;
                      if (isPlaying) playNarration();
                    }
                  }}
                  disabled={!activeNarration || currentSegment >= activeNarration.segments.length - 1}
                >
                  <SkipForward className="w-5 h-5" />
                </Button>
                
                {/* Volume Control */}
                <div className="flex items-center gap-2 ml-4">
                  <Volume2 className="w-5 h-5 text-gray-400" />
                  <input
                    type="range"
                    min="0"
                    max="100"
                    defaultValue="70"
                    className="w-24 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                    onChange={(e) => {
                      if (audioRef.current) {
                        audioRef.current.volume = parseInt(e.target.value) / 100;
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main layout: Prominent play button + smaller controls */}
      <div className="space-y-4">


        {/* Secondary controls in a creative arc layout */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          {/* Generate - Left */}
          <Button
            onClick={generateNarration}
            disabled={isGenerating || !canNarrate || !!savedNarration}
            variant="outline"
            className={`
              h-12 text-sm border-orange-400/50 bg-orange-900/20 text-orange-200 
              hover:bg-orange-900/40 hover:border-orange-400 transition-all duration-200
              ${isGenerating ? 'animate-pulse' : 'hover:scale-105'}
            `}
            title={savedNarration ? "Narration already generated" : (!canNarrate ? "Need narrator voice first" : "Generate story narration")}
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                {savedNarration ? 'Generated' : 'Generate'}
              </>
            )}
          </Button>




        </div>

      </div>
    </div>
  );
}