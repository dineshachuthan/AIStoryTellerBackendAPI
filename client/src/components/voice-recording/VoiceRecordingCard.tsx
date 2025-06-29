import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Mic, Play, Pause, CheckCircle, RotateCcw, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface VoiceTemplate {
  id: number;
  modulationType: string;
  modulationKey: string;
  displayName: string;
  description: string;
  sampleText: string;
  targetDuration: number;
  category: string;
  voiceSettings?: any;
}

export interface RecordedSample {
  modulationKey: string;
  audioUrl: string;
  duration: number;
  recordedAt: Date;
}

interface VoiceRecordingCardProps {
  template: VoiceTemplate;
  recordedSample?: RecordedSample;
  isRecorded: boolean;
  onRecord: (modulationKey: string, audioBlob: Blob) => Promise<void>;
  onPlayRecorded?: (audioUrl: string) => void;
  className?: string;
}

export function VoiceRecordingCard({
  template,
  recordedSample,
  isRecorded,
  onRecord,
  onPlayRecorded,
  className
}: VoiceRecordingCardProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const holdTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 44100,
          channelCount: 1
        }
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm; codecs=opus') 
          ? 'audio/webm; codecs=opus'
          : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : 'audio/webm'
      });

      const audioChunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
        
        if (recordingTime >= 1000) { // Minimum 1 second
          setIsProcessing(true);
          try {
            await onRecord(template.modulationKey, audioBlob);
          } catch (error) {
            console.error('Recording save failed:', error);
          } finally {
            setIsProcessing(false);
          }
        }
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start recording timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 100);
      }, 100);

    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  const handleMouseDown = () => {
    holdTimeoutRef.current = setTimeout(() => {
      startRecording();
    }, 300); // 300ms hold delay
  };

  const handleMouseUp = () => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    
    if (isRecording) {
      stopRecording();
    }
  };

  const handleMouseLeave = () => {
    handleMouseUp();
  };

  const playRecordedSample = () => {
    if (!recordedSample?.audioUrl) return;
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const audio = new Audio(recordedSample.audioUrl);
    audioRef.current = audio;
    
    audio.onplay = () => setIsPlaying(true);
    audio.onended = () => setIsPlaying(false);
    audio.onerror = () => setIsPlaying(false);
    
    audio.play().catch(console.error);
    
    if (onPlayRecorded) {
      onPlayRecorded(recordedSample.audioUrl);
    }
  };

  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const tenths = Math.floor((ms % 1000) / 100);
    return `${seconds}.${tenths}s`;
  };

  const progressPercentage = Math.min((recordingTime / (template.targetDuration * 1000)) * 100, 100);

  return (
    <Card className={cn(
      "transition-all duration-200 hover:shadow-lg",
      isRecorded && "ring-2 ring-green-500 ring-opacity-50",
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              {isRecorded ? (
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
              ) : (
                <Mic className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
              )}
              {template.displayName}
            </CardTitle>
            <CardDescription className="mt-1 text-xs sm:text-sm">
              {template.description}
            </CardDescription>
          </div>
          <Badge variant={isRecorded ? "default" : "secondary"} className="ml-2">
            {template.modulationType}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Sample Text */}
        <div className="bg-muted/50 p-3 rounded-md">
          <p className="text-sm font-medium mb-1">Practice Text:</p>
          <p className="text-sm text-muted-foreground italic">
            "{template.sampleText}"
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Target: {template.targetDuration}s
          </p>
        </div>

        {/* Recording Progress */}
        {isRecording && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Recording...</span>
              <span>{formatTime(recordingTime)}</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-col gap-3">
          {!isRecorded ? (
            /* No Voice Recorded State */
            <div className="space-y-2">
              <Button
                size="lg"
                variant={isRecording ? "destructive" : "default"}
                className={cn(
                  "w-full h-14 text-base font-medium transition-all duration-200",
                  isRecording && "bg-red-600 hover:bg-red-700 animate-pulse"
                )}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                onTouchStart={handleMouseDown}
                onTouchEnd={handleMouseUp}
                disabled={isProcessing}
              >
                <Mic className={cn("w-5 h-5 mr-3", isRecording && "animate-pulse")} />
                {isProcessing ? 'Saving Your Voice...' : 
                 isRecording ? 'Release to Stop Recording' : 
                 'Hold to Record Your Voice'}
              </Button>
              {!isRecording && !isProcessing && (
                <p className="text-xs text-center text-muted-foreground">
                  Press and hold for at least 1 second to record
                </p>
              )}
            </div>
          ) : (
            /* Voice Recorded State */
            <div className="space-y-3">
              {/* Success Indicator */}
              <div className="flex items-center justify-center gap-2 text-green-600 bg-green-50 dark:bg-green-950 py-2 rounded-md">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Voice Recorded Successfully</span>
              </div>
              
              {/* Playback and Re-record Controls */}
              <div className="flex gap-2">
                <Button
                  size="lg"
                  variant="outline"
                  className="flex-1 h-12"
                  onClick={isPlaying ? stopPlayback : playRecordedSample}
                  disabled={isProcessing}
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      Stop Playback
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Play Your Voice
                    </>
                  )}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 px-4"
                  onMouseDown={handleMouseDown}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseLeave}
                  onTouchStart={handleMouseDown}
                  onTouchEnd={handleMouseUp}
                  disabled={isProcessing}
                  title="Hold to re-record"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Recorded Sample Info */}
        {recordedSample && (
          <div className="flex items-center justify-between text-xs text-muted-foreground bg-green-50 dark:bg-green-950 p-2 rounded">
            <div className="flex items-center gap-1">
              <Volume2 className="w-3 h-3" />
              <span>Recorded {formatTime(recordedSample.duration * 1000)}</span>
            </div>
            <span>{new Date(recordedSample.recordedAt).toLocaleDateString()}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}