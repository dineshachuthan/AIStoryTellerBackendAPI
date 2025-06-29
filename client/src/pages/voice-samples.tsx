import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mic, Play, Trash2, CheckCircle, Circle, Volume2 } from "lucide-react";
import { PressHoldRecorder } from "@/components/ui/press-hold-recorder";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { AppHeader } from "@/components/app-header";
import { AppTopNavigation } from "@/components/app-top-navigation";

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
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get emotion templates
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ["/api/voice-samples/templates"],
  });

  // Get user's voice progress
  const { data: progress, isLoading: progressLoading } = useQuery<VoiceProgress>({
    queryKey: ["/api/voice-samples/progress"],
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
      toast({
        title: "Voice sample saved!",
        description: `Your ${variables.emotion} voice sample has been recorded successfully.`,
      });
      
      // Refresh progress data
      queryClient.invalidateQueries({ queryKey: ["/api/voice-samples/progress"] });
    },
    onError: (error) => {
      toast({
        title: "Recording failed",
        description: "Failed to save your voice sample. Please try again.",
        variant: "destructive",
      });
      console.error("Save voice sample error:", error);
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
      toast({
        title: "Voice sample deleted",
        description: `Your ${emotion} voice sample has been removed.`,
      });
      
      // Refresh progress data
      queryClient.invalidateQueries({ queryKey: ["/api/voice-samples/progress"] });
    },
    onError: (error) => {
      toast({
        title: "Delete failed",
        description: "Failed to delete voice sample. Please try again.",
        variant: "destructive",
      });
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
      toast({
        title: "Playback error",
        description: "Could not play the audio sample.",
        variant: "destructive",
      });
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

  // Filter templates by category
  const filteredTemplates = Array.isArray(templates) ? templates.filter((template: EmotionTemplate) => 
    template.category === selectedCategory
  ) : [];

  // Get unique categories
  const categories = Array.isArray(templates) ? Array.from(new Set(templates.map((t: EmotionTemplate) => t.category))) : ['emotion'];
  
  // Debug logging
  console.log('Templates:', templates);
  console.log('Categories:', categories);
  console.log('Selected category:', selectedCategory);
  console.log('Filtered templates:', filteredTemplates);

  // Check if emotion is recorded
  const isEmotionRecorded = (emotion: string): boolean => {
    return progress?.recordedSamples.some(sample => sample.emotion === emotion) || false;
  };

  // Get recorded sample for emotion
  const getRecordedSample = (emotion: string): UserVoiceSample | undefined => {
    return progress?.recordedSamples.find(sample => sample.emotion === emotion);
  };

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
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Voice Samples Collection</h1>
        <p className="text-muted-foreground mb-6">
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
                {progress.recordedEmotions} of {progress.totalEmotions} emotions recorded
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Progress</span>
                    <span>{progress.completionPercentage}%</span>
                  </div>
                  <Progress value={progress.completionPercentage} className="h-2" />
                </div>
                
                {progress.missingEmotions.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Missing emotions:</p>
                    <div className="flex flex-wrap gap-2">
                      {progress.missingEmotions.slice(0, 5).map((emotion) => (
                        <Badge key={emotion} variant="outline" className="text-xs">
                          {emotion}
                        </Badge>
                      ))}
                      {progress.missingEmotions.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{progress.missingEmotions.length - 5} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          {categories.map((category) => (
            <TabsTrigger key={category} value={category} className="capitalize">
              {category}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map((category) => (
          <TabsContent key={category} value={category}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map((template: EmotionTemplate) => {
                const isRecorded = isEmotionRecorded(template.emotion);
                const recordedSample = getRecordedSample(template.emotion);

                return (
                  <Card 
                    key={template.emotion} 
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

                    <CardContent className="space-y-4">
                      {/* Sample Text */}
                      <div className="bg-muted p-4 rounded-lg">
                        <p className="text-sm font-medium mb-2">Sample Text:</p>
                        <p className="text-sm italic leading-relaxed">
                          "{template.sampleText}"
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Target duration: {template.targetDuration} seconds
                        </p>
                      </div>

                      {/* Recording Controls */}
                      <div className="space-y-3">
                        {isRecorded && recordedSample ? (
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => playAudioSample(recordedSample.audioUrl, template.emotion)}
                                className="flex items-center gap-2 flex-1"
                              >
                                <Play className="w-4 h-4" />
                                {playingAudio === template.emotion ? "Stop" : "Play Sample"}
                              </Button>
                              
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => deleteVoiceSample.mutate(template.emotion)}
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
                          <PressHoldRecorder
                            buttonText={{
                              hold: `Record ${template.displayName}`,
                              recording: "Recording...",
                              instructions: `Say: "${template.sampleText}"`
                            }}
                            onRecordingComplete={(audioBlob) => {
                              saveVoiceSample.mutate({
                                emotion: template.emotion,
                                audioBlob
                              });
                            }}
                            className="w-full"
                            disabled={saveVoiceSample.isPending}
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

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 shadow-lg">
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {progress && (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary">
                      {progress.recordedEmotions}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {progress.recordedEmotions} of {progress.totalEmotions} emotions recorded
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {progress.completionPercentage}% complete
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              {progress && progress.completionPercentage === 100 ? (
                <Button size="lg" className="bg-green-600 hover:bg-green-700">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Save All Voices
                </Button>
              ) : (
                <div className="text-right">
                  <p className="text-sm font-medium">Keep recording</p>
                  <p className="text-xs text-muted-foreground">
                    {progress?.missingEmotions.length || 0} emotions remaining
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

        {/* Add bottom padding to prevent content from being hidden behind fixed navigation */}
        <div className="h-20"></div>
      </div>
    </>
  );
}