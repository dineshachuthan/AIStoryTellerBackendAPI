import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Headphones, Play, Pause, Save, Download, Loader2, RefreshCw, SkipBack, SkipForward, Volume2, Check } from 'lucide-react';
import { toast } from '@/lib/toast-utils';
import { queryClient } from '@/lib/queryClient';
import { apiClient } from '@/lib/api-client';
import { getMessage } from '@shared/utils/i18n-hierarchical';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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



  // Get current narrator voice ID in real-time
  const { data: narratorVoiceData } = useQuery({
    queryKey: ['/api/user/narrator-voice'],
    queryFn: async () => {
      if (!user) return null;
      try {
        return await apiClient.voice.getNarratorVoice();
      } catch (error) {
        console.error('Error fetching narrator voice:', error);
        return null;
      }
    },
    enabled: !!user
  });

  // Use React Query to fetch saved narration - this will respond to cache invalidations
  const { data: savedNarration, isLoading: isLoadingSaved } = useQuery({
    queryKey: [`/api/stories/${storyId}/narration`, narratorVoiceData?.narratorVoiceId],
    queryFn: async () => {
      if (!user) return null;
      try {
        const response = await apiClient.stories.getNarration(storyId);
        
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
      
      console.log(`Segment ${currentIdx} ended. Total segments: ${activeNarration?.segments.length}`);
      
      if (activeNarration && currentIdx < activeNarration.segments.length - 1) {
        // Move to next segment
        const nextSegmentIndex = currentIdx + 1;
        console.log(`Auto-advancing to segment ${nextSegmentIndex}`);
        setCurrentSegment(nextSegmentIndex);
        currentSegmentRef.current = nextSegmentIndex;
        
        // Play next segment immediately if still mounted
        const nextSegment = activeNarration.segments[nextSegmentIndex];
        if (nextSegment?.audioUrl && isMountedRef.current) {
          console.log(`Playing next segment URL: ${nextSegment.audioUrl}`);
          audio.src = nextSegment.audioUrl;
          audio.play().catch(err => {
            console.error('Failed to auto-play next segment:', err);
            setIsPlaying(false);
          });
        }
      } else {
        // End of narration
        console.log('End of narration reached');
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

    // Check if narration already exists with current voice
    if (savedNarration && narratorVoiceData?.narratorVoiceId && 
        savedNarration.narratorVoice === narratorVoiceData.narratorVoiceId) {
      toast.info({
        title: "Already Generated",
        description: "Story narration already exists with current voice",
      });
      return;
    }

    setIsGenerating(true);
    try {
      // Get story content and narrative analysis
      const [storyResponse, analysisResponse] = await Promise.all([
        apiClient.stories.get(storyId),
        apiClient.stories.getNarrative(storyId)
      ]);

      if (!storyResponse.content || !analysisResponse.emotions) {
        throw new Error('Story content or analysis not found');
      }

      // Generate new narration (this costs money)
      const response = await apiClient.stories.createNarration(storyId);

      if (response.segments) {
        // Narration is automatically saved in backend during generation
        // Invalidate and refetch the saved narration query
        await queryClient.invalidateQueries({ queryKey: [`/api/stories/${storyId}/narration/saved`] });
        await queryClient.refetchQueries({ queryKey: [`/api/stories/${storyId}/narration/saved`] });
        
        setTempNarration(null); // Clear any temp narration
        setCurrentSegment(0);
        setProgress(0);
      }
    } catch (error) {
      console.error('Error generating narration:', error);
      toast.error({
        title: "Generation Error",
        description: "Could not generate story narration. Please try again."
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

    console.log(`Playing segment ${currentSegment}:`, segment.audioUrl);
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
    console.log('🎵 playNarration called');
    const activeNarration = tempNarration || savedNarration;
    console.log('🎵 activeNarration:', activeNarration);
    console.log('🎵 tempNarration:', tempNarration);
    console.log('🎵 savedNarration:', savedNarration);
    
    // If no narration exists, generate it first
    if (!activeNarration || !activeNarration.segments.length) {
      console.log('🎵 No narration found, generating...');
      await generateNarration();
      return;
    }
    
    console.log('🎵 audioRef.current:', audioRef.current);
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
      toast.error({
        title: "Nothing to Save",
        description: "Generate a narration first before saving.",
      });
      return;
    }

    setIsSaving(true);
    try {
      // Note: Narration is automatically saved when generated
      // This function is kept for UI consistency but doesn't need to make API calls
      setSavedNarration(tempNarration);
      setTempNarration(null); // Clear temp after saving
      
      toast.success({
        title: "Narration Saved",
        description: "Your story narration has been saved permanently."
      });
    } catch (error) {
      console.error('Error saving narration:', error);
      toast.error({
        title: "Save Error",
        description: "Could not save narration. Please try again.",
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

      {/* TEMPORARY: Voice Profile Test Dropdown */}
      <div className="mb-6 p-4 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm text-yellow-200">🧪 Test Voice Profile:</span>
          <Select
            onValueChange={async (value) => {
              try {
                const response = await fetch('/api/voice-profile/test-preset', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ preset: value })
                });
                if (response.ok) {
                  toast({
                    title: "Profile Changed",
                    description: `${value} voice profile activated. Regenerate narration to hear the difference.`
                  });
                  // Invalidate narration cache
                  await queryClient.invalidateQueries({ queryKey: [`/api/stories/${storyId}/narration/saved`] });
                }
              } catch (error) {
                toast({
                  title: "Error",
                  description: "Failed to change voice profile",
                  variant: "destructive"
                });
              }
            }}
          >
            <SelectTrigger className="w-[180px] bg-gray-800 text-white">
              <SelectValue placeholder="Select profile" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="grandma">👵 Grandma Voice</SelectItem>
              <SelectItem value="kid">👶 Kid Voice</SelectItem>
              <SelectItem value="neutral">👤 Neutral Voice</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Generate/Regenerate button - always visible for testing */}
      <div className="text-center py-8">
        {!hasAnyNarration && (
          <p className="text-white/70 mb-4">No narration generated yet</p>
        )}
        {hasAnyNarration && (
          <p className="text-white/70 mb-4">Regenerate narration with new voice profile</p>
        )}
        <Button
          onClick={generateNarration}
          disabled={isGenerating || !canNarrate}
          size="lg"
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Generating Narration...
            </>
          ) : (
            <>
              <Download className="w-5 h-5 mr-2" />
              {hasAnyNarration ? 'Regenerate Narration' : 'Generate Narration'}
            </>
          )}
        </Button>
        {!canNarrate && (
          <p className="text-sm text-red-400 mt-2">You need to set up a narrator voice first</p>
        )}
      </div>

      {/* TV-Style Media Player */}
      {hasAnyNarration && (
        <div className="mb-6">
          {/* TV Frame */}
          <div className="bg-gray-900 rounded-3xl p-4 shadow-2xl">
            {/* TV Screen */}
            <div className="bg-black rounded-2xl overflow-hidden relative">
              {/* Screen Content */}
              <div className={`p-8 min-h-[300px] flex flex-col justify-center relative ${!isPlaying && 'opacity-50'}`}>
                {/* Audio Visualizer - Small Corner Indicator */}
                <div className="absolute top-4 left-4 flex items-center gap-1 h-8">
                  {isPlaying && (
                    <>
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className="w-1 bg-green-400 rounded-full"
                          style={{
                            height: '100%',
                            animation: `audio-wave ${0.8 + i * 0.1}s ease-in-out infinite`,
                            animationDelay: `${i * 0.1}s`,
                            opacity: 0.7
                          }}
                        />
                      ))}
                      <span className="text-green-400 text-xs ml-2 font-mono">LIVE</span>
                    </>
                  )}
                </div>
                
                {/* Current Text Display */}
                <div className="text-center px-4 min-h-[100px] flex flex-col justify-center">
                  <div className="space-y-2">
                    <p className={`text-sm font-mono transition-all duration-300 ${
                      isPlaying && activeNarration 
                        ? 'text-green-400 opacity-100' 
                        : 'text-gray-600 opacity-60'
                    }`}>
                      {isPlaying && activeNarration 
                        ? `NOW PLAYING - SEGMENT ${currentSegment + 1}/${activeNarration.segments.length}`
                        : `${activeNarration?.segments.length || 0} segments ready`}
                    </p>
                    <p className={`text-base leading-relaxed font-medium transition-all duration-300 ${
                      isPlaying && activeNarration 
                        ? 'text-white opacity-100' 
                        : 'text-gray-500 opacity-60'
                    }`}>
                      {isPlaying && activeNarration 
                        ? `"${activeNarration.segments[currentSegment]?.text || 'Loading...'}"` 
                        : 'Press play to start narration'}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Segment Info */}
              <div className="absolute top-4 right-4">
                <span className="text-gray-400 text-sm font-mono">
                  SEGMENT {currentSegment + 1}/{activeNarration?.segments.length || 0}
                </span>
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
                {/* Generate Button */}
                <Button
                  onClick={generateNarration}
                  disabled={isGenerating || !canNarrate || !!savedNarration}
                  variant="ghost"
                  size="icon"
                  className={`
                    text-gray-400 hover:text-white
                    ${isGenerating ? 'animate-pulse' : savedNarration ? 'opacity-50' : ''}
                  `}
                  title={savedNarration ? getMessage('upload_story.narration.tooltips.already_generated') : (!canNarrate ? getMessage('upload_story.narration.tooltips.need_narrator_voice') : getMessage('upload_story.narration.tooltips.generate_narration'))}
                >
                  {isGenerating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : savedNarration ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <Download className="w-5 h-5" />
                  )}
                </Button>
                
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
                  title={getMessage('upload_story.narration.tooltips.previous_segment')}
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
                  title={isPlaying ? getMessage('upload_story.narration.tooltips.pause_narration') : getMessage('upload_story.narration.tooltips.play_narration')}
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
                  title={getMessage('upload_story.narration.tooltips.next_segment')}
                >
                  <SkipForward className="w-5 h-5" />
                </Button>
                
                {/* Volume Control */}
                <div className="flex items-center gap-1.5 ml-4 bg-gray-800 rounded-full px-2.5 py-1 border border-gray-700" title={getMessage('upload_story.narration.tooltips.volume_control')}>
                  <Volume2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div className="relative w-20">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      defaultValue="70"
                      className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer opacity-0 relative z-10"
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (audioRef.current) {
                          audioRef.current.volume = value / 100;
                        }
                        const track = e.target.nextElementSibling as HTMLElement;
                        const thumb = track?.nextElementSibling as HTMLElement;
                        if (track) {
                          track.style.background = `linear-gradient(to right, #10b981 0%, #10b981 ${value}%, #4b5563 ${value}%, #4b5563 100%)`;
                        }
                        if (thumb) {
                          thumb.style.left = `${value}%`;
                        }
                      }}
                    />
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 w-full h-1 bg-gray-600 rounded-lg pointer-events-none"
                      style={{
                        background: `linear-gradient(to right, #10b981 0%, #10b981 70%, #4b5563 70%, #4b5563 100%)`
                      }}
                    />
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-green-500 rounded-full pointer-events-none shadow-sm"
                      style={{ left: '70%', marginLeft: '-6px' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}