import { useState, useEffect } from 'react';
import { useRoute } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, Pause, Volume2 } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { EnhancedVoiceRecorder } from '@/components/ui/enhanced-voice-recorder';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/hooks/use-toast';

interface NarrationInvitationData {
  id: string;
  storyId: number;
  title: string;
  content: string;
  invitedBy: string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'expired';
}

export default function NarrationInvitationLanding() {
  const [, params] = useRoute('/invitations/narration/:token');
  const token = params?.token;
  
  const [currentStage, setCurrentStage] = useState<'loading' | 'preview' | 'recording' | 'generating' | 'complete'>('loading');
  const [recordingStates, setRecordingStates] = useState<Record<string, any>>({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  // Fetch invitation data
  const { data: invitation, isLoading } = useQuery({
    queryKey: ['invitation', token],
    queryFn: async () => {
      if (!token) throw new Error('No token provided');
      return apiClient.invitations.get(token);
    },
    enabled: !!token,
  });

  // Fetch story narrative data
  const { data: narrative } = useQuery({
    queryKey: ['narrative', invitation?.storyId],
    queryFn: async () => {
      if (!invitation?.storyId) throw new Error('No story ID');
      return apiClient.stories.getNarrative(invitation.storyId);
    },
    enabled: !!invitation?.storyId,
  });

  // Generate narrator voice mutation
  const generateVoiceMutation = useMutation({
    mutationFn: async (voiceData: any) => {
      return apiClient.voice.createNarrator(voiceData);
    },
    onSuccess: () => {
      setCurrentStage('complete');
      toast({
        title: "Success",
        description: "Your narrator voice has been created successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create narrator voice. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Initialize recording states from narrative data
  useEffect(() => {
    if (narrative) {
      const states: Record<string, any> = {};
      
      // Initialize emotion states
      narrative.emotions?.forEach((emotion: any) => {
        states[emotion.emotion] = {
          isRecorded: false,
          isSaving: false,
          errorMessage: '',
          duration: 0,
        };
      });

      // Initialize sound states
      narrative.soundEffects?.forEach((sound: any) => {
        states[sound.sound] = {
          isRecorded: false,
          isSaving: false,
          errorMessage: '',
          duration: 0,
        };
      });

      setRecordingStates(states);
      setCurrentStage('preview');
    }
  }, [narrative]);

  // Handle voice recording completion
  const handleVoiceRecorded = (emotionName: string, audioBlob: Blob, duration: number) => {
    setRecordingStates(prev => ({
      ...prev,
      [emotionName]: {
        ...prev[emotionName],
        isRecorded: true,
        duration: duration,
        audioBlob: audioBlob,
      }
    }));
  };

  // Handle narrator voice generation
  const handleGenerateVoice = async () => {
    const recordings = Object.entries(recordingStates)
      .filter(([_, state]: [string, any]) => state.isRecorded && state.audioBlob)
      .map(([name, state]: [string, any]) => ({
        name,
        audioBlob: state.audioBlob,
        duration: state.duration,
      }));

    if (recordings.length < 5) {
      toast({
        title: "Not enough recordings",
        description: "Please record at least 5 emotions to generate your narrator voice.",
        variant: "destructive",
      });
      return;
    }

    setCurrentStage('generating');
    
    // Convert blobs to base64 for API
    const voiceData = await Promise.all(
      recordings.map(async (recording) => {
        const base64 = await blobToBase64(recording.audioBlob);
        return {
          name: recording.name,
          audioData: base64,
          duration: recording.duration,
        };
      })
    );

    generateVoiceMutation.mutate({
      recordings: voiceData,
      storyId: invitation?.storyId,
    });
  };

  // Play/pause story audio
  const handlePlayPause = () => {
    if (!audio) return;
    
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  };

  // Helper function to convert blob to base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Invitation Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-gray-600">
              This invitation link is invalid or has expired.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const completedRecordings = Object.values(recordingStates).filter((state: any) => state.isRecorded).length;
  const totalRecordings = Object.keys(recordingStates).length;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Narration Invitation
          </h1>
          <p className="text-gray-600">
            You've been invited to create a personalized narrator voice for "{invitation.title}"
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex justify-center space-x-8">
            <div className={`flex items-center space-x-2 ${currentStage === 'preview' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full ${currentStage === 'preview' ? 'bg-blue-600' : 'bg-gray-300'} flex items-center justify-center text-white font-bold`}>
                1
              </div>
              <span>Preview Story</span>
            </div>
            <div className={`flex items-center space-x-2 ${currentStage === 'recording' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full ${currentStage === 'recording' ? 'bg-blue-600' : 'bg-gray-300'} flex items-center justify-center text-white font-bold`}>
                2
              </div>
              <span>Record Voice</span>
            </div>
            <div className={`flex items-center space-x-2 ${currentStage === 'generating' || currentStage === 'complete' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full ${currentStage === 'generating' || currentStage === 'complete' ? 'bg-blue-600' : 'bg-gray-300'} flex items-center justify-center text-white font-bold`}>
                3
              </div>
              <span>Generate Voice</span>
            </div>
          </div>
        </div>

        {/* Preview Stage */}
        {currentStage === 'preview' && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Play className="h-5 w-5" />
                <span>Story Preview</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-100 p-4 rounded-lg mb-4">
                <p className="text-gray-700 leading-relaxed">
                  {invitation.content.substring(0, 500)}...
                </p>
              </div>
              <div className="flex justify-center space-x-4">
                <Button
                  onClick={handlePlayPause}
                  variant="outline"
                  disabled={!audio}
                >
                  {isPlaying ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                  {isPlaying ? 'Pause' : 'Play'} Story
                </Button>
                <Button
                  onClick={() => setCurrentStage('recording')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Start Recording
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recording Stage */}
        {currentStage === 'recording' && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Volume2 className="h-5 w-5" />
                  <span>Voice Recording</span>
                </div>
                <Badge variant="outline">
                  {completedRecordings}/{totalRecordings} completed
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Emotions */}
                {narrative?.emotions?.map((emotion: any) => (
                  <div key={emotion.emotion} className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-2">{emotion.emotion}</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      {emotion.sampleText || `Record yourself expressing ${emotion.emotion.toLowerCase()}`}
                    </p>
                    <EnhancedVoiceRecorder
                      emotionName={emotion.emotion}
                      sampleText={emotion.sampleText}
                      onVoiceRecorded={handleVoiceRecorded}
                      isRecorded={recordingStates[emotion.emotion]?.isRecorded}
                      isSaving={recordingStates[emotion.emotion]?.isSaving}
                      errorMessage={recordingStates[emotion.emotion]?.errorMessage}
                      duration={recordingStates[emotion.emotion]?.duration}
                    />
                  </div>
                ))}

                {/* Sounds */}
                {narrative?.soundEffects?.map((sound: any) => (
                  <div key={sound.sound} className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-2">{sound.sound}</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      {sound.sampleText || `Record yourself making ${sound.sound.toLowerCase()} sound`}
                    </p>
                    <EnhancedVoiceRecorder
                      emotionName={sound.sound}
                      sampleText={sound.sampleText}
                      onVoiceRecorded={handleVoiceRecorded}
                      isRecorded={recordingStates[sound.sound]?.isRecorded}
                      isSaving={recordingStates[sound.sound]?.isSaving}
                      errorMessage={recordingStates[sound.sound]?.errorMessage}
                      duration={recordingStates[sound.sound]?.duration}
                    />
                  </div>
                ))}

                <div className="flex justify-center">
                  <Button
                    onClick={handleGenerateVoice}
                    disabled={completedRecordings < 5}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Generate Narrator Voice
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Generating Stage */}
        {currentStage === 'generating' && (
          <Card>
            <CardContent className="text-center py-8">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Generating Your Narrator Voice</h3>
              <p className="text-gray-600">
                This may take a few moments. Please don't close this page.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Complete Stage */}
        {currentStage === 'complete' && (
          <Card>
            <CardContent className="text-center py-8">
              <div className="text-green-600 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-2">Voice Created Successfully!</h3>
              <p className="text-gray-600 mb-4">
                Your personalized narrator voice has been created. The story can now be narrated with your voice.
              </p>
              <Button onClick={() => window.close()} className="bg-blue-600 hover:bg-blue-700">
                Close
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}