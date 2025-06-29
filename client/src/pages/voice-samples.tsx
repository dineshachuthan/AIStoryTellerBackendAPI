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
      // Refresh progress data to update the UI
      queryClient.invalidateQueries({ queryKey: ["/api/voice-modulations/progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/voice-modulations/templates"] });
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
    <>
      {/* Header */}
      <AppHeader />
      <AppTopNavigation />
      
      <div className="container mx-auto px-4 py-2 max-w-6xl">
      {/* Compact Header */}
      <div className="mb-3">
        <h1 className="text-xl font-bold mb-1">Voice Samples Collection</h1>
        <p className="text-sm text-muted-foreground mb-3">
          Record your voice expressing different emotions to create personalized AI narration for your stories.
        </p>

        {/* Compact Progress Overview */}
        {progress && (
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
      </div>

        {/* Category Tabs with Visual Separation */}
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
          <TabsContent key={category} value={category}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredTemplates.map((template: any) => {
                const recordedSample = getRecordedSample(template.modulationKey);
                const isRecorded = !!recordedSample;

                return (
                  <div key={template.modulationKey}>
                    <EnhancedVoiceRecorder
                      buttonText={{
                        hold: isRecorded ? `Re-record ${template.displayName}` : `Record ${template.displayName}`,
                        recording: "Recording...",
                        instructions: isRecorded ? "Hold to re-record" : "Hold button to record"
                      }}
                      sampleText={template.sampleText}
                      emotionDescription={template.description}
                      emotionName={template.displayName}
                      category={template.category}
                      isRecorded={isRecorded}
                      onRecordingComplete={(audioBlob) => {
                        saveVoiceModulation.mutate({
                          emotion: template.modulationKey,
                          audioBlob
                        });
                      }}
                      className="w-full"
                      disabled={saveVoiceModulation.isPending}
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
          </TabsContent>
        ))}
        </Tabs>
      </div>
    </>
  );
}