import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { EmotionVoiceRecorder } from "@/components/ui/emotion-voice-recorder";

// Simple predefined emotions - no database dependency
const PREDEFINED_EMOTIONS = [
  {
    emotion: 'happy',
    promptText: 'Say "I am so happy today!" with genuine joy and excitement',
    description: 'Express joy and excitement in your voice'
  },
  {
    emotion: 'sad',
    promptText: 'Say "I feel really sad about this" with a melancholic tone',
    description: 'Express sadness and melancholy in your voice'
  },
  {
    emotion: 'angry',
    promptText: 'Say "This makes me so angry!" with frustration and intensity',
    description: 'Express anger and frustration in your voice'
  },
  {
    emotion: 'calm',
    promptText: 'Say "I feel very calm and peaceful" with a serene, relaxed tone',
    description: 'Express calmness and tranquility in your voice'
  },
  {
    emotion: 'fearful',
    promptText: 'Say "I am really scared and nervous" with fear and trembling in your voice',
    description: 'Express fear and nervousness in your voice'
  }
];

export default function VoiceSetup() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user's existing voice recordings using the working endpoint
  const { data: userVoiceSamples, isLoading } = useQuery({
    queryKey: ['/api/users/voice-samples'],
    select: (data: any[]) => data?.filter(sample => sample.sampleType === 'emotion') || []
  });

  const refetchData = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/users/voice-samples'] });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-bg text-dark-text p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">Loading voice setup...</div>
        </div>
      </div>
    );
  }

  const recordings = userVoiceSamples || [];
  
  // Create map of recordings by emotion
  const recordingMap: Record<string, any> = {};
  recordings.forEach((recording: any) => {
    recordingMap[recording.label] = recording;
  });

  const completedCount = Object.keys(recordingMap).length;
  const totalCount = PREDEFINED_EMOTIONS.length;
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
          {PREDEFINED_EMOTIONS.map((emotion) => {
            const existingRecording = recordingMap[emotion.emotion];
            
            return (
              <EmotionVoiceRecorder
                key={emotion.emotion}
                emotion={emotion.emotion}
                intensity={5}
                existingRecording={existingRecording ? {
                  id: existingRecording.id,
                  emotion: existingRecording.label,
                  intensity: 5,
                  audioUrl: existingRecording.audioUrl,
                  createdAt: new Date(existingRecording.recordedAt)
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
      </div>
    </div>
  );
}