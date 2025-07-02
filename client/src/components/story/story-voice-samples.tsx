import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { VoiceSampleCard } from "@/components/ui/voice-sample-card";
import { AlertCircle } from "lucide-react";

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
  storyAnalysis: StoryAnalysis;
  userVoiceEmotions: Record<string, boolean>;
  onEmotionRecorded: (emotion: string, audioBlob: Blob) => void;
  onPlayEmotionSample: (emotion: string, intensity: number) => Promise<void>;
  onPlayUserRecording: (emotion: string) => Promise<void>;
  isPlayingSample: string;
  isPlayingUserRecording: string;
}

export default function StoryVoiceSamples({ 
  storyId, 
  storyAnalysis, 
  userVoiceEmotions,
  onEmotionRecorded,
  onPlayEmotionSample,
  onPlayUserRecording,
  isPlayingSample,
  isPlayingUserRecording 
}: StoryVoiceSamplesProps) {
  const [selectedTab, setSelectedTab] = useState("emotions");

  // Debug logging
  console.log('StoryVoiceSamples received storyAnalysis:', storyAnalysis);
  console.log('StoryAnalysis type:', typeof storyAnalysis);
  console.log('Has emotions:', !!storyAnalysis?.emotions);
  console.log('Emotions array:', storyAnalysis?.emotions);

  // Early return if no story analysis
  if (!storyAnalysis) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Loading story analysis...</p>
      </div>
    );
  }

  const hasRecording = (emotionName: string) => {
    return userVoiceEmotions[emotionName] || false;
  };

  return (
    <div className="space-y-6">

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="emotions">Emotions ({storyAnalysis.emotions?.length || 0})</TabsTrigger>
          <TabsTrigger value="sounds">Sounds ({storyAnalysis.soundEffects?.length || 0})</TabsTrigger>
          <TabsTrigger value="modulations">Modulations</TabsTrigger>
        </TabsList>

        <TabsContent value="emotions" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {storyAnalysis.emotions?.map((emotion, index) => (
              <Card key={index} className="relative">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {emotion.emotion}
                    <Badge variant="outline">{emotion.intensity}/10</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Recording Status */}
                  <div className="flex items-center gap-2">
                    {hasRecording(emotion.emotion) ? (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        ✓ Voice Sample Recorded
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                        ⏺ No Recording Yet
                      </Badge>
                    )}
                  </div>
                  
                  {/* Sample Text */}
                  {(emotion.quote || emotion.context) && (
                    <div className="bg-muted/50 p-3 rounded-md">
                      <p className="text-sm text-muted-foreground italic">
                        "{emotion.quote || emotion.context}"
                      </p>
                    </div>
                  )}
                  
                  <VoiceSampleCard
                    emotion={emotion.emotion}
                    intensity={emotion.intensity}
                    hasRecording={hasRecording(emotion.emotion)}
                    onRecord={(audioBlob) => onEmotionRecorded(emotion.emotion, audioBlob)}
                    onPlay={() => onPlayEmotionSample(emotion.emotion, emotion.intensity)}
                    onPlayUserRecording={() => onPlayUserRecording(emotion.emotion)}
                    isPlaying={isPlayingSample === `${emotion.emotion}-${emotion.intensity}`}
                    isPlayingUserRecording={isPlayingUserRecording === emotion.emotion}
                    sampleText={emotion.quote || emotion.context || `Express ${emotion.emotion} with intensity ${emotion.intensity}`}
                  />
                </CardContent>
              </Card>
            )) || (
              <div className="col-span-full text-center py-8">
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No emotions detected in this story</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="sounds" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {storyAnalysis.soundEffects?.map((sound, index) => (
              <Card key={index} className="relative">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {sound.sound}
                    <Badge variant="outline">{sound.intensity}/10</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Recording Status */}
                  <div className="flex items-center gap-2">
                    {hasRecording(sound.sound) ? (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        ✓ Voice Sample Recorded
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                        ⏺ No Recording Yet
                      </Badge>
                    )}
                  </div>
                  
                  {/* Sample Text */}
                  {(sound.quote || sound.context) && (
                    <div className="bg-muted/50 p-3 rounded-md">
                      <p className="text-sm text-muted-foreground italic">
                        "{sound.quote || sound.context}"
                      </p>
                    </div>
                  )}
                  
                  <VoiceSampleCard
                    emotion={sound.sound}
                    intensity={sound.intensity}
                    hasRecording={hasRecording(sound.sound)}
                    onRecord={(audioBlob) => onEmotionRecorded(sound.sound, audioBlob)}
                    onPlay={() => onPlayEmotionSample(sound.sound, sound.intensity)}
                    onPlayUserRecording={() => onPlayUserRecording(sound.sound)}
                    isPlaying={isPlayingSample === `${sound.sound}-${sound.intensity}`}
                    isPlayingUserRecording={isPlayingUserRecording === sound.sound}
                    sampleText={sound.quote || sound.context || `Create ${sound.sound} sound effect`}
                  />
                </CardContent>
              </Card>
            )) || (
              <div className="col-span-full text-center py-8">
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No sound effects detected in this story</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="modulations" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              { name: storyAnalysis.moodCategory, type: 'Mood' },
              { name: storyAnalysis.genre, type: 'Genre' },
              { name: storyAnalysis.subGenre, type: 'Sub-Genre' },
              ...(storyAnalysis.emotionalTags || []).map(tag => ({ name: tag, type: 'Emotional Tag' }))
            ].filter(item => item.name).map((modulation, index) => (
              <Card key={index} className="relative">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {modulation.name}
                    <Badge variant="secondary">{modulation.type}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Recording Status */}
                  <div className="flex items-center gap-2">
                    {hasRecording(modulation.name!) ? (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        ✓ Voice Sample Recorded
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                        ⏺ No Recording Yet
                      </Badge>
                    )}
                  </div>
                  
                  {/* Description */}
                  <div className="bg-muted/50 p-3 rounded-md">
                    <p className="text-sm text-muted-foreground">
                      Practice {modulation.name} {modulation.type.toLowerCase()} voice modulation
                    </p>
                  </div>
                  
                  <VoiceSampleCard
                    emotion={modulation.name!}
                    intensity={5}
                    hasRecording={hasRecording(modulation.name!)}
                    onRecord={(audioBlob) => onEmotionRecorded(modulation.name!, audioBlob)}
                    onPlay={() => onPlayEmotionSample(modulation.name!, 5)}
                    onPlayUserRecording={() => onPlayUserRecording(modulation.name!)}
                    isPlaying={isPlayingSample === `${modulation.name}-5`}
                    isPlayingUserRecording={isPlayingUserRecording === modulation.name}
                    sampleText={`Express ${modulation.type}: ${modulation.name}`}
                  />
                </CardContent>
              </Card>
            )) || (
              <div className="col-span-full text-center py-8">
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No mood or genre modulations available</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}