import { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from './button';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';

export interface NarrationSegment {
  text: string;
  audioUrl: string;
}

export interface UniversalNarrationPlayerProps {
  segments: NarrationSegment[];
  playerKey: string; // Unique identifier for this player instance
  title?: string; // Optional title display
  conversationStyle?: string; // Conversation style (e.g., "jovial", "respectful")
  narratorProfile?: string; // Narrator profile (e.g., "storyteller", "neutral")
  showSegmentCounter?: boolean; // Default: true
  showProgressBar?: boolean; // Default: true  
  showTimeDisplay?: boolean; // Default: true
  showNowPlaying?: boolean; // Default: true
  showVisualizer?: boolean; // Default: true (the LIVE audio bars)
  className?: string;
  onSegmentChange?: (segmentIndex: number) => void;
  onPlayStateChange?: (isPlaying: boolean) => void;
  onComplete?: () => void; // When narration finishes
}

interface AudioState {
  isPlaying: boolean;
  currentSegment: number;
  currentTime: number;
  duration: number;
  progress: number;
}

export function UniversalNarrationPlayer({
  segments,
  playerKey,
  title,
  conversationStyle,
  narratorProfile,
  showSegmentCounter = true,
  showProgressBar = true,
  showTimeDisplay = true,
  showNowPlaying = true,
  showVisualizer = true,
  className = "",
  onSegmentChange,
  onPlayStateChange,
  onComplete
}: UniversalNarrationPlayerProps) {
  const [audioState, setAudioState] = useState<AudioState>({
    isPlaying: false,
    currentSegment: 0,
    currentTime: 0,
    duration: 0,
    progress: 0
  });
  
  const [textHighlight, setTextHighlight] = useState({
    wordIndex: 0,
    totalWords: 0
  });
  
  const textContainerRef = useRef<HTMLDivElement>(null);
  const highlightedWordRef = useRef<HTMLSpanElement>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Update audio state helper
  const updateAudioState = (updates: Partial<AudioState>) => {
    setAudioState(prev => ({ ...prev, ...updates }));
  };
  
  // Extract current audio state properties for easier access
  const { isPlaying, currentSegment, currentTime, duration, progress } = audioState;
  
  // Get current segment data
  const currentSegmentData = useMemo(() => {
    return segments?.[currentSegment] || null;
  }, [segments, currentSegment]);
  
  // Setup audio element with complete event handlers
  useEffect(() => {
    if (!segments || segments.length === 0) return;
    
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    
    const audio = audioRef.current;
    const firstSegment = segments[0];
    
    if (firstSegment?.audioUrl) {
      audio.src = firstSegment.audioUrl;
      audio.preload = 'metadata';
      
      // Complete event handler setup
      const handleLoadedMetadata = () => {
        updateAudioState({ duration: audio.duration || 0 });
      };
      
      const handleTimeUpdate = () => {
        const progress = audio.duration > 0 ? (audio.currentTime / audio.duration) * 100 : 0;
        updateAudioState({
          currentTime: audio.currentTime || 0,
          progress: progress
        });
      };
      
      // Critical: Set up play/pause state sync
      const handlePlay = () => {
        updateAudioState({ isPlaying: true });
        onPlayStateChange?.(true);
      };
      
      const handlePause = () => {
        updateAudioState({ isPlaying: false });
        onPlayStateChange?.(false);
      };
      
      const handleEnded = () => {
        if (currentSegment < segments.length - 1) {
          // Auto-advance to next segment
          const nextSegment = currentSegment + 1;
          updateAudioState({
            currentSegment: nextSegment,
            currentTime: 0,
            progress: 0,
            isPlaying: true // Keep playing state active for auto-advance
          });
          
          const nextSegmentData = segments[nextSegment];
          if (nextSegmentData?.audioUrl) {
            audio.src = nextSegmentData.audioUrl;
            audio.play().catch(console.error);
          }
          
          onSegmentChange?.(nextSegment);
        } else {
          // Narration complete
          updateAudioState({
            isPlaying: false,
            progress: 0,
            currentTime: 0
          });
          onComplete?.();
        }
      };
      
      // Add event listeners
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('play', handlePlay);
      audio.addEventListener('pause', handlePause);
      audio.addEventListener('ended', handleEnded);
      
      // Cleanup function
      return () => {
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('play', handlePlay);
        audio.removeEventListener('pause', handlePause);
        audio.removeEventListener('ended', handleEnded);
      };
    }
  }, [segments, currentSegment, onSegmentChange, onPlayStateChange, onComplete]);
  
  // Reset when segments change
  useEffect(() => {
    updateAudioState({
      currentSegment: 0,
      isPlaying: false,
      progress: 0,
      currentTime: 0,
      duration: 0
    });
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      
      // Load first segment if available
      if (segments && segments.length > 0 && segments[0]?.audioUrl) {
        audioRef.current.src = segments[0].audioUrl;
      }
    }
  }, [segments, playerKey]);
  
  // Play/pause handler
  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio || !currentSegmentData?.audioUrl) return;
    
    if (isPlaying) {
      audio.pause();
    } else {
      // Check if we need to load a new audio source
      const currentUrl = currentSegmentData.audioUrl;
      const needsNewSource = !audio.src || !audio.src.endsWith(currentUrl);
      
      if (needsNewSource) {
        audio.src = currentUrl;
        audio.currentTime = 0;
      }
      // If same source, preserve current playback position
      
      // Use promise-based play with better error handling
      audio.play().catch(error => {
        console.error('Audio play failed:', error);
        // Reset playing state if play fails
        updateAudioState({ isPlaying: false });
      });
    }
  };
  
  // Previous segment handler
  const handlePreviousSegment = () => {
    if (currentSegment > 0) {
      const newSegment = currentSegment - 1;
      const audio = audioRef.current;
      const newSegmentData = segments?.[newSegment];
      const wasPlaying = isPlaying;
      
      if (audio && newSegmentData?.audioUrl) {
        audio.pause();
        audio.src = newSegmentData.audioUrl;
        audio.currentTime = 0;
        
        // If was playing, continue playing the new segment
        if (wasPlaying) {
          audio.play().catch(console.error);
        }
      }
      
      updateAudioState({
        currentSegment: newSegment,
        progress: 0,
        currentTime: 0,
        duration: 0,
        isPlaying: wasPlaying // Maintain previous playing state
      });
      
      onSegmentChange?.(newSegment);
    }
  };
  
  // Next segment handler
  const handleNextSegment = () => {
    if (segments && currentSegment < segments.length - 1) {
      const newSegment = currentSegment + 1;
      const audio = audioRef.current;
      const newSegmentData = segments?.[newSegment];
      const wasPlaying = isPlaying;
      
      if (audio && newSegmentData?.audioUrl) {
        audio.pause();
        audio.src = newSegmentData.audioUrl;
        audio.currentTime = 0;
        
        // If was playing, continue playing the new segment
        if (wasPlaying) {
          audio.play().catch(console.error);
        }
      }
      
      updateAudioState({
        currentSegment: newSegment,
        progress: 0,
        currentTime: 0,
        duration: 0,
        isPlaying: wasPlaying // Maintain previous playing state
      });
      
      onSegmentChange?.(newSegment);
    }
  };
  
  // Progress bar click handler
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (audio && duration > 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      const newTime = percent * duration;
      audio.currentTime = newTime;
      updateAudioState({
        currentTime: newTime,
        progress: percent * 100
      });
    }
  };
  
  // Format time helper
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Word highlighting logic
  const splitIntoWords = (text: string) => {
    return text.split(/(\s+)/).filter(word => word.length > 0);
  };
  
  const calculateWordHighlight = (currentTime: number, duration: number, totalWords: number) => {
    if (duration === 0 || totalWords === 0) return 0;
    const progress = currentTime / duration;
    return Math.floor(progress * totalWords);
  };
  
  // Update text highlight based on current time
  useEffect(() => {
    if (currentSegmentData?.text) {
      const words = splitIntoWords(currentSegmentData.text);
      const highlightedWordIndex = calculateWordHighlight(currentTime, duration, words.length);
      setTextHighlight({
        wordIndex: highlightedWordIndex,
        totalWords: words.length
      });
    }
  }, [currentTime, duration, currentSegmentData?.text]);
  
  // Auto-scroll to keep highlighted word visible
  useEffect(() => {
    if (highlightedWordRef.current && textContainerRef.current && isPlaying) {
      const container = textContainerRef.current;
      const highlightedElement = highlightedWordRef.current;
      
      const containerRect = container.getBoundingClientRect();
      const highlightedRect = highlightedElement.getBoundingClientRect();
      
      // Check if the highlighted word is below the visible area
      if (highlightedRect.bottom > containerRect.bottom) {
        // Scroll down to show the highlighted word
        const scrollAmount = highlightedRect.bottom - containerRect.bottom + 20; // 20px buffer
        container.scrollTop += scrollAmount;
      }
      // Check if the highlighted word is above the visible area
      else if (highlightedRect.top < containerRect.top) {
        // Scroll up to show the highlighted word
        const scrollAmount = containerRect.top - highlightedRect.top + 20; // 20px buffer
        container.scrollTop -= scrollAmount;
      }
    }
  }, [textHighlight.wordIndex, isPlaying]);
  
  // Render text with word highlighting
  const renderHighlightedText = (text: string) => {
    const words = splitIntoWords(text);
    const { wordIndex } = textHighlight;
    
    return words.map((word, index) => {
      const isHighlighted = index <= wordIndex && isPlaying;
      const isCurrentWord = index === wordIndex && isPlaying;
      const isSpace = /^\s+$/.test(word);
      
      return (
        <span
          key={index}
          ref={isCurrentWord ? highlightedWordRef : null}
          className={`transition-colors duration-200 ${
            isHighlighted 
              ? 'text-green-400 bg-green-400/20 px-1 rounded' 
              : isPlaying 
                ? 'text-white/70' 
                : 'text-gray-400'
          }`}
        >
          {word}
        </span>
      );
    });
  };
  
  // Format conversation style and narrator profile display
  const formatPlayerInfo = () => {
    if (!conversationStyle && !narratorProfile) return null;
    
    const styleLabel = conversationStyle ? 
      conversationStyle.replace('_', ' ').charAt(0).toUpperCase() + conversationStyle.replace('_', ' ').slice(1) : '';
    
    // Profile name mapping for better display
    const profileMap: Record<string, string> = {
      'neutral': 'Neutral',
      'grandma': 'Grandma',
      'kid': 'Kid', 
      'business': 'Business',
      'storyteller': 'Storyteller'
    };
    
    const profileLabel = narratorProfile ? (profileMap[narratorProfile] || narratorProfile) : '';
    
    if (styleLabel && profileLabel) {
      return `${styleLabel} • ${profileLabel}`;
    }
    return styleLabel || profileLabel;
  };
  
  if (!segments || segments.length === 0) {
    return (
      <div className={`text-center p-6 text-gray-400 ${className}`}>
        No audio segments available
      </div>
    );
  }
  
  return (
    <div className={`${className}`}>
      <div className="bg-gray-900 rounded-3xl p-3 shadow-2xl">
        <div className="bg-black rounded-2xl overflow-hidden relative">
          <div className="p-6 min-h-[250px] flex flex-col justify-center relative">
            {/* Title Display */}
            {title && (
              <div className="absolute top-4 right-4">
                <p className="text-white/60 text-sm font-medium">{title}</p>
              </div>
            )}
            
            {/* Main Content Area - Expanded Size */}
            <div className="text-center px-6 flex flex-col justify-center h-full">
              <div 
                ref={textContainerRef}
                className="min-h-[180px] max-h-[180px] overflow-y-auto scrollbar-hide"
              >
                <p className="text-lg leading-relaxed font-medium text-left">
                  {currentSegmentData ? (
                    <>
                      <span className="text-white/40 mr-1">"</span>
                      {renderHighlightedText(currentSegmentData.text)}
                      <span className="text-white/40 ml-1">"</span>
                    </>
                  ) : (
                    <span className="text-gray-400 italic">Press play to start narration</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Player Controls */}
        <div className="mt-2 bg-gray-800 rounded-xl p-2">
          {/* Top Row: Metadata and Segment Counter */}
          <div className="flex items-center justify-between mb-2">
            {formatPlayerInfo() && (
              <div className="text-white/80 text-xs font-medium bg-white/10 backdrop-blur-sm rounded px-2 py-0.5">
                {formatPlayerInfo()}
              </div>
            )}
            {showSegmentCounter && (
              <div className="text-xs text-gray-400 font-mono">
                {currentSegment + 1}/{segments.length}
              </div>
            )}
          </div>
          
          {/* Progress Bar */}
          {showProgressBar && (
            <div className="mb-2">
              <div 
                className="w-full bg-gray-700 rounded-full h-1.5 overflow-hidden cursor-pointer"
                onClick={handleProgressClick}
              >
                <div 
                  className="bg-gradient-to-r from-green-500 to-blue-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {showTimeDisplay && (
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              )}
            </div>
          )}
          
          {/* Media Controls */}
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePreviousSegment}
              disabled={currentSegment === 0}
              className="text-white hover:text-green-400 h-8 w-8 p-0"
            >
              <SkipBack className="w-4 h-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePlayPause}
              disabled={!currentSegmentData?.audioUrl}
              className="text-white hover:text-green-400 h-10 w-10 p-0"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNextSegment}
              disabled={currentSegment >= segments.length - 1}
              className="text-white hover:text-green-400 h-8 w-8 p-0"
            >
              <SkipForward className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* CSS for audio wave animation */}
      <style>{`
        @keyframes audioWave {
          0%, 100% { 
            height: 30%; 
          }
          50% { 
            height: 100%; 
          }
        }
      `}</style>
    </div>
  );
}