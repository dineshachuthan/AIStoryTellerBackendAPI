import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Mic, Play, Trash2, CheckCircle, Circle, Volume2, LogOut, Lock, Unlock } from "lucide-react";
import { cn } from "@/lib/utils";
import { EnhancedVoiceRecorder } from "@/components/ui/enhanced-voice-recorder";
// import { VoiceTrainingStatus } from "@/components/voice-training-status";

interface EmotionTemplate {
  emotion: string;
  displayName: string;
  description: string;
  sampleText: string;
  targetDuration: number;
  category: string;
}

interface UserVoiceSample {
  emotion: string;
  audioUrl: string;
  duration: number;
  recordedAt: Date;
  storyId?: number;
}

interface VoiceProgress {
  totalEmotions: number;
  recordedEmotions: number;
  completionPercentage: number;
  missingEmotions: string[];
  recordedSamples: UserVoiceSample[];
}

interface CloningProgress {
  emotions: {
    count: number;
    threshold: number;
    canTrigger: boolean;
    isTraining: boolean;
    status: string;
  };
  sounds: {
    count: number;
    threshold: number;
    canTrigger: boolean;
    isTraining: boolean;
    status: string;
  };
  modulations: {
    count: number;
    threshold: number;
    canTrigger: boolean;
    isTraining: boolean;
    status: string;
  };
}

export default function VoiceSamples() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const queryClient = useQueryClient();

  // Helper function to check if any voice cloning is in progress
  const isAnyVoiceCloningInProgress = () => {
    if (!cloningProgress) return false;
    return cloningProgress.emotions.isTraining || 
           cloningProgress.sounds.isTraining || 
           cloningProgress.modulations.isTraining;
  };

  // Get voice modulation templates (new system with three categories)
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ["/api/voice-modulations/templates"],
  });

  // Get user's voice modulation progress
  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: ["/api/voice-modulations/progress"],
  });

  // Get voice cloning progress - ONLY when user has recorded samples
  const hasRecordedSamples = progress && (progress as any)?.recordedSamples?.length > 0;
  const { data: cloningProgress, isLoading: cloningProgressLoading } = useQuery<CloningProgress>({
    queryKey: ["/api/voice-cloning/progress"],
    enabled: hasRecordedSamples, // Only fetch when user has actually recorded voice samples
  });

  // Manual voice cloning trigger mutation  
  const triggerVoiceCloning = useMutation({
    mutationFn: async (category: 'emotions' | 'sounds' | 'modulations') => {
      const response = await fetch(`/api/voice-cloning/trigger/${category}`, {
        method: 'POST',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to trigger voice cloning');
      }
      return response.json();
    },
    onSuccess: () => {
      // Refresh progress to get updated cloning status
      queryClient.invalidateQueries({ queryKey: ['/api/voice-cloning/progress'] });
      queryClient.invalidateQueries({ queryKey: ['/api/voice-modulations/progress'] });
    },
    onError: (error) => {
      console.error('Voice cloning trigger error:', error);
      // Error state will be handled by the component using triggerVoiceCloning.error
    }
  });

  // Save voice modulation mutation
  const saveVoiceModulation = useMutation({
    mutationFn: async ({ emotion, audioBlob }: { emotion: string; audioBlob: Blob }) => {
      const formData = new FormData();
      formData.append("modulationKey", emotion);
      formData.append("audio", audioBlob, `${emotion}_sample.webm`);
      formData.append("duration", "10"); // Default duration
      formData.append("modulationType", "emotion"); // Default type

      const response = await fetch("/api/voice-modulations/record", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to save voice modulation");
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      // Use setTimeout to delay query invalidation to prevent flickering
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/voice-modulations/progress"] });
        queryClient.invalidateQueries({ queryKey: ["/api/voice-modulations/templates"] });
      }, 100);
    },
  });

  // Delete voice modulation mutation
  const deleteVoiceModulation = useMutation({
    mutationFn: async (modulationKey: string) => {
      const response = await fetch(`/api/voice-modulations/delete`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ modulationKey }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete voice modulation");
      }

      return response.json();
    },
    onSuccess: (data, modulationKey) => {
      // Refresh progress data to update the UI
      queryClient.invalidateQueries({ queryKey: ["/api/voice-modulations/progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/voice-modulations/templates"] });
    },
    onError: (error) => {
      console.error("Delete voice modulation error:", error);
    },
  });

  // Play audio sample
  const playAudioSample = (audioUrl: string, emotion: string) => {
    if (playingAudio === emotion) {
      // Stop current audio
      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
      }
      setPlayingAudio(null);
      return;
    }

    // Stop any current audio
    if (audioElement) {
      audioElement.pause();
    }

    // Play new audio
    const audio = new Audio(audioUrl);
    audio.onended = () => setPlayingAudio(null);
    audio.onerror = () => {
      setPlayingAudio(null);
    };

    audio.play().catch((error) => {
      console.error("Audio play error:", error);
      setPlayingAudio(null);
    });

    setAudioElement(audio);
    setPlayingAudio(emotion);
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
      }
    };
  }, [audioElement]);

  // Filter templates by category (emotions, sounds, descriptions/modulations)
  const filteredTemplates = Array.isArray(templates) && templates.length > 0 ? templates.filter((template: any) => 
    template?.category === selectedCategory
  ) : [];

  // Get unique categories and map to friendly names - NO HARDCODED FALLBACKS
  const categoryMapping = {
    'emotions': 'Emotions',
    'sounds': 'Sounds', 
    'descriptions': 'Modulations'
  };
  
  const rawCategories = Array.isArray(templates) && templates.length > 0 ? 
    Array.from(new Set(templates.map((t: any) => t?.category).filter(Boolean))) : [];
  const categories = rawCategories.filter(cat => categoryMapping[cat as keyof typeof categoryMapping]);
  
  // Auto-select first available category when templates load
  useEffect(() => {
    if (categories.length > 0 && !selectedCategory) {
      setSelectedCategory(categories[0]);
    }
  }, [categories, selectedCategory]);

  // Debug logging
  console.log('Templates:', templates);
  console.log('Categories:', categories);
  console.log('Selected category:', selectedCategory);
  console.log('Filtered templates:', filteredTemplates);

  // Check if modulation is recorded
  const isModulationRecorded = (modulationKey: string): boolean => {
    const recordedSamples = (progress as any)?.recordedSamples || [];
    return recordedSamples.some((sample: any) => sample.emotion === modulationKey);
  };

  // Get recorded sample for modulation
  const getRecordedSample = (modulationKey: string): any | undefined => {
    const recordedSamples = (progress as any)?.recordedSamples || [];
    return recordedSamples.find((sample: any) => sample.emotion === modulationKey);
  };

  // Handler for recording new voice modulations
  const handleRecord = async (template: any, audioBlob: Blob): Promise<void> => {
    await saveVoiceModulation.mutateAsync({
      emotion: template.modulationKey,
      audioBlob
    });
  };

  // Get user voice samples data - fix progress data structure
  const userVoiceSamples: any[] = (progress as any)?.recordedSamples?.map((sample: any) => ({
    modulationKey: sample.emotion,
    audioUrl: sample.audioUrl,
    recordedAt: new Date(sample.recordedAt),
    duration: sample.duration || 0
  })) || [];

  if (templatesLoading || progressLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading voice samples...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="relative w-full min-h-screen bg-dark-bg text-dark-text">
        {/* Consistent Header matching Home page */}
      <div className="fixed top-0 left-0 right-0 bg-dark-bg/80 backdrop-blur-lg border-b border-gray-800 p-4 z-50">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            className="text-2xl font-bold text-white hover:bg-transparent p-0"
          >
            DeeVee
          </Button>
          
          <div className="flex items-center space-x-3">
            <Button
              onClick={() => setLocation("/voice-samples")}
              variant="outline"
              size="sm"
              className="border-tiktok-cyan text-tiktok-cyan hover:bg-tiktok-cyan/20"
            >
              <Volume2 className="w-4 h-4 mr-2" />
              Voice Samples
            </Button>

            <Button
              onClick={async () => {
                try {
                  await logout();
                  setLocation('/');
                } catch (error) {
                  console.error('Logout failed:', error);
                }
              }}
              variant="outline"
              size="sm"
              className="border-red-500 text-red-500 hover:bg-red-500/20"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>

            <Button
              onClick={() => setLocation("/profile")}
              variant="ghost"
              size="sm"
              className="relative h-8 w-8 rounded-full p-0"
            >
              <div className="h-8 w-8 rounded-full bg-tiktok-red text-white text-xs flex items-center justify-center">
                {user?.displayName ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'}
              </div>
            </Button>
          </div>
        </div>
      </div>

      <div className="pt-20 container mx-auto px-3 py-1 max-w-6xl">
      {/* Compact Header */}
      <div className="mb-3">
        <h1 className="text-xl font-bold mb-1">Voice Samples Collection</h1>
        <p className="text-sm text-muted-foreground mb-3">
          Record your voice expressing different emotions to create personalized AI narration for your stories.
        </p>

        {/* Compact Progress Overview */}
        {progress && progress !== null && (
          <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium">Voice Collection</span>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {(progress as any).recordedTemplates || 0}/{(progress as any).totalTemplates || 0} samples
              </span>
            </div>
            <Progress value={(progress as any).completionPercentage || 0} className="h-2" />
          </div>
        )}

        {/* ElevenLabs Voice Training Status */}
        {/* <div className="mb-4">
          <VoiceTrainingStatus userId={user?.id || ''} />
        </div> */}
      </div>

        {/* Category Tabs with Visual Separation */}
        {/* Empty State - Show when no templates/categories exist */}
        {categories.length === 0 ? (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <Mic className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Voice Categories Available
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Voice samples will become available after you create and analyze stories. 
                Stories with emotions, characters, and dialogue will generate voice recording categories.
              </p>
              <Button
                onClick={() => setLocation("/")}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Create Your First Story
              </Button>
            </div>
          </div>
        ) : (
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4 h-auto p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
              {categories.map((category) => (
                <TabsTrigger 
                  key={category} 
                  value={category} 
                  className="text-xs sm:text-sm px-3 py-2 font-medium rounded-md transition-all data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-blue-400"
                >
                  {categoryMapping[category as keyof typeof categoryMapping]}
                </TabsTrigger>
              ))}
            </TabsList>

        {categories.map((category) => (
          <TabsContent key={category} value={category} className="mt-6">
            {/* Tab Content Container with Visual Separation */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-6">
              {/* Tab Header */}
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {categoryMapping[category as keyof typeof categoryMapping]} Collection
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Record your voice samples for {category === 'emotion' ? 'emotional expressions' : category === 'sound' ? 'sound effects and vocalizations' : 'narrative modulation styles'}
                </p>
              </div>

              {/* Voice Cloning Progress Button */}
              {cloningProgress && (
                <div className="mb-6">
                  <VoiceCloningButton 
                    category={category}
                    progress={cloningProgress[category === 'emotion' ? 'emotions' : category === 'sound' ? 'sounds' : 'modulations' as keyof CloningProgress]}
                    onTrigger={() => triggerVoiceCloning.mutate((category === 'emotion' ? 'emotions' : category === 'sound' ? 'sounds' : 'modulations') as 'emotions' | 'sounds' | 'modulations')}
                    isLoading={triggerVoiceCloning.isPending}
                    isMutationPending={triggerVoiceCloning.isPending}
                  />
                </div>
              )}
              
              {/* Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Sort templates: unlocked first, then recorded (unlocked), then locked */}
              {filteredTemplates
                .filter((template: any, index: number, self: any[]) => 
                  self.findIndex((t: any) => t.modulationKey === template.modulationKey) === index
                )
                .map((template: any) => {
                  const recordedSample = getRecordedSample(template.modulationKey);
                  const isRecorded = !!recordedSample;
                  const isLocked = recordedSample?.isLocked || false;
                  
                  return {
                    ...template,
                    recordedSample,
                    isRecorded,
                    isLocked,
                    sortOrder: isLocked ? 3 : (isRecorded ? 2 : 1) // unlocked empty=1, recorded=2, locked=3
                  };
                })
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((template: any) => {
                  const { recordedSample, isRecorded, isLocked } = template;
                  
                  const getStatusIcon = () => {
                    if (isLocked) {
                      return (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Lock className="w-5 h-5 text-blue-500 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="max-w-xs">
                              <p className="font-semibold">Cloned and locked</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {template.description}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                                User voice is cloned so locked and hence modification to this voice is not allowed.
                              </p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    } else if (isRecorded) {
                      return (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Unlock className="w-5 h-5 text-green-500 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="max-w-xs">
                              <p className="font-semibold">Recorded and unlocked</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {template.description}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                                User sample voice is recorded but not used for cloning yet so kept unlocked.
                              </p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    } else {
                      return (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Unlock className="w-5 h-5 text-gray-400 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="max-w-xs">
                              <p className="font-semibold">Empty and unlocked</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {template.description}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                                User sample voice for this emotion not recorded.
                              </p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    }
                  };

                  return (
                    <div key={template.modulationKey} className={cn(
                      "p-3 rounded-lg border transition-all duration-200",
                      isAnyVoiceCloningInProgress()
                        ? "border-orange-300 bg-orange-50 dark:bg-orange-950 dark:border-orange-700 opacity-75 cursor-not-allowed"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    )}>
                      <div className="mb-2 flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-sm">{template.displayName}</h3>
                          {getStatusIcon()}
                        </div>
                        <Badge variant="secondary" className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                          {template.category || 'basic'}
                        </Badge>
                      </div>
                      
                      <EnhancedVoiceRecorder
                        buttonText={{
                          hold: isAnyVoiceCloningInProgress()
                            ? "🚫 Cloning in Progress"
                            : isLocked 
                              ? "🔒 Locked" 
                              : isRecorded 
                                ? "Re-record" 
                                : "Record",
                          recording: "Recording...",
                          instructions: isAnyVoiceCloningInProgress()
                            ? "Voice cloning in progress - please wait"
                            : isLocked 
                              ? "Sample locked for voice cloning" 
                              : isRecorded 
                                ? "Hold to re-record" 
                                : "Hold button to record"
                        }}
                        sampleText={template.sampleText}
                        emotionDescription={template.description}
                        emotionName=""
                        category=""
                        isRecorded={isRecorded}
                        isLocked={isLocked}
                        onRecordingComplete={(audioBlob) => {
                          if (!isLocked) {
                            saveVoiceModulation.mutate({
                              emotion: template.modulationKey,
                              audioBlob
                            });
                          }
                        }}
                        className="w-full"
                        disabled={saveVoiceModulation.isPending || isLocked || isAnyVoiceCloningInProgress()}
                        maxRecordingTime={template.targetDuration}
                        existingRecording={isRecorded && recordedSample ? {
                          url: recordedSample.audioUrl,
                          recordedAt: new Date(recordedSample.recordedAt)
                        } : undefined}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>
        ))}
          </Tabs>
        )}
        </div>
      </div>
    </TooltipProvider>
  );
}

// VoiceCloningButton Component
interface VoiceCloningButtonProps {
  category: string;
  progress: {
    count: number;
    threshold: number;
    canTrigger: boolean;
    isTraining: boolean;
    status: string;
  };
  onTrigger: () => void;
  isLoading: boolean;
  isMutationPending?: boolean;
  error?: Error | null;
  onErrorDismiss?: () => void;
}

function VoiceCloningButton({ category, progress, onTrigger, isLoading, isMutationPending = false, error, onErrorDismiss }: VoiceCloningButtonProps) {
  const categoryNames = {
    'emotion': 'Emotions',
    'sound': 'Sounds',
    'modulation': 'Modulations'
  };

  const categoryName = categoryNames[category as keyof typeof categoryNames] || category;
  const progressText = `${progress.count}/${progress.threshold}`;
  
  const getButtonText = () => {
    if (isMutationPending) {
      return 'Starting Cloning...';
    }
    if (progress.isTraining) {
      return 'Cloning in Progress...';
    }
    if (progress.canTrigger && !error) {
      return 'Clone now';
    }
    if (error) {
      return 'Try Again';
    }
    return `${progressText} needed to kick start cloning`;
  };

  const getButtonStyle = () => {
    if (isMutationPending) {
      return "bg-blue-500 hover:bg-blue-600 text-white cursor-not-allowed";
    }
    if (progress.isTraining) {
      return "bg-orange-500 hover:bg-orange-600 text-white cursor-not-allowed";
    }
    if (error) {
      return "bg-red-500 hover:bg-red-600 text-white";
    }
    if (progress.canTrigger) {
      return "bg-green-500 hover:bg-green-600 text-white";
    }
    return "bg-gray-400 text-gray-700 cursor-not-allowed";
  };

  return (
    <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {categoryName} Voice Cloning
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {progress.isTraining 
              ? 'ElevenLabs is training your voice. This may take a few minutes.'
              : progress.canTrigger 
                ? `Clone your ${category} voice from samples. Once cloned, these sample voices will be locked and no modification allowed.`
                : `Record ${progress.threshold - progress.count} more samples to enable cloning.`
            }
          </p>
        </div>
        
        <Button
          onClick={error ? onErrorDismiss : onTrigger}
          disabled={(!progress.canTrigger && !error) || progress.isTraining || isLoading || isMutationPending}
          className={cn(
            "ml-4 min-w-[200px]",
            getButtonStyle()
          )}
        >
          {(progress.isTraining || isMutationPending) && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          )}
          {getButtonText()}
        </Button>
      </div>
      
      {/* Progress Bar */}
      <div className="mt-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-gray-500">Progress</span>
          <span className="text-xs text-gray-500">{progressText}</span>
        </div>
        <Progress 
          value={(progress.count / progress.threshold) * 100} 
          className="h-2"
        />
      </div>
    </div>
  );
}