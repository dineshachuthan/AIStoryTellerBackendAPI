import React, { useState, useEffect } from "react";
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

// Helper function to get audio duration from blob
const getAudioDuration = (audioBlob: Blob): Promise<number> => {
  return new Promise((resolve) => {
    const audio = new Audio();
    const url = URL.createObjectURL(audioBlob);
    
    audio.addEventListener('loadedmetadata', () => {
      resolve(audio.duration);
      URL.revokeObjectURL(url);
    });
    
    audio.addEventListener('error', () => {
      resolve(0); // Return 0 on error
      URL.revokeObjectURL(url);
    });
    
    audio.src = url;
  });
};

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
    
    return organized;
  }, [esmTemplates]);

  // Abstract function for cards to get sample voice text - single point of truth
  const getSampleVoiceText = (itemName: string, categoryName: string, storyQuote?: string, storyContext?: string): string => {
    // First priority: Check ESM reference data for professional sample text
    const categoryData = (esmData as any)?.[categoryName] || [];
    const esmItem = categoryData.find((item: any) => 
      item.emotion?.toLowerCase() === itemName.toLowerCase() || 
      item.sound?.toLowerCase() === itemName.toLowerCase() ||
      item.name?.toLowerCase() === itemName.toLowerCase()
    );
    
    if (esmItem?.sampleText && isTextSuitableForRecording(esmItem.sampleText)) {
      return esmItem.sampleText;
    }
    
    // Second priority: Story quote if suitable length
    if (storyQuote && isTextSuitableForRecording(storyQuote)) {
      return storyQuote;
    }
    
    // Third priority: Story context if suitable length
    if (storyContext && isTextSuitableForRecording(storyContext)) {
      return storyContext;
    }
    
    // Fallback: Return best available text even if short
    const fallbackText = esmItem?.sampleText || storyQuote || storyContext || `Express the ${categoryName.slice(0, -1)} of ${itemName}`;
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

  // Generate comprehensive templates from ALL sources (story analysis + user recordings + ESM reference)
  const generateStoryTemplates = (): VoiceTemplate[] => {
    const templates: VoiceTemplate[] = [];
    const processedEmotions = new Set<string>();

    // PRIORITY 1: Add emotions from story analysis (if available)
    if (analysisData.emotions) {
      analysisData.emotions.forEach((emotion) => {
        const emotionKey = emotion.emotion.toLowerCase();
        processedEmotions.add(emotionKey);
        
        const recordedSample = findRecordedSample(emotion.emotion, 'emotions');
        const isRecorded = !!recordedSample;
        const isLocked = recordedSample?.isLocked || false;

        // Call abstract function for sample text - single point of truth
        const sampleText = getSampleVoiceText(
          emotion.emotion,
          "emotions",
          emotion.quote,
          emotion.context || ""
        );

        templates.push({
          emotion: emotionKey,
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

    // PRIORITY 2: Add ANY user recordings that weren't in story analysis
    recordedSamples.forEach((recording: any) => {
      if (recording.emotion?.startsWith('emotions-')) {
        const emotionName = recording.emotion.replace('emotions-', '');
        const emotionKey = emotionName.toLowerCase();
        
        if (!processedEmotions.has(emotionKey)) {
          processedEmotions.add(emotionKey);
          
          const sampleText = getSampleVoiceText(emotionName, "emotions", "", "");
          
          templates.push({
            emotion: emotionKey,
            displayName: emotionName.charAt(0).toUpperCase() + emotionName.slice(1),
            sampleText,
            category: "emotions",
            intensity: 5, // Default intensity
            description: `User recorded emotion: ${emotionName}`,
            recordedSample: recording,
            isRecorded: true,
            isLocked: recording.isLocked || false,
            sortOrder: recording.isLocked ? 3 : 2
          });
        }
      }
    });

    // PRIORITY 3: Add ESM reference emotions that have NO recordings (show available options)
    const emotionsFromESM = esmData?.emotions || [];
    emotionsFromESM.forEach((esmEmotion: any) => {
      const emotionKey = esmEmotion.emotion?.toLowerCase() || esmEmotion.name?.toLowerCase();
      
      if (emotionKey && !processedEmotions.has(emotionKey)) {
        processedEmotions.add(emotionKey);
        
        templates.push({
          emotion: emotionKey,
          displayName: esmEmotion.displayName || (emotionKey.charAt(0).toUpperCase() + emotionKey.slice(1)),
          sampleText: esmEmotion.sampleText || `Express the emotion of ${emotionKey}`,
          category: "emotions",
          intensity: 5, // Default intensity
          description: `Available emotion from reference data`,
          recordedSample: null,
          isRecorded: false,
          isLocked: false,
          sortOrder: 1
        });
      }
    });

    // PRIORITY 1: Add sounds from story analysis (if available)
    const processedSounds = new Set<string>();
    if (analysisData.soundEffects) {
      analysisData.soundEffects.forEach((sound) => {
        const soundKey = sound.sound.toLowerCase();
        processedSounds.add(soundKey);
        
        const recordedSample = findRecordedSample(sound.sound, 'sounds');
        const isRecorded = !!recordedSample;
        const isLocked = recordedSample?.isLocked || false;

        // Call abstract function for sample text - single point of truth
        const sampleText = getSampleVoiceText(
          sound.sound,
          "sounds",
          sound.quote,
          sound.context || ""
        );

        templates.push({
          emotion: soundKey,
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

    // PRIORITY 2: Add ANY user sound recordings that weren't in story analysis
    recordedSamples.forEach((recording: any) => {
      if (recording.emotion?.startsWith('sounds-')) {
        const soundName = recording.emotion.replace('sounds-', '');
        const soundKey = soundName.toLowerCase();
        
        if (!processedSounds.has(soundKey)) {
          processedSounds.add(soundKey);
          
          const sampleText = getSampleVoiceText(soundName, "sounds", "", "");
          
          templates.push({
            emotion: soundKey,
            displayName: soundName.charAt(0).toUpperCase() + soundName.slice(1),
            sampleText,
            category: "sounds",
            intensity: 5, // Default intensity
            description: `User recorded sound: ${soundName}`,
            recordedSample: recording,
            isRecorded: true,
            isLocked: recording.isLocked || false,
            sortOrder: recording.isLocked ? 3 : 2
          });
        }
      }
    });

    // PRIORITY 3: Add ESM reference sounds that have NO recordings (show available options)
    const soundsFromESM = esmData?.sounds || [];
    soundsFromESM.forEach((esmSound: any) => {
      const soundKey = esmSound.sound?.toLowerCase() || esmSound.name?.toLowerCase();
      
      if (soundKey && !processedSounds.has(soundKey)) {
        processedSounds.add(soundKey);
        
        templates.push({
          emotion: soundKey,
          displayName: esmSound.displayName || (soundKey.charAt(0).toUpperCase() + soundKey.slice(1)),
          sampleText: esmSound.sampleText || `Create the sound of ${soundKey}`,
          category: "sounds",
          intensity: 5, // Default intensity
          description: `Available sound from reference data`,
          recordedSample: null,
          isRecorded: false,
          isLocked: false,
          sortOrder: 1
        });
      }
    });

    // PRIORITY 1: Add modulations from story analysis (if available)
    const processedModulations = new Set<string>();
    const modulations: string[] = [];
    if (analysisData.moodCategory) modulations.push(analysisData.moodCategory);
    if (analysisData.genre) modulations.push(analysisData.genre);
    if (analysisData.subGenre) modulations.push(analysisData.subGenre);
    if (analysisData.emotionalTags) modulations.push(...analysisData.emotionalTags);

    modulations.forEach((modulation) => {
      const modulationKey = modulation.toLowerCase();
      processedModulations.add(modulationKey);
      
      const recordedSample = findRecordedSample(modulation, 'modulations');
      const isRecorded = !!recordedSample;
      const isLocked = recordedSample?.isLocked || false;

      // Call abstract function for sample text - single point of truth
      const sampleText = getSampleVoiceText(
        modulation,
        "modulations",
        "",
        ""
      );

      templates.push({
        emotion: modulationKey,
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

    // PRIORITY 2: Add ANY user modulation recordings that weren't in story analysis
    recordedSamples.forEach((recording: any) => {
      if (recording.emotion?.startsWith('modulations-')) {
        const modulationName = recording.emotion.replace('modulations-', '');
        const modulationKey = modulationName.toLowerCase();
        
        if (!processedModulations.has(modulationKey)) {
          processedModulations.add(modulationKey);
          
          const sampleText = getSampleVoiceText(modulationName, "modulations", "", "");
          
          templates.push({
            emotion: modulationKey,
            displayName: modulationName.charAt(0).toUpperCase() + modulationName.slice(1),
            sampleText,
            category: "modulations",
            intensity: 5, // Default intensity
            description: `User recorded modulation: ${modulationName}`,
            recordedSample: recording,
            isRecorded: true,
            isLocked: recording.isLocked || false,
            sortOrder: recording.isLocked ? 3 : 2
          });
        }
      }
    });

    // PRIORITY 3: Add ESM reference modulations that have NO recordings (show available options)
    const modulationsFromESM = esmData?.modulations || [];
    modulationsFromESM.forEach((esmModulation: any) => {
      const modulationKey = esmModulation.emotion?.toLowerCase() || esmModulation.name?.toLowerCase();
      
      if (modulationKey && !processedModulations.has(modulationKey)) {
        processedModulations.add(modulationKey);
        
        templates.push({
          emotion: modulationKey,
          displayName: esmModulation.displayName || (modulationKey.charAt(0).toUpperCase() + modulationKey.slice(1)),
          sampleText: esmModulation.sampleText || `Express the modulation of ${modulationKey}`,
          category: "modulations",
          intensity: 5, // Default intensity
          description: `Available modulation from reference data`,
          recordedSample: null,
          isRecorded: false,
          isLocked: false,
          sortOrder: 1
        });
      }
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

  // Voice recording mutation with frontend validation
  const recordVoiceMutation = useMutation({
    mutationFn: async ({ emotion, audioBlob }: { emotion: string; audioBlob: Blob }) => {
      // Frontend validation: Check if audio is long enough
      const audioDuration = await getAudioDuration(audioBlob);
      if (audioDuration < 5) {
        throw new Error(`Recording too short: ${audioDuration.toFixed(1)}s. Need at least 5 seconds for voice cloning.`);
      }
      
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
      // Don't show permanent toast for validation errors - they're handled in UI
      if (error.message?.includes('Recording too short')) {
        // Frontend validation error - no toast needed as UI shows the message
        console.log('Frontend validation prevented short recording submission');
        return;
      }
      
      // Only show toast for unexpected backend errors
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