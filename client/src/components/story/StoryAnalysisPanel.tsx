import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
// EmotionVoiceRecorder has been deprecated and replaced with enhanced voice sample system
import { CharacterAvatar } from "./CharacterAvatar";
import { EmotionBadge } from "./EmotionBadge";
import StoryVoiceSamples from "./story-voice-samples";
import { Clock, BookOpen, Users, Tag, Mic, Loader2 } from "lucide-react";

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
  const { toast } = useToast();

  // Query to get voice samples count
  const { data: voiceSamplesData } = useQuery({
    queryKey: ['/api/stories', storyId, 'voice-samples'],
    enabled: !!storyId,
  });

  // Calculate total recordings count
  const totalRecordings = voiceSamplesData ? 
    ((voiceSamplesData as any).emotions?.filter((e: any) => e.isRecorded).length || 0) +
    ((voiceSamplesData as any).sounds?.filter((s: any) => s.isRecorded).length || 0) +
    ((voiceSamplesData as any).modulations?.filter((m: any) => m.isRecorded).length || 0) : 0;

  // Debug logging
  console.log('Voice samples data:', voiceSamplesData);
  console.log('Total recordings calculated:', totalRecordings);

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
    onSuccess: (data) => {
      toast({
        title: "Voice Cloning Started",
        description: `Successfully started creating your narrator voice with ${totalRecordings} samples.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Voice Cloning Failed",
        description: error.message || "Failed to start voice cloning process",
        variant: "destructive",
      });
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
        toast({
          title: "Voice Recorded",
          description: `Your ${emotion} voice has been saved to your emotion repository.`,
        });
        onEmotionRecorded?.(emotion, audioBlob);
      } else {
        throw new Error('Failed to save recording');
      }
    } catch (error) {
      console.error('Error saving emotion recording:', error);
      toast({
        title: "Recording Error",
        description: "Failed to save your voice recording.",
        variant: "destructive",
      });
    }
  };

  const handlePlaySample = (emotion: string, intensity: number) => {
    onPlayEmotionSample?.(emotion, intensity);
  };

  return (
    <div className={`space-y-6 ${className}`}>
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
                disabled={totalRecordings < 6 || voiceCloningMutation.isPending}
                size="sm"
                className="flex items-center gap-2"
              >
                {voiceCloningMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
                {voiceCloningMutation.isPending 
                  ? "Creating Voice..." 
                  : `Generate Narrator Voice (${totalRecordings}/6)`
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