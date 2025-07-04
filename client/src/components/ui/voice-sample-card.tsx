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

  // Press and hold recording functions
  const handleMouseDown = () => {
    if (recordingState !== 'idle' || disabled || isLocked) return;
    
    setMicError('');
    
    // Start recording after 300ms hold delay (prevents accidental clicks)
    holdTimerRef.current = setTimeout(() => {
      startRecording();
    }, 300);
  };

  const handleMouseUp = () => {
    // Cancel hold timer if released before 300ms
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    
    // Stop recording if currently recording
    if (recordingState === 'recording') {
      stopRecording();
    }
  };

  const handleMouseLeave = () => {
    // Same as mouse up - stop recording if dragged off button
    handleMouseUp();
  };

  const startRecording = async () => {
    try {
      setRecordingState('recording');
      setRecordingTime(0);

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

  // Render radio-style recording interface with black panel
  const renderRecordingInterface = () => {
    return (
      <div className="bg-black text-white p-4 rounded-lg space-y-3">
        {/* Sample text display */}
        <div className="text-center mb-3">
          <p className="text-sm italic text-gray-300 leading-relaxed">
            "{sampleText}"
          </p>
        </div>

        {/* Recording status and duration */}
        <div className="text-center">
          {recordingState === 'recording' ? (
            <div className="space-y-2">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-mono">{recordingTime.toFixed(1)}s</span>
                <span className="text-xs text-gray-400">/ {targetDuration}s min</span>
              </div>
              <Progress 
                value={(recordingTime / targetDuration) * 100} 
                className="w-full h-1 bg-gray-700"
              />
              <p className="text-xs text-gray-400">Hold to record • Release to stop</p>
            </div>
          ) : tempRecording ? (
            <div className="space-y-2">
              <div className="text-sm font-mono">
                Recording: {tempRecording.duration.toFixed(1)}s
              </div>
              <div className="text-xs text-gray-400">
                {tempRecording.duration >= 5 ? 
                  "Ready to save ✓" : 
                  `Need ${(5 - tempRecording.duration).toFixed(1)}s more`
                }
              </div>
            </div>
          ) : isRecorded && recordedSample ? (
            <div className="text-sm text-green-400">
              ✓ Sample recorded
            </div>
          ) : (
            <div className="text-xs text-gray-400">
              Hold button to record • Minimum {targetDuration}s
            </div>
          )}
        </div>

        {/* Control buttons */}
        <div className="flex items-center justify-center space-x-3">
          {/* Microphone button - radio style */}
          <button
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            disabled={disabled || isLocked || recordingState === 'saving'}
            className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 select-none",
              recordingState === 'recording' 
                ? "bg-red-600 hover:bg-red-700 scale-110 shadow-lg shadow-red-500/50" 
                : tempRecording 
                ? "bg-gray-600 hover:bg-gray-700"
                : "bg-blue-600 hover:bg-blue-700",
              (disabled || isLocked) && "opacity-50 cursor-not-allowed"
            )}
          >
            <Mic className="w-5 h-5 text-white" />
          </button>

          {/* Play button for recorded sample */}
          {(tempRecording || (isRecorded && recordedSample)) && (
            <button
              onClick={tempRecording ? playTempRecording : playExistingRecording}
              disabled={isPlaying}
              className="w-10 h-10 rounded-full bg-green-600 hover:bg-green-700 disabled:opacity-50 flex items-center justify-center transition-all duration-200"
            >
              <Play className="w-4 h-4 text-white ml-0.5" />
            </button>
          )}

          {/* Save button for temp recording */}
          {tempRecording && (
            <button
              onClick={saveRecording}
              disabled={tempRecording.duration < 5 || recordingState === 'saving'}
              className="w-10 h-10 rounded-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center transition-all duration-200"
            >
              {recordingState === 'saving' ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Save className="w-4 h-4 text-white" />
              )}
            </button>
          )}

          {/* Re-record button for temp recording */}
          {tempRecording && (
            <button
              onClick={discardRecording}
              className="w-10 h-10 rounded-full bg-gray-600 hover:bg-gray-700 flex items-center justify-center transition-all duration-200"
            >
              <RotateCcw className="w-4 h-4 text-white" />
            </button>
          )}
        </div>

        {/* Error display */}
        {micError && (
          <div className="text-center">
            <p className="text-red-400 text-xs">{micError}</p>
          </div>
        )}
      </div>
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
      
      <CardContent>
        {/* Recording interface with black panel */}
        {renderRecordingInterface()}
      </CardContent>
    </Card>
  );
}