import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Headphones, Play, Pause, Save, Download, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

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
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  
  // Temporary narration (in memory until saved)
  const [tempNarration, setTempNarration] = useState<NarrationData | null>(null);
  
  // Saved narration (from database)
  const [savedNarration, setSavedNarration] = useState<NarrationData | null>(null);
  
  // Audio playback
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentSegment, setCurrentSegment] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  
  const { toast } = useToast();

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    
    const audio = audioRef.current;
    const activeNarration = tempNarration || savedNarration;
    
    audio.ontimeupdate = () => {
      if (audio.duration && activeNarration) {
        // Calculate overall progress across all segments
        const segmentProgress = (audio.currentTime / audio.duration);
        const completedSegments = currentSegment;
        const totalSegments = activeNarration.segments.length;
        const overallProgress = ((completedSegments + segmentProgress) / totalSegments) * 100;
        setProgress(overallProgress);
      }
    };

    audio.onended = () => {
      // Auto-play next segment
      if (isPlaying) {
        const activeNarration = tempNarration || savedNarration;
        if (activeNarration && currentSegment < activeNarration.segments.length - 1) {
          setCurrentSegment(prev => prev + 1);
          setIsPaused(false); // Reset pause state when moving to next segment
        } else {
          setIsPlaying(false);
          setIsPaused(false); // Reset pause state when narration ends
          setCurrentSegment(0);
          setProgress(0);
        }
      }
    };

    return () => {
      audio.pause();
    };
  }, [isPlaying, tempNarration, savedNarration, currentSegment]);

  // Auto-play when segment changes
  useEffect(() => {
    if (isPlaying && currentSegment > 0) {
      playCurrentSegment();
    }
  }, [currentSegment, isPlaying]);

  // Load saved narration on mount
  useEffect(() => {
    checkForSavedNarration();
  }, [storyId, user]);

  const checkForSavedNarration = async () => {
    if (!user) return;
    
    setIsLoadingSaved(true);
    try {
      const response = await apiRequest(`/api/stories/${storyId}/narration/saved`, {
        method: 'GET'
      });
      
      if (response && response.segments) {
        setSavedNarration(response);
      }
    } catch (error) {
      // No saved narration found - this is normal
      console.log('No saved narration found');
    } finally {
      setIsLoadingSaved(false);
    }
  };

  // 1. Generate Narration (costs money)
  const generateNarration = async () => {
    if (!user || !canNarrate) return;

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
        setSavedNarration(response);
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
    audioRef.current.play().catch(err => {
      console.error('Playback error:', err);
      setIsPlaying(false);
    });
    setIsPaused(false);
  };

  const playNarration = () => {
    const activeNarration = tempNarration || savedNarration;
    console.log('Play clicked - activeNarration:', activeNarration);
    console.log('Current segment:', currentSegment);
    console.log('Is paused:', isPaused);
    console.log('Audio element exists:', !!audioRef.current);
    
    if (!activeNarration) {
      console.error('No narration available');
      return;
    }

    setIsPlaying(true);
    
    // If resuming from pause, just play
    if (isPaused && audioRef.current && audioRef.current.paused) {
      console.log('Resuming from pause');
      audioRef.current.play().catch(err => {
        console.error('Resume error:', err);
        setIsPlaying(false);
      });
      setIsPaused(false);
    } else {
      console.log('Starting fresh playback');
      // Fresh start - play current segment
      playCurrentSegment();
    }
  };

  const pauseNarration = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      setIsPaused(true);
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
  const playStory = () => {
    if (savedNarration) {
      // Only reset if we're not resuming from pause
      if (!isPaused) {
        setCurrentSegment(0);
        setProgress(0);
      }
      playNarration();
    } else {
      toast({
        title: "No Saved Narration",
        description: "Generate and save a narration first to play the story.",
        variant: "destructive"
      });
    }
  };

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
        <div className="text-sm text-purple-200 bg-purple-900/30 px-3 py-1 rounded-full">
          {activeNarration ? `${activeNarration.segments.length} segments` : 'Ready to create'}
        </div>
      </div>

      {/* Progress visualization - always show to prevent UI jumping */}
      {hasAnyNarration && (
        <div className={`mb-6 p-4 rounded-lg border transition-all duration-200 ${
          isPlaying 
            ? 'bg-white/5 border-purple-400/20' 
            : 'bg-black/20 border-gray-600/20'
        }`}>
          <div className="flex justify-between text-sm mb-2">
            <span className={isPlaying ? 'text-purple-200' : 'text-gray-400'}>
              Segment {currentSegment + 1} of {activeNarration?.segments.length || 0}
            </span>
            <span className={isPlaying ? 'text-purple-200' : 'text-gray-400'}>
              {Math.round(progress)}% complete
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-purple-500 to-blue-500 h-3 rounded-full transition-all duration-500 ease-out shadow-lg"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Main layout: Prominent play button + smaller controls */}
      <div className="space-y-4">
        {/* Prominent Play Button */}
        <div className="flex justify-center">
          <Button
            onClick={() => {
              if (isPlaying) {
                pauseNarration();
              } else {
                playNarration();
              }
            }}
            disabled={!hasAnyNarration}
            className={`
              h-16 px-8 text-lg font-semibold shadow-2xl transform transition-all duration-200 
              ${hasAnyNarration 
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 hover:scale-105 active:scale-95' 
                : 'bg-gray-600 cursor-not-allowed'
              }
            `}
          >
            {isPlaying ? (
              <>
                <Pause className="w-6 h-6 mr-3" />
                Pause Story
              </>
            ) : (
              <>
                <Play className="w-6 h-6 mr-3" />
                {savedNarration ? 'Play Story' : (tempNarration ? 'Play Preview' : 'Generate First')}
              </>
            )}
          </Button>
        </div>

        {/* Secondary controls in a creative arc layout */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          {/* Generate - Left */}
          <Button
            onClick={generateNarration}
            disabled={isGenerating || !canNarrate}
            variant="outline"
            className={`
              h-12 text-sm border-orange-400/50 bg-orange-900/20 text-orange-200 
              hover:bg-orange-900/40 hover:border-orange-400 transition-all duration-200
              ${isGenerating ? 'animate-pulse' : 'hover:scale-105'}
            `}
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Generate
              </>
            )}
          </Button>

          {/* Save - Center */}
          <Button
            onClick={saveNarration}
            disabled={!tempNarration || isSaving}
            variant="outline"
            className={`
              h-12 text-sm border-green-400/50 bg-green-900/20 text-green-200 
              hover:bg-green-900/40 hover:border-green-400 transition-all duration-200
              ${isSaving ? 'animate-pulse' : 'hover:scale-105'}
              ${tempNarration ? 'ring-2 ring-green-400/30' : ''}
            `}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {tempNarration ? 'Save' : 'Saved'}
              </>
            )}
          </Button>

          {/* Status indicator - Right */}
          <div className={`
            h-12 flex items-center justify-center text-sm rounded-md border transition-all duration-200
            ${savedNarration 
              ? 'border-emerald-400/50 bg-emerald-900/20 text-emerald-200' 
              : tempNarration 
                ? 'border-yellow-400/50 bg-yellow-900/20 text-yellow-200'
                : 'border-gray-500/50 bg-gray-900/20 text-gray-400'
            }
          `}>
            <div className="text-center">
              <div className="font-medium">
                {savedNarration ? '✓ Auto-Saved' : tempNarration ? '⚡ Preview' : '○ Empty'}
              </div>
            </div>
          </div>
        </div>

        {/* Cost notice */}
        <div className="text-xs text-center text-gray-400 mt-4 bg-gray-900/30 p-3 rounded-lg">
          💡 Generate creates AI narration (~$0.30) • Save stores permanently • Play uses your saved version
        </div>
      </div>

      {/* Status indicators */}
      <div className="flex justify-between text-xs text-gray-400">
        <div className="space-x-4">
          <span className={tempNarration ? "text-yellow-400" : "text-gray-500"}>
            • Temp: {tempNarration ? "Ready" : "None"}
          </span>
          <span className={savedNarration ? "text-green-400" : "text-gray-500"}>
            • Saved: {savedNarration ? "Available" : "None"}
          </span>
        </div>
        <div>
          {activeNarration && (
            <span className="text-gray-300">
              Duration: {Math.round((activeNarration.totalDuration || 0) / 1000)}s
            </span>
          )}
        </div>
      </div>
    </div>
  );
}