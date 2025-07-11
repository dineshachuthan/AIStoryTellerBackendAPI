import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import { apiRequest, queryClient } from "@/lib/queryClient";
// EmotionVoiceRecorder has been deprecated and replaced with enhanced voice sample system
import { CharacterAvatar } from "./CharacterAvatar";
import { EmotionBadge } from "./EmotionBadge";
import StoryVoiceSamples from "./story-voice-samples";
import { Clock, BookOpen, Users, Tag, Mic, Loader2, FlaskConical } from "lucide-react";

interface StoryAnalysisData {
  characters: Array<{
    name: string;
    description: string;
    personality: string;
    role: 'protagonist' | 'antagonist' | 'supporting' | 'narrator' | 'other';
    appearance?: string;
    traits: string[];
    assignedVoice?: string;
    voiceSampleId?: number;
  }>;
  emotions: Array<{
    emotion: string;
    intensity: number;
    context: string;
    quote?: string;
  }>;
  summary: string;
  category: string;
  genre: string;
  themes: string[];
  suggestedTags: string[];
  emotionalTags: string[];
  readingTime: number;
  ageRating: 'general' | 'teen' | 'mature';
}

interface StoryAnalysisPanelProps {
  analysis: StoryAnalysisData | null | undefined;
  storyId?: number;
  userVoiceEmotions?: Record<string, boolean>;
  onEmotionRecorded?: (emotion: string, audioBlob: Blob) => void;
  onPlayEmotionSample?: (emotion: string, intensity: number) => void;
  onPlayUserRecording?: (emotion: string) => void;
  isPlayingSample?: string;
  isPlayingUserRecording?: string;
  className?: string;
}

export function StoryAnalysisPanel({
  analysis,
  storyId = 0,
  userVoiceEmotions = {},
  onEmotionRecorded,
  onPlayEmotionSample,
  onPlayUserRecording,
  isPlayingSample,
  isPlayingUserRecording,
  className
}: StoryAnalysisPanelProps) {
  const [statusMessage, setStatusMessage] = useState<{text: string, type: 'success' | 'error' | 'info'} | null>(null);

  // Query to get all user voice samples across all stories
  const { data: allVoiceSamples } = useQuery({
    queryKey: ['/api/user/esm-recordings'],
    enabled: !!storyId,
  });

  // Query to check if narrator voice exists
  const { data: narratorVoiceData, isLoading: narratorVoiceLoading, error: narratorVoiceError } = useQuery({
    queryKey: ['/api/user/narrator-voice'],
    enabled: true, // Always enabled for debugging
    onError: (error) => {
      console.error('Narrator voice query error:', error);
    },
    onSuccess: (data) => {
      console.log('Narrator voice query success:', data);
    }
  });

  // Calculate total recordings count across all stories
  const totalRecordings = allVoiceSamples ? (Array.isArray(allVoiceSamples) ? allVoiceSamples.length : 0) : 0;
  
  // Check if narrator voice exists
  const hasNarratorVoice = narratorVoiceData && narratorVoiceData.narratorVoiceId;
  
  // Debug logging
  console.log('Narrator voice data:', narratorVoiceData);
  console.log('Narrator voice loading:', narratorVoiceLoading);
  console.log('Narrator voice error:', narratorVoiceError);
  console.log('Has narrator voice:', hasNarratorVoice);
  console.log('Total recordings:', totalRecordings);
  
  // Enable button when we have at least 5 recordings for voice cloning
  const canGenerateNarratorVoice = totalRecordings >= 5;

  // Voice cloning mutation
  const voiceCloningMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/voice-cloning/emotions/${storyId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
    },
    onSuccess: async (data) => {
      setStatusMessage({ text: "Voice generation completed! Clearing old narrations...", type: 'success' });
      
      // Wait a bit for backend to complete the narration deletion
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Force refetch of all story-related queries to ensure cache is cleared
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [`/api/stories/${storyId}/narration/saved`] }),
        queryClient.invalidateQueries({ queryKey: [`/api/stories/${storyId}`] }),
        queryClient.invalidateQueries({ queryKey: [`/api/stories`] }),
        queryClient.invalidateQueries({ queryKey: [`/api/narrator/status`] })
      ]);
      
      // Force immediate refetch with exact=true to prevent partial matches
      await queryClient.refetchQueries({ 
        queryKey: [`/api/stories/${storyId}/narration/saved`],
        exact: true 
      });
      
      setStatusMessage({ text: "New narrator voice ready! You can now generate a fresh narration.", type: 'success' });
      
      // Clear message after 5 seconds
      setTimeout(() => setStatusMessage(null), 5000);
    },
    onError: (error: any) => {
      setStatusMessage({ text: error.message || "Voice generation failed", type: 'error' });
      // Clear message after 5 seconds
      setTimeout(() => setStatusMessage(null), 5000);
    }
  });
  


  // Handle case where analysis is null or undefined
  if (!analysis) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              Loading story analysis...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleEmotionRecording = async (emotion: string, audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, `${emotion}-recording.webm`);
      formData.append('emotion', emotion);
      formData.append('intensity', '5'); // Default intensity

      const response = await fetch('/api/user-voice-emotions', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (response.ok) {
        setStatusMessage({ text: `Voice saved for ${emotion}`, type: 'success' });
        setTimeout(() => setStatusMessage(null), 2000);
        onEmotionRecorded?.(emotion, audioBlob);
      } else {
        throw new Error('Failed to save recording');
      }
    } catch (error) {
      console.error('Error saving emotion recording:', error);
      setStatusMessage({ text: "Failed to save recording", type: 'error' });
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const handlePlaySample = (emotion: string, intensity: number) => {
    onPlayEmotionSample?.(emotion, intensity);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Status Message Display */}
      {statusMessage && (
        <div className={`p-3 rounded-md text-sm ${
          statusMessage.type === 'success' ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
          statusMessage.type === 'error' ? 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
          'bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
        }`}>
          {statusMessage.text}
        </div>
      )}
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Story Analysis
            </CardTitle>
            {storyId > 0 && (
              <Button
                onClick={() => voiceCloningMutation.mutate()}
                disabled={!canGenerateNarratorVoice || voiceCloningMutation.isPending}
                size="sm"
                className="flex items-center gap-2"
                title={
                  !canGenerateNarratorVoice 
                    ? totalRecordings === 0
                      ? "Record at least 5 voice samples to create your narrator voice"
                      : `Record more samples (${totalRecordings}/5 minimum needed) to create your narrator voice`
                    : hasNarratorVoice
                      ? totalRecordings > 9 
                        ? "Update your narrator voice with your latest recordings"
                        : "Update your narrator voice (you have enough samples to improve quality)"
                      : totalRecordings > 9 
                        ? "Create your personal narrator voice using your recorded samples"
                        : "Create your personal narrator voice (you have enough samples to get started)"
                }
              >
                {voiceCloningMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
                {voiceCloningMutation.isPending 
                  ? "Creating Voice..." 
                  : hasNarratorVoice
                    ? totalRecordings > 9 
                      ? "Regenerate Narrator Voice" 
                      : `Regenerate Narrator Voice (${totalRecordings} samples)`
                    : totalRecordings > 9 
                      ? "Generate Narrator Voice" 
                      : `Generate Narrator Voice (${totalRecordings} samples)`
                }
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Genre: {analysis.genre}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{analysis.readingTime} min read</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{(analysis.characters || []).length} characters</span>
            </div>
          </div>
          
          <p className="text-muted-foreground mb-4">{analysis.summary}</p>
          
          <div className="space-y-2">
            <h4 className="font-medium">Themes</h4>
            <div className="flex flex-wrap gap-2">
              {(analysis.themes || []).map((theme) => (
                <Badge key={theme} variant="outline">
                  {theme}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="emotions" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="emotions">Voice Emotions</TabsTrigger>
          <TabsTrigger value="characters">Characters</TabsTrigger>
          <TabsTrigger value="tags">Tags & Metadata</TabsTrigger>
        </TabsList>

        <TabsContent value="emotions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Record Your Voice for Each Emotion</CardTitle>
              <p className="text-sm text-muted-foreground">
                Record your voice for each detected emotion to personalize the story narration. 
                These recordings will be saved to your voice repository for use across all stories.
              </p>
            </CardHeader>
            <CardContent>
              <StoryVoiceSamples
                storyId={storyId}
                analysisData={analysis}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="characters" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Story Characters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {(analysis.characters || []).map((character, index) => (
                  <div key={index} className="space-y-3">
                    <CharacterAvatar
                      character={character}
                      size="lg"
                      showRole
                      showVoice
                    />
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {character.description}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {(character.traits || []).slice(0, 3).map((trait) => (
                          <Badge key={trait} variant="outline" className="text-xs">
                            {trait}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {(!analysis.characters || analysis.characters.length === 0) && (
                <p className="text-center text-muted-foreground py-8">
                  No characters detected in this story.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tags" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tags & Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-medium mb-3">Suggested Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {(analysis.suggestedTags || []).map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-3">Emotional Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {(analysis.emotionalTags || []).map((tag) => (
                    <EmotionBadge key={tag} emotion={tag} size="sm" />
                  ))}
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-medium">Category:</span>
                  <Badge variant="outline" className="ml-2">
                    {analysis.category}
                  </Badge>
                </div>
                <div>
                  <span className="font-medium">Age Rating:</span>
                  <Badge variant="outline" className="ml-2">
                    {analysis.ageRating}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}