import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Mic, Play, Square, RotateCcw, Check } from "lucide-react";
import { ConfigurableAudioRecorder } from "@/lib/audioRecorder";
import { AudioConfigManager } from "@/lib/audioConfig";
import { DEFAULT_PLATFORM_CONFIG } from "@shared/audioConfig";
import { EmotionVoiceRecorder } from "@/components/ui/emotion-voice-recorder";
import { getPriorityEmotions } from "@shared/voice-config";

interface VoiceSample {
  label: string;
  prompt: string;
  sampleType: string;
}

interface UserVoiceSample {
  id: number;
  label: string;
  audioUrl: string;
  isCompleted: boolean;
  sampleType: string;
}

export default function VoiceSetup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentSampleIndex, setCurrentSampleIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<File | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const { user } = useAuth();
  const userId = user?.id;

  // Fetch voice sample templates
  const { data: templates = [] } = useQuery<VoiceSample[]>({
    queryKey: ["/api/voice-samples/templates"],
  });

  // Fetch user's voice samples and progress
  const { data: userVoiceData, refetch: refetchVoiceData } = useQuery({
    queryKey: [`/api/users/${userId}/voice-samples`],
    enabled: !!userId,
  });

  const userSamples: UserVoiceSample[] = userVoiceData?.samples || [];
  const progress = userVoiceData?.progress || { completed: 0, total: 24, percentage: 0 };

  const uploadVoiceMutation = useMutation({
    mutationFn: async ({ audioFile, sample }: { audioFile: File; sample: VoiceSample }) => {
      const formData = new FormData();
      formData.append('audio', audioFile);
      formData.append('sampleType', sample.sampleType);
      formData.append('label', sample.label);
      formData.append('duration', '3000'); // Default 3 seconds

      const response = await fetch(`/api/users/${userId}/voice-samples`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload voice sample');
      }

      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Voice Sample Saved!",
        description: "Your voice has been recorded successfully.",
      });
      refetchVoiceData();
      setRecordedAudio(null);
      setAudioUrl(null);
      
      // Move to next sample
      if (currentSampleIndex < templates.length - 1) {
        setCurrentSampleIndex(currentSampleIndex + 1);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to save voice sample",
        variant: "destructive",
      });
    },
  });

  const currentSample = templates[currentSampleIndex];
  const isCurrentSampleCompleted = currentSample && userSamples.some(
    s => s.label === currentSample.label && s.isCompleted
  );

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        const file = new File([blob], `${currentSample.label}.wav`, { type: 'audio/wav' });
        setRecordedAudio(file);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      toast({
        title: "Recording Error",
        description: "Could not access microphone. Please allow microphone access.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  const playRecording = () => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play();
      setIsPlaying(true);
      audio.onended = () => setIsPlaying(false);
    }
  };

  const saveVoiceSample = () => {
    if (recordedAudio && currentSample) {
      uploadVoiceMutation.mutate({
        audioFile: recordedAudio,
        sample: currentSample,
      });
    }
  };

  const resetRecording = () => {
    setRecordedAudio(null);
    setAudioUrl(null);
    setIsPlaying(false);
  };

  const goToNextSample = () => {
    if (currentSampleIndex < templates.length - 1) {
      setCurrentSampleIndex(currentSampleIndex + 1);
      resetRecording();
    }
  };

  const goToPreviousSample = () => {
    if (currentSampleIndex > 0) {
      setCurrentSampleIndex(currentSampleIndex - 1);
      resetRecording();
    }
  };

  const getSampleTypeColor = (type: string) => {
    switch (type) {
      case 'emotion':
        return 'bg-tiktok-red/20 text-tiktok-red border-tiktok-red';
      case 'sound':
        return 'bg-tiktok-cyan/20 text-tiktok-cyan border-tiktok-cyan';
      case 'description':
        return 'bg-tiktok-pink/20 text-tiktok-pink border-tiktok-pink';
      default:
        return 'bg-gray-800 text-gray-300 border-gray-600';
    }
  };

  if (!currentSample) {
    return (
      <div className="bg-dark-bg text-dark-text min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Loading voice setup...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark-bg text-dark-text min-h-screen">
      <div className="flex flex-col h-screen">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-dark-card border-b border-gray-800">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setLocation("/")}
            className="text-dark-text hover:bg-gray-800"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h2 className="text-lg font-semibold">Voice Profile Setup</h2>
          <div className="text-sm text-gray-text">
            {currentSampleIndex + 1} / {templates.length}
          </div>
        </div>

        {/* Progress */}
        <div className="p-4 bg-dark-card border-b border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-text">Overall Progress</span>
            <span className="text-sm text-dark-text font-medium">{progress.percentage}%</span>
          </div>
          <Progress value={progress.percentage} className="h-2" />
          <p className="text-xs text-gray-text mt-2">
            {progress.completed} of {progress.total} voice samples completed
          </p>
        </div>

        {/* Current Sample */}
        <div className="flex-1 overflow-y-auto p-4">
          <Card className="bg-dark-card border-gray-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-dark-text capitalize">
                  {currentSample.label.replace(/_/g, ' ')}
                </CardTitle>
                <Badge variant="outline" className={getSampleTypeColor(currentSample.sampleType)}>
                  {currentSample.sampleType}
                </Badge>
              </div>
              <CardDescription className="text-gray-text">
                {currentSample.prompt}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Recording Status */}
              {isCurrentSampleCompleted && (
                <div className="flex items-center space-x-2 text-green-400">
                  <Check className="w-4 h-4" />
                  <span className="text-sm">Already completed</span>
                </div>
              )}

              {/* Recording Controls */}
              <div className="flex flex-col items-center space-y-4">
                {!isRecording && !recordedAudio && (
                  <Button
                    onClick={startRecording}
                    className="bg-tiktok-red hover:bg-tiktok-red/80 rounded-full w-20 h-20 flex items-center justify-center"
                  >
                    <Mic className="w-8 h-8" />
                  </Button>
                )}
                
                {isRecording && (
                  <div className="flex flex-col items-center space-y-4">
                    <div className="w-20 h-20 bg-tiktok-red rounded-full flex items-center justify-center animate-pulse">
                      <Mic className="w-8 h-8" />
                    </div>
                    <Button
                      onClick={stopRecording}
                      className="bg-gray-600 hover:bg-gray-500"
                    >
                      <Square className="w-4 h-4 mr-2" />
                      Stop Recording
                    </Button>
                  </div>
                )}
                
                {recordedAudio && !isRecording && (
                  <div className="flex flex-col items-center space-y-4">
                    <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center">
                      <Check className="w-8 h-8" />
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        onClick={playRecording}
                        disabled={isPlaying}
                        variant="outline"
                        className="border-gray-600 text-gray-300"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        {isPlaying ? "Playing..." : "Play"}
                      </Button>
                      
                      <Button
                        onClick={resetRecording}
                        variant="outline"
                        className="border-gray-600 text-gray-300"
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Record Again
                      </Button>
                    </div>
                    
                    <Button
                      onClick={saveVoiceSample}
                      disabled={uploadVoiceMutation.isPending}
                      className="bg-tiktok-cyan hover:bg-tiktok-cyan/80 w-full"
                    >
                      {uploadVoiceMutation.isPending ? "Saving..." : "Save & Continue"}
                    </Button>
                  </div>
                )}
              </div>

              {/* Navigation */}
              <div className="flex justify-between">
                <Button
                  onClick={goToPreviousSample}
                  disabled={currentSampleIndex === 0}
                  variant="outline"
                  className="border-gray-600 text-gray-300"
                >
                  Previous
                </Button>
                
                <Button
                  onClick={goToNextSample}
                  disabled={currentSampleIndex === templates.length - 1}
                  variant="outline"
                  className="border-gray-600 text-gray-300"
                >
                  Skip
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Completion Message */}
          {progress.percentage === 100 && (
            <div className="space-y-4">
              <Card className="bg-green-900/20 border-green-500/30 mt-4">
                <CardContent className="p-4 text-center">
                  <Check className="w-12 h-12 text-green-400 mx-auto mb-2" />
                  <h3 className="text-green-400 font-semibold">Voice Profile Complete!</h3>
                  <p className="text-gray-300 text-sm mt-1">
                    Now enhance your voice clone with emotion-specific samples for more expressive storytelling.
                  </p>
                </CardContent>
              </Card>

              {/* Emotion Voice Cloning Section - Individual Cards */}
              <div className="space-y-3">
                {getPriorityEmotions().map((emotion) => (
                  <EmotionVoiceRecorder
                    key={emotion}
                    emotion={emotion}
                    intensity={5}
                    onSave={(recording) => {
                      toast({
                        title: 'Emotion Sample Recorded',
                        description: `${emotion} emotion sample saved successfully`
                      });
                      refetchVoiceData();
                    }}
                    className="w-full"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}