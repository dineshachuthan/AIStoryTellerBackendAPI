import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download, AudioLines, Play, Settings, Trash2, SkipBack, SkipForward, Pause } from "lucide-react";
import StoryNarratorControls from "@/components/ui/story-narrator-controls";
import { SimpleAudioPlayer } from "@/components/ui/simple-audio-player";
import { useAuth } from "@/hooks/useAuth";
import { AppTopNavigation } from "@/components/app-top-navigation";
import { apiClient } from "@/lib/api-client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast, toastMessages } from "@/lib/toast-utils";
import { useState, useRef, useEffect, useMemo } from "react";

const CONVERSATION_STYLES = [
  "respectful",
  "business", 
  "jovial",
  "playful",
  "close_friends",
  "parent_to_child",
  "child_to_parent",
  "siblings"
];

// Emotion is set to "neutral" by default for now (future feature)

const NARRATOR_PROFILES = [
  { id: "neutral", name: "Neutral", description: "Your cloned voice" },
  { id: "grandma", name: "Grandma", description: "Warm, slow, caring" },
  { id: "kid", name: "Kid", description: "Energetic, fast, playful" },
  { id: "business", name: "Business", description: "Professional, clear" },
  { id: "storyteller", name: "Storyteller", description: "Dramatic, engaging" }
];

export default function StoryNarration() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const storyId = parseInt(id || "0");
  const queryClient = useQueryClient();
  
  // State for test generation controls
  const [conversationStyle, setConversationStyle] = useState("respectful");
  const [narratorProfile, setNarratorProfile] = useState("neutral");
  
  // Multi-segment audio player state - per narration
  const [audioStates, setAudioStates] = useState<Record<string, {
    isPlaying: boolean;
    currentSegment: number;
    currentTime: number;
    duration: number;
    progress: number;
  }>>({});
  
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});
  
  // Helper function to get narration key
  const getNarrationKey = (style: string, profile: string) => `${style}-${profile}`;
  
  // Helper function to get or create audio state
  const getAudioState = (narrationKey: string) => {
    return audioStates[narrationKey] || {
      isPlaying: false,
      currentSegment: 0,
      currentTime: 0,
      duration: 0,
      progress: 0
    };
  };
  
  // Helper function to update audio state
  const updateAudioState = (narrationKey: string, updates: Partial<typeof audioStates[string]>) => {
    setAudioStates(prev => ({
      ...prev,
      [narrationKey]: { ...getAudioState(narrationKey), ...updates }
    }));
  };
  
  // Emotion is hardcoded to "neutral" for now (future feature)
  const emotion = "neutral";

  // Fetch story details
  const { data: story, isLoading } = useQuery({
    queryKey: [`/api/stories/${storyId}`],
    queryFn: () => apiClient.stories.get(storyId),
    enabled: !!storyId && !!user
  });



  // Fetch all narrations for this story
  const { data: allNarrations = [], isLoading: allNarrationsLoading, refetch: refetchNarrations } = useQuery({
    queryKey: [`/api/stories/${storyId}/narrations/all`],
    queryFn: () => apiClient.stories.getAllNarrations(storyId),
    enabled: !!storyId && !!user
  });

  // Narration generation mutation
  const generateNarrationMutation = useMutation({
    mutationFn: () => {
      console.log(`[GenerateNarration] Generating narration for storyId: ${storyId}, style: ${conversationStyle}, profile: ${narratorProfile}`);
      return apiClient.stories.generateNarration(storyId, conversationStyle, narratorProfile);
    },
    onSuccess: (data) => {
      console.log('[GenerateNarration] Success:', data);
      toast.success("Narration generated successfully");
      refetchNarrations();
    },
    onError: (error) => {
      console.error('[GenerateNarration] Error:', error);
      toast.error(`Failed to generate narration: ${error.message}`);
    }
  });

  // Delete narration mutation
  const deleteNarrationMutation = useMutation({
    mutationFn: (narrationId: number) => {
      console.log(`[DeleteNarration] Deleting narration ${narrationId} for story ${storyId}`);
      return apiClient.stories.deleteNarration(storyId, narrationId);
    },
    onSuccess: (data, narrationId) => {
      console.log('[DeleteNarration] Success:', data);
      toast.success("Narration deleted successfully - removed from database, cache, and audio files");
      
      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({
        queryKey: [`/api/stories/${storyId}/narrations/all`]
      });
      refetchNarrations();
    },
    onError: (error) => {
      console.error('[DeleteNarration] Error:', error);
      toast.error(`Failed to delete narration: ${error.message}`);
    }
  });

  // Get current narration from all narrations
  const narration = useMemo(() => {
    return allNarrations.find(n => 
      n.conversationStyle === conversationStyle && 
      n.narratorProfile === narratorProfile
    ) || null;
  }, [allNarrations, conversationStyle, narratorProfile]);
  
  // Get current narration key and audio state
  const currentNarrationKey = getNarrationKey(conversationStyle, narratorProfile);
  const currentAudioState = getAudioState(currentNarrationKey);
  
  // Extract current audio state properties for easier access
  const { isPlaying, currentSegment, currentTime, duration, progress } = currentAudioState;

  // Audio event handlers and progress tracking
  useEffect(() => {
    const narrationKey = currentNarrationKey;
    
    if (!audioRefs.current[narrationKey]) {
      audioRefs.current[narrationKey] = new Audio();
    }
    
    const audio = audioRefs.current[narrationKey];

    const handleTimeUpdate = () => {
      if (audio.duration && audio.currentTime) {
        updateAudioState(narrationKey, {
          currentTime: audio.currentTime,
          duration: audio.duration,
          progress: (audio.currentTime / audio.duration) * 100
        });
      }
    };

    const handleLoadedMetadata = () => {
      if (audio.duration) {
        updateAudioState(narrationKey, {
          duration: audio.duration
        });
      }
    };

    const handleEnded = () => {
      const currentNarration = allNarrations.find(n => n.conversationStyle === conversationStyle && n.narratorProfile === narratorProfile);
      const currentState = getAudioState(narrationKey);
      
      if (currentNarration?.segments && currentState.currentSegment < currentNarration.segments.length - 1) {
        const nextSegment = currentState.currentSegment + 1;
        updateAudioState(narrationKey, {
          currentSegment: nextSegment,
          currentTime: 0,
          progress: 0
        });
        
        const nextSegmentData = currentNarration.segments[nextSegment];
        if (nextSegmentData?.audioUrl) {
          audio.src = nextSegmentData.audioUrl;
          audio.play().catch(console.error);
        }
      } else {
        updateAudioState(narrationKey, {
          isPlaying: false,
          progress: 0,
          currentTime: 0
        });
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentNarrationKey, allNarrations, conversationStyle, narratorProfile]);

  // Reset segment when switching narrations
  useEffect(() => {
    const narrationKey = currentNarrationKey;
    updateAudioState(narrationKey, {
      currentSegment: 0,
      isPlaying: false,
      progress: 0,
      currentTime: 0,
      duration: 0
    });
    
    if (audioRefs.current[narrationKey]) {
      audioRefs.current[narrationKey].pause();
      audioRefs.current[narrationKey].currentTime = 0;
    }
  }, [conversationStyle, narratorProfile, currentNarrationKey]);

  if (isLoading || allNarrationsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading story...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-2">Please log in to view story narration</p>
          <Button
            variant="outline"
            onClick={() => navigate("/login")}
            className="mt-4"
          >
            Log In
          </Button>
        </div>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Story not found</p>
          <Button
            variant="outline"
            onClick={() => navigate("/")}
            className="mt-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <AppTopNavigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Story Title */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">
              {story?.title || "Loading..."}
            </h1>
            <p className="text-white/70">
              Story Narration
            </p>

          </div>

          {/* Narration Generation Controls - For generating different cache keys */}
          <Card className="mt-6 bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Narration Generation Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="conversation-style" className="text-white/90">
                    Conversation Style
                  </Label>
                  <Select 
                    value={conversationStyle} 
                    onValueChange={setConversationStyle}
                  >
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONVERSATION_STYLES.map((style) => (
                        <SelectItem key={style} value={style}>
                          {style.replace('_', ' ').charAt(0).toUpperCase() + style.replace('_', ' ').slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="narrator-profile" className="text-white/90">
                    Narrator Profile
                  </Label>
                  <Select value={narratorProfile} onValueChange={setNarratorProfile}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NARRATOR_PROFILES.map((profile) => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.name} - {profile.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="pt-4">
                <Button 
                  onClick={() => generateNarrationMutation.mutate()}
                  disabled={generateNarrationMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {generateNarrationMutation.isPending ? "Generating..." : "Generate Narration"}
                </Button>
                <p className="text-sm text-white/60 mt-2">
                  This will generate a narration with the selected conversation style and narrator profile.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* All Available Narrations Section */}
          {allNarrations && allNarrations.length > 0 && (
            <div className="mt-8">
              <h2 className="text-2xl font-bold text-white mb-4">
                All Available Narrations ({allNarrations.length})
              </h2>
              <div className="grid gap-4">
                {allNarrations.map((narration) => (
                  <div
                    key={narration.id}
                    className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-medium text-white/90">
                          Conversation Style: {narration.conversationStyle.replace('_', ' ').charAt(0).toUpperCase() + narration.conversationStyle.replace('_', ' ').slice(1)}
                        </div>
                        <div className="text-sm text-white/60">
                          Narrator Profile: {(() => {
                            const profile = NARRATOR_PROFILES.find(p => p.id === narration.narratorProfile);
                            return profile ? `${profile.name} - ${profile.description}` : narration.narratorProfile;
                          })()}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-sm text-white/50">
                          {new Date(narration.timestamp).toLocaleString()}
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            const narrationId = parseInt(narration.id.replace('narration-', ''));
                            deleteNarrationMutation.mutate(narrationId);
                          }}
                          disabled={deleteNarrationMutation.isPending}
                          className="h-8 w-8 p-0 bg-red-600 hover:bg-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {narration.audioUrl && (() => {
                      const narrationKey = `${narration.conversationStyle}-${narration.narratorProfile}`;
                      const audioState = getAudioState(narrationKey);
                      const { isPlaying: narrationIsPlaying, currentSegment: narrationCurrentSegment, currentTime: narrationCurrentTime, duration: narrationDuration, progress: narrationProgress } = audioState;
                      
                      return (
                        <div className="mt-6">
                          <div className="bg-gray-900 rounded-3xl p-4 shadow-2xl">
                            <div className="bg-black rounded-2xl overflow-hidden relative">
                              <div className="p-8 min-h-[300px] flex flex-col justify-center relative">
                                <div className="absolute top-4 left-4 flex items-center gap-1 h-8">
                                  {narrationIsPlaying && (
                                    <>
                                      {[...Array(5)].map((_, i) => (
                                        <div
                                          key={i}
                                          className="w-1 bg-green-400 rounded-full"
                                          style={{
                                            height: '100%',
                                            animation: `audioWave ${0.8 + i * 0.1}s ease-in-out infinite`,
                                            animationDelay: `${i * 0.1}s`,
                                            opacity: 0.7
                                          }}
                                        />
                                      ))}
                                      <span className="text-green-400 text-xs ml-2 font-mono">LIVE</span>
                                    </>
                                  )}
                                </div>
                                
                                <div className="absolute top-4 right-4">
                                  <span className="text-gray-400 text-sm font-mono">
                                    SEGMENT {narrationCurrentSegment + 1}/{narration.segments?.length || 0}
                                  </span>
                                </div>
                                
                                <div className="text-center px-8 flex flex-col justify-center h-full">
                                  <div className="space-y-4">
                                    {narrationIsPlaying && narration.segments && (
                                      <p className="text-sm font-mono text-green-400 opacity-100 transition-all duration-300">
                                        NOW PLAYING
                                      </p>
                                    )}
                                    <p className={`text-lg leading-relaxed font-medium transition-all duration-300 ${
                                      narrationIsPlaying && narration.segments 
                                        ? 'text-white opacity-100' 
                                        : 'text-gray-400 opacity-80'
                                    }`}>
                                      {narration.segments && narration.segments.length > 0 ? (
                                        `"${narration.segments[narrationCurrentSegment]?.text || 'Loading...'}"`
                                      ) : (
                                        'Press play to start narration'
                                      )}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="mt-4 bg-gray-800 rounded-xl p-4">
                              <div className="mb-4">
                                <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden cursor-pointer"
                                     onClick={(e) => {
                                       const audio = audioRefs.current[narrationKey];
                                       if (audio && narrationDuration > 0) {
                                         const rect = e.currentTarget.getBoundingClientRect();
                                         const percent = (e.clientX - rect.left) / rect.width;
                                         const newTime = percent * narrationDuration;
                                         audio.currentTime = newTime;
                                         updateAudioState(narrationKey, {
                                           currentTime: newTime,
                                           progress: percent * 100
                                         });
                                       }
                                     }}>
                                  <div 
                                    className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${narrationProgress}%` }}
                                  />
                                </div>
                                <div className="flex justify-between text-xs text-gray-400 mt-1">
                                  <span>{Math.floor(narrationCurrentTime / 60)}:{Math.floor(narrationCurrentTime % 60).toString().padStart(2, '0')}</span>
                                  <span>{Math.floor(narrationDuration / 60)}:{Math.floor(narrationDuration % 60).toString().padStart(2, '0')}</span>
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-center gap-4">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (narrationCurrentSegment > 0) {
                                      const newSegment = narrationCurrentSegment - 1;
                                      updateAudioState(narrationKey, {
                                        currentSegment: newSegment,
                                        progress: 0,
                                        currentTime: 0,
                                        duration: 0,
                                        isPlaying: false
                                      });
                                      
                                      if (audioRefs.current[narrationKey]) {
                                        audioRefs.current[narrationKey].pause();
                                      }
                                    }
                                  }}
                                  disabled={narrationCurrentSegment === 0}
                                  className="text-white hover:text-green-400"
                                >
                                  <SkipBack className="w-5 h-5" />
                                </Button>
                                
                                <Button
                                  variant="ghost"
                                  size="lg"
                                  onClick={() => {
                                    if (!audioRefs.current[narrationKey]) {
                                      audioRefs.current[narrationKey] = new Audio();
                                    }
                                    
                                    const audio = audioRefs.current[narrationKey];
                                    
                                    if (narrationIsPlaying) {
                                      audio.pause();
                                      updateAudioState(narrationKey, { isPlaying: false });
                                    } else {
                                      const segment = narration.segments?.[narrationCurrentSegment];
                                      if (segment?.audioUrl) {
                                        audio.src = segment.audioUrl;
                                        audio.play().then(() => {
                                          updateAudioState(narrationKey, { isPlaying: true });
                                        }).catch(console.error);
                                      }
                                    }
                                  }}
                                  disabled={!narration.segments?.[narrationCurrentSegment]?.audioUrl}
                                  className="text-white hover:text-green-400"
                                >
                                  {narrationIsPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                                </Button>
                                
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (narration.segments && narrationCurrentSegment < narration.segments.length - 1) {
                                      const newSegment = narrationCurrentSegment + 1;
                                      updateAudioState(narrationKey, {
                                        currentSegment: newSegment,
                                        progress: 0,
                                        currentTime: 0,
                                        duration: 0,
                                        isPlaying: false
                                      });
                                      
                                      if (audioRefs.current[narrationKey]) {
                                        audioRefs.current[narrationKey].pause();
                                      }
                                    }
                                  }}
                                  disabled={!narration.segments || narrationCurrentSegment >= narration.segments.length - 1}
                                  className="text-white hover:text-green-400"
                                >
                                  <SkipForward className="w-5 h-5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}