import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Mic, MicOff, Play, Pause, RotateCcw, ArrowRight, Shield } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function VoiceRecordPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const MAX_RECORDING_TIME = 300; // 5 minutes in seconds

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
    };
  }, [audioUrl]);

  const transcribeMutation = useMutation({
    mutationFn: async (audioBlob: Blob) => {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      const response = await apiRequest("POST", "/api/audio/transcribe", formData);
      return await response.json();
    },
    onSuccess: (data) => {
      // Navigate to upload-story with the transcribed content
      const storyId = sessionStorage.getItem('currentStoryId');
      if (storyId && data.text) {
        sessionStorage.setItem('extractedContent', data.text);
        setLocation(`/upload-story?id=${storyId}&source=voice`);
      } else {
        toast({
          title: "Error",
          description: "Failed to process the recorded audio. Please try again.",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      console.error('Transcription error:', error);
      toast({
        title: "Error",
        description: "Failed to transcribe audio. Please try again.",
        variant: "destructive",
      });
    },
  });

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        
        // Clean up stream
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= MAX_RECORDING_TIME) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

      toast({
        title: "Recording Started",
        description: "You can record for up to 5 minutes.",
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Error",
        description: "Could not access microphone. Please check your permissions.",
        variant: "destructive",
      });
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
        // Resume timer
        timerRef.current = setInterval(() => {
          setRecordingTime(prev => {
            if (prev >= MAX_RECORDING_TIME) {
              stopRecording();
              return prev;
            }
            return prev + 1;
          });
        }, 1000);
      } else {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
        // Pause timer
        if (timerRef.current) clearInterval(timerRef.current);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const resetRecording = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setIsPlaying(false);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
  };

  const togglePlayback = () => {
    if (!audioUrl) return;

    if (isPlaying) {
      audioPlayerRef.current?.pause();
      setIsPlaying(false);
    } else {
      if (!audioPlayerRef.current) {
        audioPlayerRef.current = new Audio(audioUrl);
        audioPlayerRef.current.onended = () => setIsPlaying(false);
      }
      audioPlayerRef.current.play();
      setIsPlaying(true);
    }
  };

  const processRecording = () => {
    if (audioBlob) {
      transcribeMutation.mutate(audioBlob);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = (recordingTime / MAX_RECORDING_TIME) * 100;

  return (
    <div className="min-h-screen bg-dark-bg text-white p-4">
      <div className="max-w-2xl mx-auto">
        <Card className="bg-dark-card border-gray-800">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Voice Recording</CardTitle>
            <CardDescription className="text-center text-gray-400">
              Record your story and we'll convert it to text automatically
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Privacy Notice */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Shield className="w-5 h-5 text-blue-400 mt-0.5" />
                <div>
                  <h4 className="text-blue-400 font-medium">Privacy Notice</h4>
                  <p className="text-sm text-gray-300 mt-1">
                    Your audio recording is processed for text extraction only and is not stored on our servers. 
                    The audio data is discarded immediately after conversion.
                  </p>
                </div>
              </div>
            </div>

            {/* Recording Controls */}
            <div className="text-center space-y-4">
              {!isRecording && !audioBlob && (
                <Button 
                  onClick={startRecording}
                  size="lg"
                  className="bg-green-600 hover:bg-green-700 text-white h-16 w-16 rounded-full"
                >
                  <Mic className="w-8 h-8" />
                </Button>
              )}

              {isRecording && (
                <div className="space-y-4">
                  <div className="flex justify-center space-x-4">
                    <Button 
                      onClick={pauseRecording}
                      variant="outline"
                      className="border-yellow-500 text-yellow-500 hover:bg-yellow-500/20"
                    >
                      {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                      {isPaused ? 'Resume' : 'Pause'}
                    </Button>
                    <Button 
                      onClick={stopRecording}
                      variant="outline"
                      className="border-red-500 text-red-500 hover:bg-red-500/20"
                    >
                      <MicOff className="w-5 h-5" />
                      Stop
                    </Button>
                  </div>

                  {/* Recording Progress */}
                  <div className="space-y-2">
                    <div className="text-xl font-mono">
                      {formatTime(recordingTime)} / {formatTime(MAX_RECORDING_TIME)}
                    </div>
                    <Progress value={progressPercentage} className="w-full" />
                    {isPaused && (
                      <p className="text-yellow-400 text-sm">Recording paused</p>
                    )}
                  </div>
                </div>
              )}

              {audioBlob && !isRecording && (
                <div className="space-y-4">
                  {/* Audio Preview Section */}
                  <div className="bg-gray-800/30 rounded-lg p-4">
                    <h4 className="text-sm font-medium mb-3 text-center">Recording Preview</h4>
                    <div className="flex items-center justify-center space-x-4 mb-3">
                      <Button 
                        onClick={togglePlayback}
                        variant="outline"
                        className="border-blue-500 text-blue-500 hover:bg-blue-500/20"
                        size="sm"
                      >
                        {isPlaying ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                        {isPlaying ? 'Pause Preview' : 'Play Preview'}
                      </Button>
                      <div className="text-sm text-gray-400">
                        Duration: {formatTime(recordingTime)}
                      </div>
                    </div>
                    
                    {/* Audio quality indicator */}
                    <div className="text-center">
                      <div className="text-xs text-gray-500 mb-2">
                        File size: {Math.round(audioBlob.size / 1024)} KB
                      </div>
                      {audioBlob.size < 1000 && (
                        <div className="text-yellow-400 text-xs bg-yellow-400/10 rounded px-2 py-1 inline-block">
                          ⚠️ Recording seems very short - ensure you spoke clearly
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-3">
                    <Button 
                      onClick={resetRecording}
                      variant="outline"
                      className="border-gray-500 text-gray-500 hover:bg-gray-500/20 flex-1"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Record Again
                    </Button>
                    <Button 
                      onClick={processRecording}
                      disabled={transcribeMutation.isPending}
                      className="bg-tiktok-red hover:bg-tiktok-red/80 flex-1"
                    >
                      {transcribeMutation.isPending ? (
                        <>Processing...</>
                      ) : (
                        <>
                          Convert to Text
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Instructions */}
                  <div className="text-xs text-gray-500 text-center bg-blue-500/10 rounded p-3">
                    <strong>Before converting:</strong> Please play the preview to ensure your recording captured clearly. 
                    If it sounds unclear or empty, record again for better results.
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}