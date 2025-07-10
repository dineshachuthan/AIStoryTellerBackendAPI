import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Mic, Play, StopCircle, CheckCircle2, Circle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { GLOBAL_EMOTION_SAMPLES, VOICE_TYPES, MIN_SAMPLES_FOR_VOICE } from '@shared/config/ephemeral-voice-config';
import { apiRequest } from '@/lib/queryClient';
import { VoiceProgressTracker } from '@/components/VoiceProgressTracker';
import { apiClient } from '@/lib/api-client';

interface VoiceRecording {
  id: string;
  emotion: string;
  voiceType: string;
  audioUrl: string;
  duration: number;
  recordedAt: Date;
}

export default function GlobalVoiceSamples() {
  const { toast } = useToast();
  const [selectedVoiceType, setSelectedVoiceType] = useState(VOICE_TYPES[0].id);
  const [recordingEmotion, setRecordingEmotion] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);

  // Fetch user's voice recordings
  const { data: recordings = [], isLoading } = useQuery<VoiceRecording[]>({
    queryKey: ['/api/user/voice-recordings']
  });

  // Upload recording mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ emotion, voiceType, audioBlob }: { emotion: string; voiceType: string; audioBlob: Blob }) => {
      const formData = new FormData();
      formData.append('audio', audioBlob, `${emotion}_${voiceType}_${Date.now()}.webm`);
      formData.append('emotion', emotion);
      formData.append('voiceType', voiceType);
      
      return apiClient.voice.uploadRecording(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/voice-recordings'] });
      toast({
        title: 'Voice sample saved!',
        description: 'Your emotion has been recorded successfully.'
      });
    },
    onError: (error) => {
      toast({
        title: 'Recording failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Delete recording mutation
  const deleteMutation = useMutation({
    mutationFn: async (recordingId: number) => {
      return apiClient.voice.deleteRecording(recordingId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/voice-recordings'] });
      toast({
        title: 'Recording deleted',
        description: 'Voice sample has been removed.'
      });
    },
    onError: (error) => {
      toast({
        title: 'Delete failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Calculate progress
  const recordedEmotions = new Set(recordings.map(r => r.emotion));
  const progress = (recordedEmotions.size / GLOBAL_EMOTION_SAMPLES.length) * 100;

  // Start recording
  const startRecording = async (emotion: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        await uploadMutation.mutateAsync({ emotion, voiceType: selectedVoiceType, audioBlob });
        
        // Clean up
        stream.getTracks().forEach(track => track.stop());
        setRecordingEmotion(null);
        setRecordingDuration(0);
      };

      setAudioChunks(chunks);
      setMediaRecorder(recorder);
      setRecordingEmotion(emotion);
      setIsRecording(true);
      recorder.start();

      // Start duration timer
      const startTime = Date.now();
      const timer = setInterval(() => {
        const duration = Math.floor((Date.now() - startTime) / 1000);
        setRecordingDuration(duration);
        
        // Auto-stop at max duration
        if (duration >= 25) {
          stopRecording();
          clearInterval(timer);
        }
      }, 100);

    } catch (error) {
      console.error('Failed to start recording:', error);
      toast({
        title: 'Microphone access denied',
        description: 'Please allow microphone access to record voice samples.',
        variant: 'destructive'
      });
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  // Play recorded sample
  const playRecording = (audioUrl: string) => {
    const audio = new Audio(audioUrl);
    audio.play();
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  const currentVoiceType = VOICE_TYPES.find(v => v.id === selectedVoiceType);
  const filteredRecordings = recordings.filter(r => r.voiceType === selectedVoiceType);
  const recordedEmotionsForVoice = new Set(filteredRecordings.map(r => r.emotion));
  const progressForVoice = Math.min((filteredRecordings.length / MIN_SAMPLES_FOR_VOICE) * 100, 100);

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      {/* Voice Progress Tracker */}
      <div className="mb-8">
        <VoiceProgressTracker />
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Multi-Voice Sample Collection</CardTitle>
          <CardDescription>
            Create multiple narrator voices for different story moods. Each voice needs {MIN_SAMPLES_FOR_VOICE} emotion samples.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedVoiceType} onValueChange={setSelectedVoiceType}>
            <TabsList className="grid grid-cols-5 w-full mb-6">
              {VOICE_TYPES.map(voiceType => {
                const voiceRecordings = recordings.filter(r => r.voiceType === voiceType.id);
                const count = voiceRecordings.length;
                return (
                  <TabsTrigger key={voiceType.id} value={voiceType.id} className="relative">
                    <span className="mr-1">{voiceType.icon}</span>
                    <span className="hidden sm:inline">{voiceType.name}</span>
                    {count >= MIN_SAMPLES_FOR_VOICE && (
                      <span className="absolute -top-1 -right-1 text-xs text-green-600">✓</span>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
            
            <TabsContent value={selectedVoiceType}>
              {currentVoiceType && (
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <h3 className="font-semibold flex items-center gap-2 mb-2">
                      <span className="text-2xl">{currentVoiceType.icon}</span>
                      {currentVoiceType.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">{currentVoiceType.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Best for: {currentVoiceType.suggestedFor.join(', ')} stories
                    </p>
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Progress</span>
                      <span className="text-sm text-muted-foreground">
                        {filteredRecordings.length} / {MIN_SAMPLES_FOR_VOICE} samples recorded
                      </span>
                    </div>
                    <Progress value={progressForVoice} className="h-2" />
                  </div>
                  
                  {progressForVoice >= 100 && (
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                      <p className="text-green-800 dark:text-green-200 font-medium">
                        🎉 This voice is ready! It will be created when generating your next story.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {GLOBAL_EMOTION_SAMPLES.map((sample) => {
          const isRecorded = recordedEmotionsForVoice.has(sample.emotion);
          const isCurrentlyRecording = recordingEmotion === sample.emotion;
          const recording = filteredRecordings.find(r => r.emotion === sample.emotion);

          return (
            <Card key={sample.id} className={isRecorded ? 'border-green-500' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{sample.icon}</span>
                    <div>
                      <CardTitle className="text-lg">{sample.displayName}</CardTitle>
                      <CardDescription>{sample.description}</CardDescription>
                    </div>
                  </div>
                  {isRecorded ? (
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                  ) : (
                    <Circle className="h-6 w-6 text-gray-300" />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm italic">{sample.exampleText}</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {sample.minDuration}-{sample.maxDuration} seconds
                    </Badge>
                    {isCurrentlyRecording && (
                      <Badge variant="destructive" className="animate-pulse">
                        Recording: {recordingDuration}s
                      </Badge>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {!isCurrentlyRecording ? (
                      <>
                        <Button
                          onClick={() => startRecording(sample.emotion)}
                          variant={isRecorded ? 'outline' : 'default'}
                          className="flex-1"
                          disabled={isRecording}
                        >
                          <Mic className="h-4 w-4 mr-2" />
                          {isRecorded ? 'Re-record' : 'Record'}
                        </Button>
                        {recording && (
                          <>
                            <Button
                              onClick={() => playRecording(recording.audioUrl)}
                              variant="outline"
                              size="icon"
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => deleteMutation.mutate(Number(recording.id))}
                              variant="outline"
                              size="icon"
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </>
                    ) : (
                      <Button
                        onClick={stopRecording}
                        variant="destructive"
                        className="flex-1"
                        disabled={recordingDuration < sample.minDuration}
                      >
                        <StopCircle className="h-4 w-4 mr-2" />
                        Stop Recording
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}