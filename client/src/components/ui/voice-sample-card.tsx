import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Lock, Unlock, Play, Pause, Volume2, Mic, Clock, CheckCircle, RotateCcw, Save } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RecordedSample {
  audioUrl: string;
  duration: number;
  recordedAt?: Date;
  isLocked?: boolean;
}

interface VoiceSampleCardProps {
  // Template data
  emotion: string;
  displayName: string;
  description: string;
  sampleText: string;
  category: string;
  targetDuration?: number;
  intensity?: number;
  
  // Recording state
  isRecorded: boolean;
  isLocked: boolean;
  recordedSample?: RecordedSample;
  
  // UI state
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
  
  // Callbacks
  onRecordingComplete: (audioBlob: Blob) => void;
  onPlaySample?: (audioUrl: string) => void;
  onDeleteSample?: () => void;
}

export function VoiceSampleCard({
  emotion,
  displayName,
  description,
  sampleText,
  category,
  targetDuration = 10,
  intensity,
  isRecorded,
  isLocked,
  recordedSample,
  disabled = false,
  isLoading = false,
  className,
  onRecordingComplete,
  onPlaySample,
  onDeleteSample
}: VoiceSampleCardProps) {
  // Recording state management
  const [recordingState, setRecordingState] = useState<'idle' | 'countdown' | 'recording' | 'recorded' | 'playing' | 'saving'>('idle');
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [countdownTime, setCountdownTime] = useState(3);
  const [tempRecording, setTempRecording] = useState<{ blob: Blob; url: string; duration: number } | null>(null);
  const [micError, setMicError] = useState<string>('');

  // Recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const tempAudioRef = useRef<HTMLAudioElement | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (tempRecording?.url) {
        URL.revokeObjectURL(tempRecording.url);
      }
    };
  }, [tempRecording]);

  // Status configuration
  const getStatusConfig = () => {
    if (isLocked) {
      return {
        icon: <Lock className="w-4 h-4 text-blue-500" />,
        color: "blue",
        label: "Locked",
        description: "Used for voice cloning - locked from editing",
        bgColor: "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800"
      };
    } else if (isRecorded) {
      return {
        icon: <CheckCircle className="w-4 h-4 text-green-500" />,
        color: "green", 
        label: "Recorded",
        description: "Sample recorded - available for voice cloning",
        bgColor: "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800"
      };
    } else {
      return {
        icon: <Unlock className="w-4 h-4 text-gray-400" />,
        color: "gray",
        label: "Empty",
        description: "No sample recorded yet",
        bgColor: "bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800"
      };
    }
  };

  const statusConfig = getStatusConfig();

  // Recording functions
  const startRecording = async () => {
    try {
      setMicError('');
      setRecordingState('countdown');
      setCountdownTime(3);

      // Countdown timer
      const countdownInterval = setInterval(() => {
        setCountdownTime(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            beginRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (error) {
      console.error('Recording error:', error);
      setMicError('Failed to access microphone');
      setRecordingState('idle');
    }
  };

  const beginRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 44100
        }
      });

      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const duration = recordingTime;
        
        setTempRecording({ blob: audioBlob, url: audioUrl, duration });
        setRecordingState('recorded');
        setRecordingTime(0);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      setRecordingState('recording');
      setRecordingTime(0);
      mediaRecorder.start();

      // Recording timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 0.1;
          // Auto-stop at 15 seconds
          if (newTime >= 15) {
            stopRecording();
            return 15;
          }
          return newTime;
        });
      }, 100);

    } catch (error) {
      console.error('Recording setup error:', error);
      setMicError('Failed to start recording');
      setRecordingState('idle');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.stop();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const playTempRecording = () => {
    if (tempRecording?.url) {
      if (tempAudioRef.current) {
        tempAudioRef.current.pause();
        tempAudioRef.current.currentTime = 0;
      }
      
      const audio = new Audio(tempRecording.url);
      tempAudioRef.current = audio;
      
      audio.onended = () => setIsPlaying(false);
      audio.play();
      setIsPlaying(true);
    }
  };

  const saveRecording = async () => {
    if (tempRecording && onRecordingComplete) {
      setRecordingState('saving');
      try {
        await onRecordingComplete(tempRecording.blob);
        setRecordingState('idle');
        setTempRecording(null);
      } catch (error) {
        console.error('Save error:', error);
        setRecordingState('recorded');
      }
    }
  };

  const discardRecording = () => {
    if (tempRecording?.url) {
      URL.revokeObjectURL(tempRecording.url);
    }
    setTempRecording(null);
    setRecordingState('idle');
    setIsPlaying(false);
  };

  const playExistingRecording = () => {
    if (recordedSample?.audioUrl && onPlaySample) {
      onPlaySample(recordedSample.audioUrl);
    }
  };

  // Category badge color mapping
  const getCategoryColor = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'emotions': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'sounds': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'descriptions': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  // Render recording interface
  const renderRecordingInterface = () => {
    // If we have a saved recording, show play button
    if (isRecorded && recordedSample && !tempRecording) {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Button
              onClick={playExistingRecording}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Play Saved
            </Button>
            <Button
              onClick={startRecording}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              disabled={isLocked}
            >
              <Mic className="w-4 h-4" />
              Re-record
            </Button>
          </div>
        </div>
      );
    }

    // Recording states
    if (recordingState === 'countdown') {
      return (
        <div className="text-center space-y-2">
          <div className="text-2xl font-bold text-blue-600">{countdownTime}</div>
          <p className="text-sm text-gray-600">Get ready to speak...</p>
        </div>
      );
    }

    if (recordingState === 'recording') {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Recording: {recordingTime.toFixed(1)}s</span>
          </div>
          <Progress value={(recordingTime / targetDuration) * 100} className="w-full" />
          <Button
            onClick={stopRecording}
            variant="outline"
            size="sm"
            className="w-full"
          >
            Stop Recording
          </Button>
        </div>
      );
    }

    if (recordingState === 'recorded' && tempRecording) {
      return (
        <div className="space-y-3">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">
              Recording: {tempRecording.duration.toFixed(1)}s
            </p>
            <div className="flex gap-2 justify-center">
              <Button
                onClick={playTempRecording}
                variant="outline"
                size="sm"
                disabled={isPlaying}
              >
                <Play className="w-4 h-4 mr-1" />
                {isPlaying ? 'Playing...' : 'Play'}
              </Button>
              <Button
                onClick={discardRecording}
                variant="outline"
                size="sm"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Re-record
              </Button>
            </div>
          </div>
          <Button
            onClick={saveRecording}
            className="w-full"
            disabled={tempRecording.duration < 5}
          >
            <Save className="w-4 h-4 mr-1" />
            {tempRecording.duration < 5 ? `Need ${(5 - tempRecording.duration).toFixed(1)}s more` : 'Save Recording'}
          </Button>
        </div>
      );
    }

    if (recordingState === 'saving') {
      return (
        <div className="text-center space-y-2">
          <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-sm text-gray-600">Saving recording...</p>
        </div>
      );
    }

    // Default idle state
    return (
      <Button
        onClick={startRecording}
        className="w-full"
        disabled={disabled || isLocked}
      >
        <Mic className="w-4 h-4 mr-2" />
        Start Recording
      </Button>
    );
  };

  return (
    <Card className={cn(
      "w-full transition-colors duration-200",
      statusConfig.bgColor,
      disabled && "opacity-60 cursor-not-allowed",
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1">
                  {statusConfig.icon}
                  <span className="font-medium text-sm">{displayName}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{statusConfig.description}</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Badge className={getCategoryColor(category)} variant="secondary">
            {category}
          </Badge>
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
          {description}
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Sample text */}
        <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md">
          <p className="text-sm italic text-gray-700 dark:text-gray-300">
            "{sampleText}"
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Target: {targetDuration}s minimum
          </p>
        </div>

        {/* Error display */}
        {micError && (
          <div className="text-red-600 text-sm text-center">
            {micError}
          </div>
        )}

        {/* Recording interface */}
        {renderRecordingInterface()}
      </CardContent>
    </Card>
  );
}