import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { VoiceSampleCard } from "@/components/ui/voice-sample-card";
import { Mic, Volume2, Users } from "lucide-react";
import { AUDIO_PROCESSING_CONFIG } from "@shared/audio-config";
import { getErrorMessage, I18N_CONFIG } from "@shared/i18n-config";

interface StoryAnalysis {
  emotions: Array<{
    emotion: string;
    intensity: number;
    context: string;
    quote?: string;
  }>;
  soundEffects?: Array<{
    sound: string;
    intensity: number;
    context: string;
    quote?: string;
  }>;
  moodCategory?: string;
  genre?: string;
  subGenre?: string;
  emotionalTags?: string[];
}

interface StoryVoiceSamplesProps {
  storyId: number;
  analysisData: StoryAnalysis;
}

interface VoiceTemplate {
  emotion: string;
  displayName: string;
  sampleText: string;
  category: string;
  intensity: number;
  description: string;
  recordedSample?: any;
  isRecorded: boolean;
  isLocked: boolean;
  sortOrder: number;
}

export default function StoryVoiceSamples({ storyId, analysisData }: StoryVoiceSamplesProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string>("emotions");

  // Get recorded samples from global voice samples system
  const { data: progress } = useQuery({
    queryKey: ["/api/voice-modulations/progress"],
    enabled: !!user?.id,
  });
  
  const recordedSamples: any[] = ((progress as any)?.recordedSamples) || [];

  // Generate story-specific templates from analysis
  const generateStoryTemplates = (): VoiceTemplate[] => {
    const templates: VoiceTemplate[] = [];

    // Add emotions from story analysis
    if (analysisData.emotions) {
      analysisData.emotions.forEach((emotion) => {
        const recordedSample = recordedSamples.find((r: any) => 
          r.emotion === emotion.emotion.toLowerCase()
        );
        const isRecorded = !!recordedSample;
        const isLocked = recordedSample?.isLocked || false;

        templates.push({
          emotion: emotion.emotion.toLowerCase(),
          displayName: emotion.emotion.charAt(0).toUpperCase() + emotion.emotion.slice(1),
          sampleText: emotion.quote || emotion.context,
          category: "emotions",
          intensity: emotion.intensity,
          description: emotion.context,
          recordedSample,
          isRecorded,
          isLocked,
          sortOrder: isLocked ? 3 : (isRecorded ? 2 : 1)
        });
      });
    }

    // Add sounds from story analysis
    if (analysisData.soundEffects) {
      analysisData.soundEffects.forEach((sound) => {
        const recordedSample = recordedSamples.find((r: any) => 
          r.emotion === sound.sound.toLowerCase()
        );
        const isRecorded = !!recordedSample;
        const isLocked = recordedSample?.isLocked || false;

        templates.push({
          emotion: sound.sound.toLowerCase(),
          displayName: sound.sound.charAt(0).toUpperCase() + sound.sound.slice(1),
          sampleText: sound.quote || sound.context,
          category: "sounds",
          intensity: sound.intensity,
          description: sound.context,
          recordedSample,
          isRecorded,
          isLocked,
          sortOrder: isLocked ? 3 : (isRecorded ? 2 : 1)
        });
      });
    }

    // Add modulations from story analysis
    const modulations: string[] = [];
    if (analysisData.moodCategory) modulations.push(analysisData.moodCategory);
    if (analysisData.genre) modulations.push(analysisData.genre);
    if (analysisData.subGenre) modulations.push(analysisData.subGenre);
    if (analysisData.emotionalTags) modulations.push(...analysisData.emotionalTags);

    modulations.forEach((modulation) => {
      const recordedSample = recordedSamples.find((r: any) => 
        r.emotion === modulation.toLowerCase()
      );
      const isRecorded = !!recordedSample;
      const isLocked = recordedSample?.isLocked || false;

      templates.push({
        emotion: modulation.toLowerCase(),
        displayName: modulation.charAt(0).toUpperCase() + modulation.slice(1),
        sampleText: `Express the ${modulation} feeling from this story`,
        category: "modulations",
        intensity: 5, // Default intensity for modulations
        description: `${modulation} modulation for this story`,
        recordedSample,
        isRecorded,
        isLocked,
        sortOrder: isLocked ? 3 : (isRecorded ? 2 : 1)
      });
    });

    return templates;
  };

  const storyTemplates = generateStoryTemplates();

  // Filter templates by category
  const filteredTemplates = storyTemplates.filter(template => 
    template.category === selectedCategory
  );

  // Sort templates (same as voice-samples page)
  const sortedTemplates = filteredTemplates.sort((a, b) => a.sortOrder - b.sortOrder);

  // Get categories with counts
  const categories = [
    { 
      id: "emotions", 
      name: "Emotions", 
      count: storyTemplates.filter(t => t.category === "emotions").length,
      icon: <Mic className="w-4 h-4" />
    },
    { 
      id: "sounds", 
      name: "Sounds", 
      count: storyTemplates.filter(t => t.category === "sounds").length,
      icon: <Volume2 className="w-4 h-4" />
    },
    { 
      id: "modulations", 
      name: "Modulations", 
      count: storyTemplates.filter(t => t.category === "modulations").length,
      icon: <Users className="w-4 h-4" />
    }
  ];

  // Voice recording mutation (using global voice samples API)
  const recordVoiceMutation = useMutation({
    mutationFn: async ({ emotion, audioBlob }: { emotion: string; audioBlob: Blob }) => {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice-sample.mp3');
      
      // Create modulationKey expected by the API endpoint
      const modulationKey = `${selectedCategory}-${emotion.toLowerCase()}`;
      formData.append('modulationKey', modulationKey);
      formData.append('modulationType', selectedCategory);

      return apiRequest('/api/voice-modulations/record', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/voice-modulations/progress"] });
      toast({
        title: "Voice sample recorded",
        description: "Your voice sample has been saved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Recording failed",
        description: error.message || "Failed to save voice sample",
        variant: "destructive",
      });
    }
  });

  const handleRecordingComplete = (emotion: string) => (audioBlob: Blob) => {
    recordVoiceMutation.mutate({ emotion, audioBlob });
  };

  const handlePlaySample = (audioUrl: string) => {
    const audio = new Audio(audioUrl);
    audio.play().catch(console.error);
  };

  if (!analysisData || storyTemplates.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">No emotions, sounds, or modulations found in this story.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Story Voice Samples</h2>
        <p className="text-gray-600">
          Record your voice for emotions, sounds, and modulations found in this story
        </p>
      </div>

      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          {categories.map((category) => (
            <TabsTrigger 
              key={category.id} 
              value={category.id}
              className="flex items-center gap-2"
            >
              {category.icon}
              {category.name}
              <Badge variant="secondary" className="ml-1">
                {category.count}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map((category) => (
          <TabsContent key={category.id} value={category.id} className="space-y-4">
            {sortedTemplates.length === 0 ? (
              <div className="text-center p-8">
                <p className="text-gray-500">
                  No {category.name.toLowerCase()} found in this story.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sortedTemplates.map((template) => (
                  <VoiceSampleCard
                    key={`${template.category}-${template.emotion}`}
                    emotion={template.emotion}
                    displayName={template.displayName}
                    sampleText={template.sampleText}
                    category={template.category}
                    intensity={template.intensity}
                    description={template.description}
                    recordedSample={template.recordedSample}
                    isRecorded={template.isRecorded}
                    isLocked={template.isLocked}
                    onRecordingComplete={handleRecordingComplete(template.emotion)}
                    onPlaySample={handlePlaySample}
                    targetDuration={10}
                    disabled={false}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <div className="text-center text-sm text-gray-500 mt-8">
        <p>Voice samples are stored globally and can be used across all your stories.</p>
        <p>Only emotions, sounds, and modulations from this specific story are shown here.</p>
      </div>
    </div>
  );
}