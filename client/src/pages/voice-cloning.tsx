import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PressHoldRecorder } from '@/components/ui/press-hold-recorder';
import { Mic, Play, Pause, Check, AlertCircle, Settings, TestTube } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EmotionConfig } from '@shared/voice-config';

interface VoiceProfile {
  id: number;
  userId: string;
  elevenLabsVoiceId?: string;
  voiceName: string;
  trainingStatus: 'pending' | 'training' | 'completed' | 'failed';
  trainingProgress: number;
  sampleCount: number;
  qualityScore?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface EmotionSample {
  emotion: string;
  audioData: string;
  intensity: number;
  duration?: number;
}

// Get top 10 priority emotions from voice config
const priorityEmotions = [
  'happiness', 'sadness', 'anger', 'fear', 'surprise', 
  'disgust', 'contempt', 'excitement', 'calm', 'love'
];

export default function VoiceCloning() {
  const [voiceName, setVoiceName] = useState('My Voice Clone');
  const [selectedEmotion, setSelectedEmotion] = useState(priorityEmotions[0]);
  const [emotionSamples, setEmotionSamples] = useState<EmotionSample[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [testText, setTestText] = useState('Hello, this is a test of my cloned voice!');
  const [testAudioUrl, setTestAudioUrl] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Test ElevenLabs connection
  const { data: elevenLabsStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['/api/voice/test-elevenlabs'],
    refetchInterval: 30000 // Check every 30 seconds
  });

  // Get user's voice profile
  const { data: voiceProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['/api/user/voice-profile']
  });

  // Create voice clone mutation
  const createCloneMutation = useMutation({
    mutationFn: async () => {
      if (emotionSamples.length < 3) {
        throw new Error('Please record at least 3 different emotions');
      }

      const response = await fetch('/api/voice/create-clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voiceName,
          emotionSamples
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create voice clone');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Voice Clone Created',
        description: 'Your voice has been successfully cloned!'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user/voice-profile'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Voice Cloning Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Test speech generation mutation
  const testSpeechMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/voice/generate-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: testText,
          emotion: selectedEmotion,
          intensity: 5
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate speech');
      }

      return response.json();
    },
    onSuccess: (data) => {
      setTestAudioUrl(data.audioUrl);
      toast({
        title: 'Test Audio Generated',
        description: 'Click play to hear your cloned voice!'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Speech Generation Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const handleRecordingComplete = (audioBlob: Blob, audioUrl: string) => {
    // Convert blob to base64 for storage
    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result as string;
      const sample: EmotionSample = {
        emotion: selectedEmotion,
        audioData: base64Data,
        intensity: 5,
        duration: audioBlob.size / 1000 // Rough estimate
      };

      // Replace existing sample for this emotion or add new one
      setEmotionSamples(prev => {
        const filtered = prev.filter(s => s.emotion !== selectedEmotion);
        return [...filtered, sample];
      });

      toast({
        title: 'Recording Saved',
        description: `${selectedEmotion} emotion sample recorded successfully`
      });

      // Auto-advance to next emotion
      const currentIndex = priorityEmotions.indexOf(selectedEmotion);
      if (currentIndex < priorityEmotions.length - 1) {
        setSelectedEmotion(priorityEmotions[currentIndex + 1]);
      }
    };
    reader.readAsDataURL(audioBlob);
  };

  const getEmotionStatus = (emotion: string) => {
    return emotionSamples.some(s => s.emotion === emotion);
  };

  const playTestAudio = () => {
    if (testAudioUrl) {
      const audio = new Audio(testAudioUrl);
      audio.play();
    }
  };

  const progressPercentage = (emotionSamples.length / priorityEmotions.length) * 100;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Voice Cloning Studio</h1>
        <p className="text-muted-foreground">
          Create your personalized voice clone with emotion-aware speech generation
        </p>
      </div>

      {/* ElevenLabs Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            ElevenLabs Integration Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {statusLoading ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span>Checking connection...</span>
            </div>
          ) : elevenLabsStatus?.status?.isHealthy ? (
            <div className="flex items-center gap-2 text-green-600">
              <Check className="h-4 w-4" />
              <span>Connected to ElevenLabs API</span>
              <Badge variant="secondary">Ready for voice cloning</Badge>
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                ElevenLabs connection failed: {elevenLabsStatus?.status?.error || 'Unknown error'}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="record" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="record">Record Emotions</TabsTrigger>
          <TabsTrigger value="clone">Create Clone</TabsTrigger>
          <TabsTrigger value="test">Test Voice</TabsTrigger>
        </TabsList>

        {/* Recording Tab */}
        <TabsContent value="record">
          <Card>
            <CardHeader>
              <CardTitle>Record Emotion Samples</CardTitle>
              <CardDescription>
                Record yourself expressing different emotions. We need at least 3 emotions to create your voice clone.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Recording Progress</span>
                  <span>{emotionSamples.length}/{priorityEmotions.length} emotions</span>
                </div>
                <Progress value={progressPercentage} />
              </div>

              {/* Emotion Selection */}
              <div className="space-y-3">
                <Label>Select Emotion to Record</Label>
                <div className="grid grid-cols-5 gap-2">
                  {priorityEmotions.map(emotion => (
                    <button
                      key={emotion}
                      onClick={() => setSelectedEmotion(emotion)}
                      className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                        selectedEmotion === emotion
                          ? 'bg-primary text-primary-foreground border-primary'
                          : getEmotionStatus(emotion)
                          ? 'bg-green-50 border-green-200 text-green-700'
                          : 'bg-background border-border hover:bg-accent'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span className="capitalize">{emotion}</span>
                        {getEmotionStatus(emotion) && <Check className="h-3 w-3" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Recording Interface */}
              <div className="space-y-4">
                <div>
                  <Label className="text-lg">Recording: {selectedEmotion}</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Express this emotion naturally. Speak for 10-30 seconds about anything that makes you feel {selectedEmotion}.
                  </p>
                </div>

                <div className="flex justify-center">
                  <PressHoldRecorder
                    onRecordingComplete={handleRecordingComplete}
                    buttonText={`Record ${selectedEmotion}`}
                    minDuration={3000}
                    maxDuration={30000}
                    className="w-48 h-48 rounded-full text-lg"
                  />
                </div>

                {getEmotionStatus(selectedEmotion) && (
                  <Alert>
                    <Check className="h-4 w-4" />
                    <AlertDescription>
                      {selectedEmotion} emotion sample recorded! You can re-record to replace it.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Clone Creation Tab */}
        <TabsContent value="clone">
          <Card>
            <CardHeader>
              <CardTitle>Create Voice Clone</CardTitle>
              <CardDescription>
                Generate your personalized voice clone using the recorded emotion samples.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {emotionSamples.length < 3 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    You need to record at least 3 different emotions before creating a voice clone.
                    Currently recorded: {emotionSamples.length} emotions.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="voiceName">Voice Clone Name</Label>
                    <Input
                      id="voiceName"
                      value={voiceName}
                      onChange={(e) => setVoiceName(e.target.value)}
                      placeholder="Give your voice clone a name"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>Recorded Emotions ({emotionSamples.length})</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {emotionSamples.map(sample => (
                        <Badge key={sample.emotion} variant="secondary" className="p-2">
                          <span className="capitalize">{sample.emotion}</span>
                          <span className="ml-2 text-xs">
                            {sample.duration ? `${(sample.duration / 1000).toFixed(1)}s` : ''}
                          </span>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={() => createCloneMutation.mutate()}
                    disabled={createCloneMutation.isPending || !elevenLabsStatus?.status?.isHealthy}
                    className="w-full"
                    size="lg"
                  >
                    {createCloneMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creating Voice Clone...
                      </>
                    ) : (
                      <>
                        <Mic className="h-4 w-4 mr-2" />
                        Create Voice Clone
                      </>
                    )}
                  </Button>
                </>
              )}

              {voiceProfile && (
                <Alert>
                  <Check className="h-4 w-4" />
                  <AlertDescription>
                    Voice clone "{voiceProfile.voiceName}" already exists! 
                    Status: {voiceProfile.trainingStatus}
                    {voiceProfile.qualityScore && ` (Quality: ${voiceProfile.qualityScore}%)`}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Testing Tab */}
        <TabsContent value="test">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Test Your Voice Clone
              </CardTitle>
              <CardDescription>
                Generate speech with your cloned voice to test different emotions and content.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!voiceProfile ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    You need to create a voice clone first before testing speech generation.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="testText">Text to Speak</Label>
                    <Input
                      id="testText"
                      value={testText}
                      onChange={(e) => setTestText(e.target.value)}
                      placeholder="Enter text for your voice clone to speak"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Emotion Style</Label>
                    <div className="grid grid-cols-5 gap-2">
                      {priorityEmotions.map(emotion => (
                        <button
                          key={emotion}
                          onClick={() => setSelectedEmotion(emotion)}
                          className={`p-2 rounded border text-sm transition-colors ${
                            selectedEmotion === emotion
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background border-border hover:bg-accent'
                          }`}
                        >
                          <span className="capitalize">{emotion}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={() => testSpeechMutation.mutate()}
                      disabled={testSpeechMutation.isPending || !testText.trim()}
                      size="lg"
                    >
                      {testSpeechMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Generating...
                        </>
                      ) : (
                        <>
                          <Mic className="h-4 w-4 mr-2" />
                          Generate Speech
                        </>
                      )}
                    </Button>

                    {testAudioUrl && (
                      <Button variant="outline" onClick={playTestAudio} size="lg">
                        <Play className="h-4 w-4 mr-2" />
                        Play Result
                      </Button>
                    )}
                  </div>

                  {testAudioUrl && (
                    <Alert>
                      <Check className="h-4 w-4" />
                      <AlertDescription>
                        Speech generated successfully! Click "Play Result" to hear your cloned voice.
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}