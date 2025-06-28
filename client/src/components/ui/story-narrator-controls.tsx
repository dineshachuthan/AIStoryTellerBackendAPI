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
  
  const { toast } = useToast();

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    
    const audio = audioRef.current;
    
    audio.ontimeupdate = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    audio.onended = () => {
      // Auto-play next segment
      if (isPlaying) {
        const activeNarration = tempNarration || savedNarration;
        if (activeNarration && currentSegment < activeNarration.segments.length - 1) {
          setCurrentSegment(prev => prev + 1);
        } else {
          setIsPlaying(false);
          setCurrentSegment(0);
          setProgress(0);
        }
      }
    };

    return () => {
      audio.pause();
    };
  }, []);

  // Auto-play when segment changes
  useEffect(() => {
    if (isPlaying && currentSegment > 0) {
      playCurrentSegment();
    }
  }, [currentSegment]);

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
        setTempNarration(response);
        setCurrentSegment(0);
        setProgress(0);
        
        toast({
          title: "Narration Generated",
          description: "Your story narration has been generated. You can now play it or save it for later."
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

  // 2. Play Narration (from memory - no cost)
  const playCurrentSegment = () => {
    const activeNarration = tempNarration || savedNarration;
    if (!activeNarration || !audioRef.current) return;

    const segment = activeNarration.segments[currentSegment];
    if (!segment?.audioUrl) return;

    audioRef.current.src = segment.audioUrl;
    audioRef.current.play();
  };

  const playNarration = () => {
    const activeNarration = tempNarration || savedNarration;
    if (!activeNarration) return;

    setIsPlaying(true);
    playCurrentSegment();
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
  const playStory = () => {
    if (savedNarration) {
      setCurrentSegment(0);
      setProgress(0);
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
    <div className={`space-y-4 bg-white/10 p-6 rounded-lg border border-purple-500/30 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Story Narration</h3>
        <div className="text-sm text-gray-300">
          {activeNarration ? `${activeNarration.segments.length} segments` : 'No narration'}
        </div>
      </div>

      {/* Progress bar */}
      {hasAnyNarration && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-300">
            <span>Segment {currentSegment + 1} of {activeNarration?.segments.length || 0}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-600 rounded-full h-2">
            <div 
              className="bg-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Control buttons */}
      <div className="grid grid-cols-2 gap-3">
        {/* Generate Narration */}
        <Button
          onClick={generateNarration}
          disabled={isGenerating || !canNarrate}
          className="bg-orange-600 hover:bg-orange-700 text-white"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Generate Narration
            </>
          )}
        </Button>

        {/* Play/Pause Narration */}
        <Button
          onClick={isPlaying ? pauseNarration : playNarration}
          disabled={!hasAnyNarration}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isPlaying ? (
            <>
              <Pause className="w-4 h-4 mr-2" />
              Pause
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Play Narration
            </>
          )}
        </Button>

        {/* Save Narration */}
        <Button
          onClick={saveNarration}
          disabled={!tempNarration || isSaving}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Narration
            </>
          )}
        </Button>

        {/* Play Story */}
        <Button
          onClick={playStory}
          disabled={!savedNarration || isLoadingSaved}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          {isLoadingSaved ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              <Headphones className="w-4 h-4 mr-2" />
              Play Story
            </>
          )}
        </Button>
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