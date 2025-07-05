import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { VoiceSampleCard } from "@/components/ui/voice-sample-card";
import { Mic, Volume2, Users, Zap, DollarSign, Clock, AlertCircle } from "lucide-react";
import { AUDIO_PROCESSING_CONFIG } from "@shared/audio-config";
import { VoiceMessageService } from "@shared/i18n-config";

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

  // Get ESM reference data for professional sample texts  
  const { data: esmTemplates = [] } = useQuery({
    queryKey: ["/api/voice-modulations/templates"],
    enabled: true,
  });

  // Transform templates array into category-organized ESM data
  const esmData = React.useMemo(() => {
    const organized: any = {
      emotions: [],
      sounds: [],
      modulations: []
    };
    
    (esmTemplates as any[])?.forEach((template: any) => {
      if (template.category && organized[template.category]) {
        organized[template.category].push({
          emotion: template.emotion,
          sound: template.emotion, // Use emotion field for sound name
          name: template.emotion,
          sampleText: template.sampleText,
          displayName: template.displayName
        });
      }
    });
    
    console.log('🔧 Transformed ESM data:', {
      emotions: organized.emotions.length,
      sounds: organized.sounds.length, 
      modulations: organized.modulations.length
    });
    
    return organized;
  }, [esmTemplates]);

  // Helper function to get professional ESM sample text instead of story-based text
  const getOptimalSampleText = (itemName: string, category: string, storyQuote?: string, storyContext?: string): string => {
    // Debug: Log the ESM data structure
    console.log(`🔍 ESM Debug for ${itemName} (${category}):`, {
      esmDataKeys: Object.keys(esmData || {}),
      categoryData: (esmData as any)?.[category]?.slice(0, 3), // Show first 3 items
      categoryCount: (esmData as any)?.[category]?.length || 0
    });
    
    // First priority: Check ESM reference data for professional sample text
    const categoryData = (esmData as any)?.[category] || [];
    const esmItem = categoryData.find((item: any) => 
      item.emotion?.toLowerCase() === itemName.toLowerCase() || 
      item.sound?.toLowerCase() === itemName.toLowerCase() ||
      item.name?.toLowerCase() === itemName.toLowerCase()
    );
    
    if (esmItem?.sampleText && isTextSuitableForRecording(esmItem.sampleText)) {
      console.log(`✨ Using ESM professional text for ${itemName} (${category}): "${esmItem.sampleText.substring(0, 50)}..."`);
      return esmItem.sampleText;
    }
    
    // Second priority: Story quote if suitable length
    if (storyQuote && isTextSuitableForRecording(storyQuote)) {
      console.log(`📖 Using story quote for ${itemName}: "${storyQuote.substring(0, 50)}..."`);
      return storyQuote;
    }
    
    // Third priority: Story context if suitable length
    if (storyContext && isTextSuitableForRecording(storyContext)) {
      console.log(`📝 Using story context for ${itemName}: "${storyContext.substring(0, 50)}..."`);
      return storyContext;
    }
    
    // Fallback: Return best available text even if short
    const fallbackText = esmItem?.sampleText || storyQuote || storyContext || `Express the ${category.slice(0, -1)} of ${itemName}`;
    console.warn(`⚠️ Using fallback text for ${itemName}: "${fallbackText.substring(0, 50)}..."`);
    return fallbackText;
  };

  // Helper function to find recorded sample with category-aware matching
  const findRecordedSample = (itemName: string, category: string) => {
    return recordedSamples.find((r: any) => 
      r.emotion === `${category}-${itemName.toLowerCase()}` || r.emotion === itemName.toLowerCase()
    );
  };

  // Helper function to generate category-aware emotion key for saving
  const generateEmotionKey = (itemName: string, category: string) => {
    return `${category}-${itemName.toLowerCase()}`;
  };

  // Helper function to check if text has enough length for 6-second recording
  const isTextSuitableForRecording = (text: string): boolean => {
    if (!text) return false;
    // Estimate: ~3-4 words per second for natural speech, so ~18-24 words for 6 seconds
    // Use word count as primary metric, with character count as backup
    const wordCount = text.trim().split(/\s+/).length;
    const charCount = text.trim().length;
    
    // Minimum thresholds: 15 words OR 80 characters for 6-second recording
    return wordCount >= 15 || charCount >= 80;
  };

  // Enhanced sample text selection with ESM reference priority and length checking
  const selectOptimalSampleText = async (emotionName: string, category: string, storyQuote?: string, storyContext?: string): Promise<string> => {
    try {
      // First, try to get professional ESM reference text
      const response = await fetch(`/api/voice-modulations/templates?category=${category}`);
      if (response.ok) {
        const templates = await response.json();
        const esmTemplate = templates.find((t: any) => t.emotion.toLowerCase() === emotionName.toLowerCase());
        
        if (esmTemplate?.sampleText && isTextSuitableForRecording(esmTemplate.sampleText)) {
          console.log(`✅ Using ESM reference text for ${emotionName}: "${esmTemplate.sampleText.substring(0, 50)}..."`);
          return esmTemplate.sampleText;
        }
      }
    } catch (error) {
      console.warn(`Failed to fetch ESM reference for ${emotionName}:`, error);
    }

    // Fallback to story data with length checking
    const candidates = [storyQuote, storyContext].filter(Boolean);
    
    for (const text of candidates) {
      if (text && isTextSuitableForRecording(text)) {
        console.log(`📖 Using story text for ${emotionName}: "${text.substring(0, 50)}..."`);
        return text;
      }
    }
    
    // Last resort: return best available text even if short
    const fallbackText = storyQuote || storyContext || `Express the emotion of ${emotionName}`;
    console.warn(`⚠️ Using short text for ${emotionName}: "${fallbackText}"`);
    return fallbackText;
  };

  // Generate story-specific templates from analysis  
  const generateStoryTemplates = (): VoiceTemplate[] => {
    const templates: VoiceTemplate[] = [];

    // Add emotions from story analysis
    if (analysisData.emotions) {
      analysisData.emotions.forEach((emotion) => {
        const recordedSample = findRecordedSample(emotion.emotion, 'emotions');
        const isRecorded = !!recordedSample;
        const isLocked = recordedSample?.isLocked || false;

        // Apply intelligent text selection with ESM professional texts priority
        const sampleText = getOptimalSampleText(
          emotion.emotion,
          "emotions",
          emotion.quote,
          emotion.context || ""
        );

        templates.push({
          emotion: emotion.emotion.toLowerCase(),
          displayName: emotion.emotion.charAt(0).toUpperCase() + emotion.emotion.slice(1),
          sampleText,
          category: "emotions",
          intensity: emotion.intensity,
          description: emotion.context || '',
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
        const recordedSample = findRecordedSample(sound.sound, 'sounds');
        const isRecorded = !!recordedSample;
        const isLocked = recordedSample?.isLocked || false;

        // Apply intelligent text selection with ESM professional texts priority
        const sampleText = getOptimalSampleText(
          sound.sound,
          "sounds",
          sound.quote,
          sound.context || ""
        );

        templates.push({
          emotion: sound.sound.toLowerCase(),
          displayName: sound.sound.charAt(0).toUpperCase() + sound.sound.slice(1),
          sampleText,
          category: "sounds",
          intensity: sound.intensity,
          description: sound.context || '',
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
      const recordedSample = findRecordedSample(modulation, 'modulations');
      const isRecorded = !!recordedSample;
      const isLocked = recordedSample?.isLocked || false;

      // Apply intelligent text selection with ESM professional texts priority
      const sampleText = getOptimalSampleText(
        modulation,
        "modulations",
        "",
        ""
      );

      templates.push({
        emotion: modulation.toLowerCase(),
        displayName: modulation.charAt(0).toUpperCase() + modulation.slice(1),
        sampleText,
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
      
      // Create modulationKey using the same helper function as display logic
      const modulationKey = generateEmotionKey(emotion, selectedCategory);
      formData.append('modulationKey', modulationKey);
      formData.append('modulationType', selectedCategory);

      return apiRequest('/api/voice-modulations/record', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/voice-modulations/progress"] });
      const successMsg = VoiceMessageService.voiceSaved(user?.email || 'User', variables.emotion, selectedCategory);
      toast({
        title: "Voice sample recorded",
        description: successMsg.message,
      });
    },
    onError: (error: any, variables) => {
      const errorMsg = VoiceMessageService.voiceSaveFailed(variables.emotion, selectedCategory);
      toast({
        title: "Recording failed",
        description: error.message || errorMsg.message,
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