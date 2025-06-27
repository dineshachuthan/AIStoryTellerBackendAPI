import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Mic, MicOff } from "lucide-react";
import { AUDIO_PROCESSING_CONFIG } from "@shared/audio-config";

interface PressHoldRecorderProps {
  onRecordingComplete: (audioBlob: Blob, audioUrl: string) => void;
  maxRecordingTime?: number; // in seconds
  disabled?: boolean;
  className?: string;
  buttonText?: {
    hold: string;
    recording: string;
    instructions: string;
  };
}

export function PressHoldRecorder({
  onRecordingComplete,
  maxRecordingTime = 300, // 5 minutes default
  disabled = false,
  className = "",
  buttonText = {
    hold: "Hold",
    recording: "Release",
    instructions: "Press and hold to record"
  }
}: PressHoldRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = (recordingTime / maxRecordingTime) * 100;

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    };
  }, []);

  const startHoldTimer = () => {
    if (disabled) return;
    
    setIsHolding(true);
    
    // Start recording after a brief hold delay (300ms)
    holdTimerRef.current = setTimeout(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        
        console.log('Microphone stream obtained:', {
          active: stream.active,
          audioTracks: stream.getAudioTracks().length,
          trackSettings: stream.getAudioTracks()[0]?.getSettings()
        });
        // Try to use the best available format from configuration
        let mimeType = AUDIO_PROCESSING_CONFIG.fallbackRecordingFormat;
        for (const format of AUDIO_PROCESSING_CONFIG.preferredRecordingFormats) {
          if (MediaRecorder.isTypeSupported(format)) {
            mimeType = format;
            console.log(`Using preferred audio format: ${format}`);
            break;
          }
        }
        
        if (mimeType === AUDIO_PROCESSING_CONFIG.fallbackRecordingFormat) {
          console.log(`Using fallback audio format: ${mimeType}`);
        }
        
        const mediaRecorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];
        
        // Add audio level monitoring to detect if microphone is actually picking up sound
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        source.connect(analyser);
        
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        const checkAudioLevel = () => {
          if (mediaRecorderRef.current?.state === 'recording') {
            analyser.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
            if (average > 0) {
              console.log(`Audio level detected: ${average.toFixed(2)}`);
            }
            setTimeout(checkAudioLevel, 500);
          }
        };
        checkAudioLevel();

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          // Use the actual MIME type that MediaRecorder supports
          const actualMimeType = mediaRecorder.mimeType || 'audio/webm';
          const audioBlob = new Blob(audioChunksRef.current, { type: actualMimeType });
          console.log(`Audio blob created:`, {
            size: audioBlob.size,
            type: audioBlob.type,
            chunks: audioChunksRef.current.length
          });
          
          const url = URL.createObjectURL(audioBlob);
          onRecordingComplete(audioBlob, url);
          
          // Clean up stream
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        setIsRecording(true);
        setRecordingTime(0);

        // Start timer
        timerRef.current = setInterval(() => {
          setRecordingTime(prev => {
            if (prev >= maxRecordingTime) {
              stopRecording();
              return prev;
            }
            return prev + 1;
          });
        }, 1000);

        // Don't show popup toast during recording - it's annoying
        // Visual feedback is provided by button color change and progress bar
      } catch (error) {
        console.error('Error starting recording:', error);
        setIsHolding(false);
        toast({
          title: "Error",
          description: "Could not access microphone. Please check your permissions.",
          variant: "destructive",
        });
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
    
    setIsHolding(false);
  };

  return (
    <div className={`text-center space-y-4 ${className}`}>
      <div className="space-y-4">
        <Button
          onMouseDown={(e) => {
            e.preventDefault();
            if (!isHolding && !isRecording) {
              startHoldTimer();
            }
          }}
          onMouseUp={(e) => {
            e.preventDefault();
            stopRecording();
          }}
          onMouseLeave={(e) => {
            e.preventDefault();
            stopRecording();
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            if (!isHolding && !isRecording) {
              startHoldTimer();
            }
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            stopRecording();
          }}
          onContextMenu={(e) => e.preventDefault()}
          className={`h-20 w-20 rounded-full text-white font-semibold transition-all ${
            isRecording 
              ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
              : isHolding
              ? 'bg-yellow-600 hover:bg-yellow-700'
              : 'bg-green-600 hover:bg-green-700'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          size="lg"
          disabled={disabled}
        >
          {isRecording ? (
            <div className="flex flex-col items-center">
              <MicOff className="w-8 h-8 mb-1" />
              <span className="text-xs">{buttonText.recording}</span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <Mic className="w-8 h-8 mb-1" />
              <span className="text-xs">{buttonText.hold}</span>
            </div>
          )}
        </Button>

        {/* Instructions */}
        <div className="text-sm text-gray-300 space-y-1">
          <p className="font-medium">
            {isRecording ? "🎙️ Recording... Release to stop" : buttonText.instructions}
          </p>
          <p className="text-xs text-gray-500">
            Maximum recording time: {formatTime(maxRecordingTime)}
          </p>
          {!isRecording && (
            <p className="text-xs text-blue-400 mt-2">
              💡 Tip: Speak clearly and record for at least 3-5 seconds for best results
            </p>
          )}
        </div>

        {/* Recording Progress (only show when recording) */}
        {isRecording && (
          <div className="space-y-2">
            <div className="text-lg font-mono text-red-400">
              {formatTime(recordingTime)} / {formatTime(maxRecordingTime)}
            </div>
            <Progress value={progressPercentage} className="w-full" />
            {recordingTime < 3 && (
              <p className="text-xs text-yellow-400 animate-pulse">
                Keep recording for at least 3 seconds for good transcription...
              </p>
            )}
            {recordingTime >= 3 && recordingTime < 10 && (
              <p className="text-xs text-green-400">
                Good! You can release now or continue for longer content.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}