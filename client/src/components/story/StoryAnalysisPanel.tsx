import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { EmotionVoiceRecorder } from "./EmotionVoiceRecorder";
import { CharacterAvatar } from "./CharacterAvatar";
import { EmotionBadge } from "./EmotionBadge";
import { Clock, BookOpen, Users, Tag } from "lucide-react";

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
  userVoiceEmotions = {},
  onEmotionRecorded,
  onPlayEmotionSample,
  onPlayUserRecording,
  isPlayingSample,
  isPlayingUserRecording,
  className
}: StoryAnalysisPanelProps) {
  const { toast } = useToast();
  


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
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Story Analysis
          </CardTitle>
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
            <CardContent className="space-y-4">
              {(analysis.emotions || []).map((emotion, index) => (
                <EmotionVoiceRecorder
                  key={`${emotion.emotion}-${emotion.intensity}`}
                  emotion={emotion.emotion}
                  intensity={emotion.intensity}
                  hasUserRecording={userVoiceEmotions[emotion.emotion]}
                  isPlayingSample={isPlayingSample === emotion.emotion}
                  isPlayingUserRecording={isPlayingUserRecording === emotion.emotion}
                  onRecordingComplete={(audioBlob) => handleEmotionRecording(emotion.emotion, audioBlob)}
                  onPlaySample={() => handlePlaySample(emotion.emotion, emotion.intensity)}
                  onPlayUserRecording={() => onPlayUserRecording?.(emotion.emotion)}
                />
              ))}
              
              {(!analysis.emotions || analysis.emotions.length === 0) && (
                <p className="text-center text-muted-foreground py-8">
                  No emotions detected in this story.
                </p>
              )}
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