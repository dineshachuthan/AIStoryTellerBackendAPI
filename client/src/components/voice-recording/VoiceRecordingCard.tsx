import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Mic, Play, Pause, CheckCircle, RotateCcw, Volume2, Save, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
// Toast removed - using in-card status messages

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

// Recording states for user verification workflow
type RecordingState = 'idle' | 'recording' | 'recorded' | 'playing' | 'saving' | 'saved';

interface TempRecording {
  blob: Blob;
  url: string;
  duration: number;
}

export function VoiceRecordingCard({
  template,
  recordedSample,
  isRecorded,
  onRecord,
  onPlayRecorded,
  className
}: VoiceRecordingCardProps) {
  // Always start with idle state to allow re-recording
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [tempRecording, setTempRecording] = useState<TempRecording | null>(null);
  const [isPlayingTemp, setIsPlayingTemp] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  // Toast removed - using in-card status messages
  
  // Recording refs - following the proven PressHoldRecorder pattern
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

  // Recording functions using proven PressHoldRecorder pattern
  const startHoldTimer = () => {
    if (recordingState !== 'idle') return;
    
    // Clear any previous errors
    setMicError(null);
    setSaveError(null);
    setRecordingState('recording');
    
    // Start recording after 300ms hold delay
    holdTimerRef.current = setTimeout(async () => {
      try {
        // Use proven microphone settings from PressHoldRecorder
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            sampleRate: 44100,
            channelCount: 1
          }
        });
        
        // Try best available format
        let mimeType = 'audio/webm';
        const preferredFormats = ['audio/webm; codecs=opus', 'audio/mp4', 'audio/ogg'];
        for (const format of preferredFormats) {
          if (MediaRecorder.isTypeSupported(format)) {
            mimeType = format;
            break;
          }
        }
        
        const mediaRecorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
          const url = URL.createObjectURL(audioBlob);
          
          // Only proceed if recording is at least 1 second
          if (recordingTime >= 1) {
            // Store temporary recording for user verification
            setTempRecording({
              blob: audioBlob,
              url: url,
              duration: recordingTime
            });
            
            setRecordingState('recorded'); // Go to verification state
          } else {
            // Recording too short - go back to idle
            setRecordingState('idle');
            URL.revokeObjectURL(url);
          }
          
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        setIsRecording(true);
        setRecordingTime(0);

        // Start timer
        timerRef.current = setInterval(() => {
          setRecordingTime(prev => {
            const newTime = prev + 1;
            if (newTime >= template.targetDuration + 5) { // Auto-stop after target + 5 seconds
              stopRecording();
              return newTime;
            }
            return newTime;
          });
        }, 1000);

      } catch (error) {
        console.error('Error starting recording:', error);
        setRecordingState('idle');
        setMicError('Could not access microphone. Please check your permissions.');
      }
    }, 300);
  };

  const stopRecording = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
    }
    
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  // User verification workflow functions
  const playTempRecording = () => {
    if (!tempRecording || isPlayingTemp) return;
    
    if (tempAudioRef.current) {
      tempAudioRef.current.pause();
      tempAudioRef.current.currentTime = 0;
    }
    
    const audio = new Audio(tempRecording.url);
    tempAudioRef.current = audio;
    
    audio.onplay = () => setIsPlayingTemp(true);
    audio.onpause = () => setIsPlayingTemp(false);
    audio.onended = () => setIsPlayingTemp(false);
    
    audio.play().catch(error => {
      console.error('Error playing audio:', error);
      setIsPlayingTemp(false);
    });
  };

  const stopTempRecording = () => {
    if (tempAudioRef.current) {
      tempAudioRef.current.pause();
      tempAudioRef.current.currentTime = 0;
      setIsPlayingTemp(false);
    }
  };

  const discardRecording = () => {
    if (tempRecording?.url) {
      URL.revokeObjectURL(tempRecording.url);
    }
    setTempRecording(null);
    setRecordingState('idle');
    setRecordingTime(0);
  };

  const [saveError, setSaveError] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);

  const saveRecording = async () => {
    if (!tempRecording) return;
    
    setRecordingState('saving');
    setSaveError(null);
    
    try {
      await onRecord(template.modulationKey, tempRecording.blob);
      setRecordingState('saved');
      
      // Clean up temp recording
      if (tempRecording.url) {
        URL.revokeObjectURL(tempRecording.url);
      }
      setTempRecording(null);
      
    } catch (error) {
      console.error('Error saving recording:', error);
      setSaveError('Failed to save voice sample. Please try again.');
      setRecordingState('recorded'); // Go back to recorded state
    }
  };

  const startNewRecording = () => {
    discardRecording();
    setRecordingState('idle');
  };

  // Format time helper
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = Math.min((recordingTime / template.targetDuration) * 100, 100);

  return (
    <Card className={cn(
      "transition-all duration-200 hover:shadow-lg",
      recordingState === 'saved' && "ring-2 ring-green-500 ring-opacity-50",
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              {recordingState === 'saved' ? (
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
          <Badge variant={recordingState === 'saved' ? "default" : "secondary"} className="ml-2">
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
          <div className="flex justify-between items-center mt-1">
            <p className="text-xs text-muted-foreground">
              Target: {template.targetDuration}s
            </p>
            {isRecorded && (
              <p className="text-xs text-green-600 font-medium">
                ✓ Voice sample exists
              </p>
            )}
          </div>
        </div>

        {/* Recording Progress */}
        {recordingState === 'recording' && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Recording...</span>
              <span>{formatTime(recordingTime)}</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        )}

        {/* Error Messages */}
        {micError && (
          <div className="flex items-center justify-center gap-2 text-red-600 bg-red-50 dark:bg-red-950 py-2 rounded-md">
            <span className="text-sm font-medium">{micError}</span>
          </div>
        )}

        {saveError && (
          <div className="flex items-center justify-center gap-2 text-red-600 bg-red-50 dark:bg-red-950 py-2 rounded-md">
            <span className="text-sm font-medium">{saveError}</span>
          </div>
        )}

        {/* Controls based on state */}
        {recordingState === 'idle' && (
          <div className="space-y-2">
            <Button
              size="lg"
              className="w-full h-14 text-base font-medium bg-green-600 hover:bg-green-700"
              onMouseDown={startHoldTimer}
              onMouseUp={stopRecording}
              onMouseLeave={stopRecording}
              onTouchStart={startHoldTimer}
              onTouchEnd={stopRecording}
            >
              <Mic className="w-5 h-5 mr-3" />
              Hold to Record Your Voice
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Press and hold for at least 1 second to record
            </p>
          </div>
        )}

        {recordingState === 'recording' && (
          <div className="space-y-2">
            <Button
              size="lg"
              className="w-full h-14 text-base font-medium bg-red-600 hover:bg-red-700 animate-pulse"
              onMouseUp={stopRecording}
              onMouseLeave={stopRecording}
              onTouchEnd={stopRecording}
            >
              <Mic className="w-5 h-5 mr-3 animate-pulse" />
              Release to Stop Recording
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Keep recording for at least 3 seconds for best results
            </p>
          </div>
        )}

        {recordingState === 'recorded' && tempRecording && (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 text-blue-600 bg-blue-50 dark:bg-blue-950 py-2 rounded-md">
              <Volume2 className="w-4 h-4" />
              <span className="text-sm font-medium">Test Your Recording</span>
            </div>
            
            <div className="flex gap-2">
              <Button
                size="lg"
                variant="outline"
                className="flex-1 h-12"
                onClick={isPlayingTemp ? stopTempRecording : playTempRecording}
              >
                {isPlayingTemp ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                {isPlayingTemp ? 'Stop' : 'Replay'}
              </Button>
              
              <Button
                size="lg"
                variant="outline"
                className="flex-1 h-12"
                onClick={startNewRecording}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Re-record
              </Button>
            </div>

            <Button
              size="lg"
              className="w-full h-12 bg-green-600 hover:bg-green-700"
              onClick={saveRecording}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Voice Sample
            </Button>
          </div>
        )}

        {recordingState === 'saving' && (
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2 text-blue-600 bg-blue-50 dark:bg-blue-950 py-2 rounded-md">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium">Saving Your Voice...</span>
            </div>
          </div>
        )}

        {recordingState === 'saved' && (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 text-green-600 bg-green-50 dark:bg-green-950 py-2 rounded-md">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Voice Saved Successfully</span>
            </div>
            
            {recordedSample && (
              <Button
                size="lg"
                variant="outline"
                className="w-full h-12"
                onClick={() => onPlayRecorded?.(recordedSample.audioUrl)}
              >
                <Play className="w-4 h-4 mr-2" />
                Play Your Voice
              </Button>
            )}

            <Button
              size="lg"
              variant="outline"
              className="w-full h-12"
              onClick={startNewRecording}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Record New Sample
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}