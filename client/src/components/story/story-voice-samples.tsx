import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast, toastMessages } from "@/lib/toast-utils";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
import { Mic, Volume2, Users, Zap, DollarSign, Clock, AlertCircle, Radio, Lock, CheckCircle, Unlock, Save, Play } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { EnhancedVoiceRecorder } from "@/components/ui/enhanced-voice-recorder";
import { AUDIO_PROCESSING_CONFIG } from '@shared/config/audio-config';
import { VoiceMessageService } from '@shared/config/i18n-config';
import { VOICE_RECORDING_CONFIG } from '@shared/config/voice-recording-config';

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
    sampleText?: string;
  }>;
  soundEffects?: Array<{
    sound: string;
    intensity: number;
    context: string;
    quote?: string;
    sampleText?: string;
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

// Helper function to check if an item has a recording
const hasRecording = (item: any): boolean => {
  return item?.userRecording?.audioUrl !== undefined && item?.userRecording?.audioUrl !== null;
};

// Helper function to check if text is suitable for voice recording (adequate length)
const isTextSuitableForRecording = (text: string): boolean => {
  if (!text) return false;
  const wordCount = text.trim().split(/\s+/).length;
  const charCount = text.trim().length;
  return wordCount >= 15 && charCount >= 80; // ~5-6 seconds of speech
};

export default function StoryVoiceSamples({ storyId, analysisData }: StoryVoiceSamplesProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string>("emotions");

  // Get story narrative data which contains emotions and sounds with ESM reference data
  const narrativeQuery = useQuery({
    queryKey: [`/api/stories/${storyId}/narrative`],
    queryFn: () => apiClient.stories.getNarrative(storyId),
    enabled: !!user?.id && !!storyId,
  });

  // Get user's voice recordings to check recording status
  const voiceRecordingsQuery = useQuery({
    queryKey: [`/api/user/esm-recordings`],
    queryFn: () => apiClient.voice.getRecordings(),
    enabled: !!user?.id,
  });

  // Transform narrative data for display with ESM reference data
  const narrativeData = narrativeQuery.data || {};
  const storyEmotions = narrativeData.emotions || [];
  const storySounds = narrativeData.soundEffects || [];
  const storyModulations = []; // Modulations not in narrative data
  
  // Debug logging
  console.log('StoryVoiceSamples - narrativeData:', narrativeData);
  console.log('StoryVoiceSamples - storyEmotions:', storyEmotions);
  console.log('StoryVoiceSamples - storySounds:', storySounds);

  // Track recording state per emotion for individual card feedback
  const [recordingStates, setRecordingStates] = useState<Record<string, {
    isRecorded: boolean;
    isSaving: boolean;
    errorMessage: string;
    duration?: number;
    audioBlob?: Blob;
    audioUrl?: string;
  }>>({});

  // Initialize recording states from narrative data and check existing recordings
  useEffect(() => {
    if (narrativeData && Object.keys(narrativeData).length > 0) {
      console.log('Initializing recording states from narrative data:', narrativeData);
      const newStates: Record<string, any> = {};
      const userRecordings = voiceRecordingsQuery.data?.recordings || voiceRecordingsQuery.data || [];
      
      // Helper function to check if recording exists for an emotion/sound
      const hasRecordingForItem = (itemName: string) => {
        return userRecordings.some((recording: any) => 
          recording.name === itemName
        );
      };
      
      // Helper function to get recording data for an emotion/sound
      const getRecordingForItem = (itemName: string) => {
        return userRecordings.find((recording: any) => 
          recording.name === itemName
        );
      };
      
      // Process emotions from narrative
      if (narrativeData.emotions && Array.isArray(narrativeData.emotions)) {
        narrativeData.emotions.forEach((emotion: any) => {
          const emotionName = emotion.emotion;
          console.log(`Processing emotion:`, emotionName);
          
          const hasRecording = hasRecordingForItem(emotionName);
          const recordingData = getRecordingForItem(emotionName);
          newStates[emotionName] = {
            isRecorded: hasRecording,
            isSaving: false,
            errorMessage: '',
            duration: recordingData?.duration || 0,
            audioUrl: recordingData?.audioUrl
          };
        });
      }
      
      // Process sounds from narrative
      if (narrativeData.soundEffects && Array.isArray(narrativeData.soundEffects)) {
        narrativeData.soundEffects.forEach((sound: any) => {
          const soundName = sound.sound;
          console.log(`Processing sound:`, soundName);
          
          const hasRecording = hasRecordingForItem(soundName);
          const recordingData = getRecordingForItem(soundName);
          newStates[soundName] = {
            isRecorded: hasRecording,
            isSaving: false,
            errorMessage: '',
            duration: recordingData?.duration || 0,
            audioUrl: recordingData?.audioUrl
          };
        });
      }
      
      console.log('Final recording states to set:', newStates);
      setRecordingStates(prev => ({ ...prev, ...newStates }));
    }
  }, [narrativeData, voiceRecordingsQuery.data]);

  // Mutation for recording voice samples
  const recordVoiceMutation = useMutation({
    mutationFn: async ({ emotion, audioBlob }: { emotion: string; audioBlob: Blob }) => {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice-sample.mp3');
      formData.append('emotion', emotion);
      formData.append('category', selectedCategory);

      return apiClient.voice.recordSample(formData);
    },
    onSuccess: (data, variables) => {
      // Update recording state for this emotion
      setRecordingStates(prev => ({
        ...prev,
        [variables.emotion]: {
          ...prev[variables.emotion],
          isRecorded: true,
          isSaving: false,
          errorMessage: ''
        }
      }));
      
      // Invalidate both queries to refresh data and trigger UI refresh
      queryClient.invalidateQueries({ queryKey: [`/api/stories/${storyId}/narrative`] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/esm-recordings'] });
    },
    onError: (error: any, variables) => {
      // Update error state for this specific emotion
      setRecordingStates(prev => ({
        ...prev,
        [variables.emotion]: {
          ...prev[variables.emotion],
          isSaving: false,
          errorMessage: error.message || 'Failed to save voice sample'
        }
      }));
    }
  });

  // Handle recording completion (just store the recording, don't save yet)
  const handleRecordingComplete = (emotion: string) => (audioBlob: Blob, audioUrl: string) => {
    console.log(`🎤 Recording complete for: ${emotion}`);
    getAudioDuration(audioBlob).then(duration => {
      console.log(`📏 Duration for ${emotion}: ${duration}s`);
      setRecordingStates(prev => {
        console.log(`📝 Updating state for ${emotion}`, {
          currentStates: Object.keys(prev),
          emotionState: prev[emotion]
        });
        return {
          ...prev,
          [emotion]: {
            ...prev[emotion],
            duration,
            audioBlob,
            audioUrl,
            errorMessage: '',
            isSaving: false,
            isRecorded: false
          }
        };
      });
    });
  };

  // Handle save button click with frontend validation
  const handleSaveRecording = async (emotion: string) => {
    const recordingState = recordingStates[emotion];
    if (!recordingState?.audioBlob) return;

    // Frontend validation: Check if audio is long enough
    const audioDuration = recordingState.duration || 0;
    if (audioDuration < 6) {
      setRecordingStates(prev => ({
        ...prev,
        [emotion]: {
          ...prev[emotion],
          errorMessage: `Recording too short: ${audioDuration.toFixed(1)}s. Need at least 6 seconds for voice cloning.`
        }
      }));
      return;
    }

    // Set saving state
    setRecordingStates(prev => ({
      ...prev,
      [emotion]: {
        ...prev[emotion],
        isSaving: true,
        errorMessage: ''
      }
    }));

    // Call API
    recordVoiceMutation.mutate({ emotion, audioBlob: recordingState.audioBlob });
  };

  // Generate categories with counts
  const categories = [
    { 
      id: "emotions", 
      name: "Emotions", 
      count: storyEmotions.length,
      icon: <Mic className="w-4 h-4" />
    },
    { 
      id: "sounds", 
      name: "Sounds", 
      count: storySounds.length,
      icon: <Volume2 className="w-4 h-4" />
    },
    { 
      id: "modulations", 
      name: "Modulations", 
      count: storyModulations.length,
      icon: <Zap className="w-4 h-4" />
    }
  ];

  // Get current category data without sorting to maintain consistent order
  const getCurrentCategoryData = () => {
    let data;
    switch (selectedCategory) {
      case "emotions": data = storyEmotions; break;
      case "sounds": data = storySounds; break;
      case "modulations": data = storyModulations; break;
      default: data = [];
    }
    
    // Return data in original order from API to prevent UI position shifts after recording
    return data;
  };

  const currentCategoryData = getCurrentCategoryData();

  if (narrativeQuery.isLoading) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">Loading narrative data...</p>
      </div>
    );
  }

  // Check if there's any data across all categories
  const hasAnyData = storyEmotions.length > 0 || storySounds.length > 0 || storyModulations.length > 0;
  
  if (!analysisData || !hasAnyData) {
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
          Record your voice for emotions and sounds found in this story
        </p>
        
        {/* Progress indicator */}
        {(() => {
          const totalItems = storyEmotions.length + storySounds.length + storyModulations.length;
          const recordedItems = Object.values(recordingStates).filter(state => state.isRecorded).length;
          const progressPercentage = totalItems > 0 ? (recordedItems / totalItems) * 100 : 0;
          
          return totalItems > 0 && (
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
              <span>Progress: {recordedItems}/{totalItems} recorded</span>
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300 ease-in-out"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
              <span>{Math.round(progressPercentage)}%</span>
            </div>
          );
        })()}
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

        {categories.map((category) => {
          // Get the data for this specific category
          const getCategoryData = () => {
            switch (category.id) {
              case "emotions": return storyEmotions;
              case "sounds": return storySounds;  
              case "modulations": return storyModulations;
              default: return [];
            }
          };
          
          const categoryData = getCategoryData();
          
          return (
            <TabsContent key={category.id} value={category.id} className="space-y-4">
              {categoryData.length === 0 ? (
                <div className="text-center p-8">
                  <p className="text-gray-500">
                    No {category.name.toLowerCase()} found in this story.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 grid-cols-1">
                  {categoryData.sort((a, b) => {
                  const aName = a.emotion || a.sound || a.name || 'unknown';
                  const bName = b.emotion || b.sound || b.name || 'unknown';
                  
                  const aState = recordingStates[aName];
                  const bState = recordingStates[bName];
                  
                  const aRecorded = aState?.isRecorded || false;
                  const bRecorded = bState?.isRecorded || false;
                  const aLocked = a.isLocked || false;
                  const bLocked = b.isLocked || false;
                  
                  // Determine sort priority: 0=unrecorded, 1=recorded+unlocked, 2=recorded+locked
                  const aPriority = !aRecorded ? 0 : (aLocked ? 2 : 1);
                  const bPriority = !bRecorded ? 0 : (bLocked ? 2 : 1);
                  
                  // Sort by priority, then by name alphabetically
                  if (aPriority !== bPriority) {
                    return aPriority - bPriority;
                  }
                  return aName.localeCompare(bName);
                }).map((item: any, index: number) => {
                  const emotionName = item.emotion || item.sound || item.name || 'unknown';
                  const intensity = item.intensity || 5;
                  const isLocked = item.isLocked || false;
                  const isRecorded = item.isRecorded || false;
                  // Use sampleText from ESM database first, fallback to quote then context
                  const sampleText = item.sampleText || item.quote || item.context || '';
                  
                  const recordingState = recordingStates[emotionName] || {
                    isRecorded: false,
                    isSaving: false,
                    errorMessage: '',
                    duration: 0
                  };

                  // Determine background color based on recording state only
                  const getCardClassName = () => {
                    if (recordingState.isRecorded) {
                      return "p-4 bg-green-50 dark:bg-green-950 border-green-200";
                    }
                    if (recordingState.isSaving) {
                      return "p-4 bg-blue-50 dark:bg-blue-950 border-blue-200";
                    }
                    return "p-4";
                  };

                  // Determine status icon based on recording state only
                  const getStatusIcon = () => {
                    if (recordingState.isRecorded) {
                      return <CheckCircle className="w-4 h-4 text-green-500" />;
                    }
                    if (recordingState.isSaving) {
                      return <Lock className="w-4 h-4 text-blue-500" />;
                    }
                    return <Unlock className="w-4 h-4 text-gray-400" />;
                  };
                  
                  return (
                    <Card key={`${category.id}-${index}`} className={`${getCardClassName()} min-h-[450px] w-full`}>
                      <div className="space-y-4 flex flex-col h-full p-6">
                        <div className="flex-grow">
                          <EnhancedVoiceRecorder
                            sampleText={sampleText}
                            emotionName={emotionName}
                            intensity={intensity}
                            isLocked={isLocked}
                            isRecorded={recordingState.isRecorded}
                            onRecordingComplete={handleRecordingComplete(emotionName)}
                            disabled={recordingState.isSaving}
                            simpleMode={true}
                            recordedSample={recordingState.audioUrl ? {
                              audioUrl: recordingState.audioUrl,
                              recordedAt: new Date(), // We don't have exact timestamp, using current
                              duration: recordingState.duration || 0
                            } : undefined}
                            saveConfig={{
                              endpoint: `/api/stories/${storyId}/voice-samples`,
                              payload: {
                                itemName: emotionName,
                                category: category.id === 'emotions' ? 1 : category.id === 'sounds' ? 2 : 3,
                                storyId: storyId,
                                intensity: intensity
                              },
                              minDuration: VOICE_RECORDING_CONFIG.MIN_DURATION,
                              onSaveSuccess: (data) => {
                                // Invalidate narrative query to refresh data without page reload
                                queryClient.invalidateQueries({ queryKey: [`/api/stories/${storyId}/narrative`] });
                                console.log('Voice sample saved successfully - invalidating cache');
                              },
                              onSaveError: (error) => {
                                console.error('Failed to save voice sample:', error);
                              }
                            }}
                          />
                        </div>
                      </div>
                    </Card>
                  );
                  })}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      <div className="text-center text-sm text-gray-500 mt-8">
        <p>Voice samples are stored globally and can be used across all your stories.</p>
        <p>Only emotions and sounds from this specific story are shown here.</p>
      </div>
    </div>
  );
}