import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, Pause, RotateCcw, ArrowRight, Shield } from "lucide-react";
import { PressHoldRecorder } from "@/components/ui/press-hold-recorder";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function VoiceRecordPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
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
      
      const response = await fetch('/api/audio/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to transcribe audio');
      }

      return await response.json();
    },
    onSuccess: (data) => {
      console.log('Transcription completed:', data);
      // Store the transcribed text in session storage for the upload page
      if (data.text) {
        sessionStorage.setItem('uploadedStoryContent', data.text);
        console.log('Stored transcribed text in session storage:', data.text);
      }
      
      toast({
        title: "Audio Transcribed Successfully",
        description: `Converted ${data.text ? data.text.length : 0} characters of text. Redirecting...`,
      });
      
      // Redirect immediately after successful transcription - no delay needed
      setTimeout(() => {
        setLocation('/upload-story?source=voice');
      }, 500);
    },
    onError: (error: any) => {
      toast({
        title: "Transcription Failed",
        description: error.message || "Could not convert audio to text. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleRecordingComplete = (audioBlob: Blob, audioUrl: string) => {
    setAudioBlob(audioBlob);
    setAudioUrl(audioUrl);
  };

  const togglePlayback = () => {
    if (!audioUrl) return;
    
    if (audioPlayerRef.current) {
      if (isPlaying) {
        audioPlayerRef.current.pause();
        setIsPlaying(false);
      } else {
        audioPlayerRef.current.play();
        setIsPlaying(true);
      }
    } else {
      const audio = new Audio(audioUrl);
      audioPlayerRef.current = audio;
      audio.onended = () => setIsPlaying(false);
      audio.play();
      setIsPlaying(true);
    }
  };

  const resetRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setIsPlaying(false);
  };

  const processAudio = () => {
    if (audioBlob) {
      transcribeMutation.mutate(audioBlob);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <Button
            onClick={() => setLocation('/')}
            variant="ghost"
            className="absolute top-4 left-4 text-white hover:bg-white/10"
          >
            ← Back to Home
          </Button>

          <h1 className="text-4xl font-bold text-white mb-2">
            Voice Record Story
          </h1>
          <p className="text-gray-300 text-lg">
            Record your story using voice, then convert it to text
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <Card className="bg-gray-900/50 border-gray-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Voice Recording
              </CardTitle>
              <CardDescription className="text-gray-400">
                Your audio is processed for text extraction only and not stored permanently
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

            {/* Recording Section */}
            {!audioBlob && (
              <PressHoldRecorder
                onRecordingComplete={handleRecordingComplete}
                maxRecordingTime={300}
                buttonText={{
                  hold: "Hold",
                  recording: "Release",
                  instructions: "Press and hold to record your story"
                }}
              />
            )}

            {audioBlob && (
              <div className="space-y-4">
                {/* Audio File Info */}
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <h4 className="text-sm font-medium mb-2 text-center">Recording Complete</h4>
                  <div className="flex justify-center items-center space-x-4 text-sm text-gray-300">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Size: {formatFileSize(audioBlob.size)}</span>
                    </div>
                  </div>
                </div>

                {/* Audio Preview Section */}
                <div className="bg-gray-800/30 rounded-lg p-4">
                  <h4 className="text-sm font-medium mb-3 text-center">Audio Preview</h4>
                  <div className="flex justify-center space-x-4 mb-3">
                    <Button 
                      onClick={togglePlayback}
                      variant="outline"
                      className="border-blue-500 text-blue-500 hover:bg-blue-500/20"
                      size="sm"
                    >
                      {isPlaying ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                      {isPlaying ? 'Pause Preview' : 'Play Preview'}
                    </Button>
                  </div>
                  
                  {/* Audio quality indicator */}
                  <div className="text-center">
                    {audioBlob.size < 10000 && (
                      <div className="text-yellow-400 text-xs bg-yellow-400/10 rounded px-2 py-1 inline-block mb-2">
                        ⚠️ Recording seems very short - ensure it contains clear speech
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
                    onClick={processAudio}
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
                  <strong>Before converting:</strong> Please play the preview to ensure your recording contains clear speech. 
                  If it sounds unclear or silent, record again for better results.
                </div>
              </div>
            )}

            {/* Privacy Notice */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-sm">
              <div className="flex items-start space-x-2">
                <Shield className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-blue-200">
                  <strong>Privacy Notice:</strong> Your voice recordings are processed temporarily to extract text content. 
                  Audio files are automatically deleted after processing and are never stored permanently on our servers.
                </div>
              </div>
            </div>

            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}