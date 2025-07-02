import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { VoiceSampleCard } from "@/components/ui/voice-sample-card";
import { VoiceCloneButton } from "@/components/ui/voice-clone-button";
import { Zap, AlertCircle, Info } from "lucide-react";

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
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState("emotions");

  // Fetch voice cloning status for this story
  const { data: voiceRequirements } = useQuery({
    queryKey: [`/api/stories/${storyId}/voice-requirements`],
    enabled: !!user?.id && !!storyId,
  });

  const { data: voiceCloneStatus } = useQuery({
    queryKey: [`/api/voice-cloning/status`],
    enabled: !!user?.id,
  });

  const getCloneStatus = (voiceName: string, voiceType: string) => {
    // Check if this voice is already cloned
    const requirements = Array.isArray(voiceRequirements) ? voiceRequirements : [];
    const requirement = requirements.find((req: any) => 
      req.voiceName === voiceName && req.voiceType === voiceType
    );
    return requirement?.cloneStatus || 'not_cloned';
  };

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
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Manual Voice Cloning</h2>
        <p className="text-muted-foreground">
          Create personalized voices for this story by recording voice samples and manually triggering cloning
        </p>
      </div>

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
                  
                  {/* Manual Clone Button */}
                  <VoiceCloneButton
                    storyId={storyId}
                    voiceName={emotion.emotion}
                    voiceType="emotion"
                    intensity={emotion.intensity}
                    context={emotion.context}
                    quote={emotion.quote}
                    hasRecording={hasRecording(emotion.emotion)}
                    cloneStatus={getCloneStatus(emotion.emotion, 'emotion')}
                    variant="default"
                    className="w-full"
                  />
                  
                  {!hasRecording(emotion.emotion) && (
                    <p className="text-xs text-orange-600">
                      Go to global Voice Samples to record this emotion first
                    </p>
                  )}
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
                  
                  {/* Manual Clone Button */}
                  <VoiceCloneButton
                    storyId={storyId}
                    voiceName={sound.sound}
                    voiceType="sound"
                    intensity={sound.intensity}
                    context={sound.context}
                    quote={sound.quote}
                    hasRecording={hasRecording(sound.sound)}
                    cloneStatus={getCloneStatus(sound.sound, 'sound')}
                    variant="default"
                    className="w-full"
                  />
                  
                  {!hasRecording(sound.sound) && (
                    <p className="text-xs text-orange-600">
                      Go to global Voice Samples to record this sound first
                    </p>
                  )}
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
                  
                  {/* Manual Clone Button */}
                  <VoiceCloneButton
                    storyId={storyId}
                    voiceName={modulation.name!}
                    voiceType="modulation"
                    intensity={5}
                    context={`${modulation.type} modulation`}
                    hasRecording={hasRecording(modulation.name!)}
                    cloneStatus={getCloneStatus(modulation.name!, 'modulation')}
                    variant="default"
                    className="w-full"
                  />
                  
                  {!hasRecording(modulation.name!) && (
                    <p className="text-xs text-orange-600">
                      Go to global Voice Samples to record this modulation first
                    </p>
                  )}
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

      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">How Voice Cloning Works</h4>
              <p className="text-sm text-blue-700 dark:text-blue-200">
                1. Record a voice sample for each emotion/sound you want to clone<br/>
                2. Click the "Clone Voice" button to manually start the cloning process<br/>
                3. Wait for the training to complete (usually 2-5 minutes)<br/>
                4. Your personalized voice will be ready for story narration
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}