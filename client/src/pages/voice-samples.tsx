import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mic, Play, Trash2, CheckCircle, Circle, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppHeader } from "@/components/app-header";
import { AppTopNavigation } from "@/components/app-top-navigation";
import { EnhancedVoiceRecorder } from "@/components/ui/enhanced-voice-recorder";

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

export default function VoiceSamples() {
  const [selectedCategory, setSelectedCategory] = useState<string>("emotion");
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const queryClient = useQueryClient();

  // Get voice modulation templates (new system with three categories)
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ["/api/voice-modulations/templates"],
  });

  // Get user's voice modulation progress
  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: ["/api/voice-modulations/progress"],
  });

  // Save voice sample mutation
  const saveVoiceSample = useMutation({
    mutationFn: async ({ emotion, audioBlob }: { emotion: string; audioBlob: Blob }) => {
      const formData = new FormData();
      formData.append("emotion", emotion);
      formData.append("audio", audioBlob, `${emotion}_sample.webm`);
      formData.append("duration", "10"); // Default duration

      const response = await fetch("/api/voice-samples", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to save voice sample");
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      // Refresh progress data
      queryClient.invalidateQueries({ queryKey: ["/api/voice-samples/progress"] });
    },
  });

  // Delete voice sample mutation
  const deleteVoiceSample = useMutation({
    mutationFn: async (emotion: string) => {
      const response = await fetch(`/api/voice-samples/${emotion}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete voice sample");
      }

      return response.json();
    },
    onSuccess: (data, emotion) => {
      
      // Refresh progress data
      queryClient.invalidateQueries({ queryKey: ["/api/voice-samples/progress"] });
    },
    onError: (error) => {
      console.error("Delete voice sample error:", error);
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

  // Filter templates by modulation type (emotion, sound, modulation)
  const filteredTemplates = Array.isArray(templates) && templates.length > 0 ? templates.filter((template: any) => 
    template?.modulationType === selectedCategory
  ) : [];

  // Get unique modulation types and map to friendly names
  const categoryMapping = {
    'emotion': 'Emotions',
    'sound': 'Sounds', 
    'modulation': 'Modulations'
  };
  
  const rawCategories = Array.isArray(templates) && templates.length > 0 ? 
    Array.from(new Set(templates.map((t: any) => t?.modulationType).filter(Boolean))) : ['emotion'];
  const categories = rawCategories.filter(cat => categoryMapping[cat as keyof typeof categoryMapping]);
  
  // Debug logging
  console.log('Templates:', templates);
  console.log('Categories:', categories);
  console.log('Selected category:', selectedCategory);
  console.log('Filtered templates:', filteredTemplates);

  // Check if modulation is recorded
  const isModulationRecorded = (modulationKey: string): boolean => {
    // For now, return false as we'll implement user recordings later
    return false;
  };

  // Get recorded sample for modulation
  const getRecordedSample = (modulationKey: string): any | undefined => {
    // For now, return undefined as we'll implement user recordings later
    return undefined;
  };

  // Handler for recording new voice samples
  const handleRecord = async (template: VoiceTemplate, audioBlob: Blob): Promise<void> => {
    await saveVoiceSample.mutateAsync({
      emotion: template.modulationKey,
      audioBlob
    });
  };

  // Get user voice samples data - fix progress data structure
  const userVoiceSamples: RecordedSample[] = (progress as any)?.recordedSamples?.map((sample: any) => ({
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
    <>
      {/* Header */}
      <AppHeader />
      <AppTopNavigation />
      
      <div className="container mx-auto px-4 py-4 sm:py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Voice Samples Collection</h1>
        <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">
          Record your voice expressing different emotions to create personalized AI narration for your stories.
        </p>

        {/* Progress Overview */}
        {progress && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Volume2 className="w-5 h-5" />
                Your Voice Collection Progress
              </CardTitle>
              <CardDescription>
                {(progress as any).recordedTemplates || 0} of {(progress as any).totalTemplates || 0} voice samples recorded
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Progress</span>
                    <span>{(progress as any).completionPercentage || 0}%</span>
                  </div>
                  <Progress value={(progress as any).completionPercentage || 0} className="h-2" />
                </div>
                
                <div>
                  <p className="text-sm font-medium mb-2">
                    Start recording voice samples for different emotions, sounds, and modulations to personalize your stories.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4 sm:mb-6 h-auto">
          {categories.map((category) => (
            <TabsTrigger key={category} value={category} className="text-xs sm:text-sm px-2 py-2 sm:px-4 sm:py-3">
              {categoryMapping[category as keyof typeof categoryMapping]}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map((category) => (
          <TabsContent key={category} value={category}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredTemplates.map((template: any) => {
                const recordedSample = getRecordedSample(template.modulationKey);
                const isRecorded = !!recordedSample;

                return (
                  <Card 
                    key={template.modulationKey} 
                    className={cn(
                      "transition-all duration-200 hover:shadow-md",
                      isRecorded && "ring-2 ring-green-500 ring-opacity-50"
                    )}
                  >
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          {isRecorded ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <Circle className="w-5 h-5 text-muted-foreground" />
                          )}
                          {template.displayName}
                        </span>
                        <Badge variant={isRecorded ? "default" : "secondary"}>
                          {template.category}
                        </Badge>
                      </CardTitle>
                      <CardDescription>{template.description}</CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-3">
                        {isRecorded && recordedSample ? (
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => playAudioSample(recordedSample.audioUrl, template.modulationKey)}
                                className="flex items-center gap-2 flex-1"
                              >
                                <Play className="w-4 h-4" />
                                {playingAudio === template.modulationKey ? "Stop" : "Play Sample"}
                              </Button>
                              
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => deleteVoiceSample.mutate(template.modulationKey)}
                                disabled={deleteVoiceSample.isPending}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                            
                            <p className="text-xs text-muted-foreground">
                              Recorded: {new Date(recordedSample.recordedAt).toLocaleDateString()}
                              {recordedSample.duration > 0 && ` • ${recordedSample.duration}ms`}
                            </p>
                          </div>
                        ) : (
                          <EnhancedVoiceRecorder
                            buttonText={{
                              hold: `Record ${template.displayName}`,
                              recording: "Recording...",
                              instructions: `Say: "${template.sampleText}"`
                            }}
                            onRecordingComplete={(audioBlob) => {
                              saveVoiceSample.mutate({
                                emotion: template.modulationKey,
                                audioBlob
                              });
                            }}
                            className="w-full"
                            disabled={saveVoiceSample.isPending}
                            maxRecordingTime={10}
                          />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        ))}
      </Tabs>


      </div>
    </>
  );
}