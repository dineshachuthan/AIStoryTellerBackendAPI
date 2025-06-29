import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { EmotionVoiceRecorder } from "@/components/ui/emotion-voice-recorder";
import { BottomNavigation } from "@/components/bottom-navigation";

interface EmotionPrompt {
  id: number;
  emotion: string;
  promptText: string;
  displayName?: string;
  description?: string;
  category: string;
  isActive: boolean;
}

interface UserVoiceEmotion {
  id: number;
  emotion: string;
  audioUrl: string;
  duration?: number;
  createdAt: string;
}

export default function VoiceSetup() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch emotion prompts from database
  const { data: emotionPrompts, isLoading: promptsLoading } = useQuery({
    queryKey: ['/api/emotion-prompts'],
    select: (data: EmotionPrompt[]) => data?.filter(prompt => prompt.isActive) || []
  });

  // Fetch user's existing voice recordings
  const { data: userVoiceEmotions, isLoading: voicesLoading } = useQuery({
    queryKey: ['/api/users/voice-emotions']
  });

  const refetchData = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/users/voice-emotions'] });
  };

  if (promptsLoading || voicesLoading) {
    return (
      <div className="min-h-screen bg-dark-bg text-dark-text p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">Loading voice setup...</div>
        </div>
      </div>
    );
  }

  const emotions = emotionPrompts || [];
  const recordings = userVoiceEmotions || [];
  
  // Create map of recordings by emotion
  const recordingMap: Record<string, UserVoiceEmotion> = {};
  if (Array.isArray(recordings)) {
    recordings.forEach((recording: UserVoiceEmotion) => {
      recordingMap[recording.emotion] = recording;
    });
  }

  const completedCount = Object.keys(recordingMap).length;
  const totalCount = emotions.length;
  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="min-h-screen bg-dark-bg text-dark-text p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="bg-dark-card border-gray-800">
          <CardHeader>
            <CardTitle className="text-dark-text">Voice Emotion Setup</CardTitle>
            <CardDescription className="text-gray-text">
              Record voice samples for different emotions to create personalized story narrations.
              Hold the record button and read the provided text with the specified emotion.
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Progress Card */}
        <Card className="bg-dark-card border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-dark-text">Recording Progress</h3>
              <span className="text-sm text-gray-text">
                {completedCount}/{totalCount} emotions recorded
              </span>
            </div>
            <Progress value={progressPercentage} className="w-full" />
            <p className="text-sm text-gray-text mt-2">
              {progressPercentage < 100 
                ? `${Math.round(100 - progressPercentage)}% remaining to complete your emotion voice library`
                : "Emotion voice library complete! You can now create stories with expressive narration."
              }
            </p>
          </CardContent>
        </Card>

        {/* Emotion Recording Cards - Using existing EmotionVoiceRecorder component */}
        <div className="space-y-4">
          {emotions.map((emotion) => {
            const existingRecording = recordingMap[emotion.emotion];
            
            return (
              <EmotionVoiceRecorder
                key={emotion.id}
                emotion={emotion.emotion}
                intensity={5}
                existingRecording={existingRecording ? {
                  id: existingRecording.id,
                  emotion: existingRecording.emotion,
                  intensity: 5,
                  audioUrl: existingRecording.audioUrl,
                  createdAt: new Date(existingRecording.createdAt)
                } : undefined}
                onSave={(recording) => {
                  toast({
                    title: 'Recording Saved',
                    description: `Your ${emotion.emotion} voice sample has been saved successfully.`
                  });
                  refetchData();
                }}
                className="w-full"
              />
            );
          })}
        </div>

        {emotions.length === 0 && (
          <Card className="bg-dark-card border-gray-800 text-center p-8">
            <p className="text-gray-text">No emotion prompts available. Initializing default emotions...</p>
          </Card>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
}