import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Mic, Play, RotateCcw, Save } from "lucide-react";
import { AUDIO_PROCESSING_CONFIG } from "@shared/audio-config";

interface EnhancedVoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob, audioUrl: string) => void;
  maxRecordingTime?: number;
  disabled?: boolean;
  className?: string;
  buttonText?: {
    hold: string;
    recording: string;
    instructions: string;
  };
}

export function EnhancedVoiceRecorder({
  onRecordingComplete,
  maxRecordingTime = 10,
  disabled = false,
  className = "",
  buttonText = {
    hold: "Hold to Record",
    recording: "Recording...",
    instructions: "Press and hold to record"
  }
}: EnhancedVoiceRecorderProps) {
  const [recordingState, setRecordingState] = useState<'idle' | 'countdown' | 'recording' | 'recorded'>('idle');
  const [countdownTime, setCountdownTime] = useState(3);
  const [recordingTime, setRecordingTime] = useState(0);
  const [tempRecording, setTempRecording] = useState<{blob: Blob, url: string} | null>(null);
  const [isPlayingTemp, setIsPlayingTemp] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = (recordingTime / maxRecordingTime) * 100;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (tempRecording) {
        URL.revokeObjectURL(tempRecording.url);
      }
    };
  }, [tempRecording]);

  const startCountdown = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 44100
        }
      });

      setRecordingState('countdown');
      setCountdownTime(3);

      countdownRef.current = setInterval(() => {
        setCountdownTime(prev => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            startActualRecording(stream);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        title: "Microphone Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive"
      });
      setRecordingState('idle');
    }
  };

  const startActualRecording = (stream: MediaStream) => {
    audioChunksRef.current = [];
    setRecordingTime(0);
    setRecordingState('recording');

    const options = AUDIO_PROCESSING_CONFIG.preferredRecordingFormats.find((format: string) => 
      MediaRecorder.isTypeSupported(format)
    );

    mediaRecorderRef.current = new MediaRecorder(stream, { 
      mimeType: options || 'audio/webm' 
    });

    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    mediaRecorderRef.current.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, { 
        type: mediaRecorderRef.current?.mimeType || 'audio/webm' 
      });
      
      const audioUrl = URL.createObjectURL(audioBlob);
      setTempRecording({ blob: audioBlob, url: audioUrl });
      setRecordingState('recorded');
      
      stream.getTracks().forEach(track => track.stop());
    };

    mediaRecorderRef.current.start();

    timerRef.current = setInterval(() => {
      setRecordingTime(prev => {
        const newTime = prev + 1;
        if (newTime >= maxRecordingTime) {
          stopRecording();
          return maxRecordingTime;
        }
        return newTime;
      });
    }, 1000);
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const playTempRecording = () => {
    if (!tempRecording) return;
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    audioRef.current = new Audio(tempRecording.url);
    audioRef.current.onended = () => setIsPlayingTemp(false);
    audioRef.current.play();
    setIsPlayingTemp(true);
  };

  const reRecord = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsPlayingTemp(false);
    }
    
    if (tempRecording) {
      URL.revokeObjectURL(tempRecording.url);
    }
    setTempRecording(null);
    setRecordingTime(0);
    setCountdownTime(3);
    setRecordingState('idle');
  };

  const saveRecording = () => {
    if (tempRecording) {
      onRecordingComplete(tempRecording.blob, tempRecording.url);
      setTempRecording(null);
      setRecordingState('idle');
      setRecordingTime(0);
      setCountdownTime(3);
    }
  };

  const handleMouseDown = () => {
    if (disabled || recordingState !== 'idle') return;
    startCountdown();
  };

  const handleMouseUp = () => {
    if (recordingState === 'recording') {
      stopRecording();
    } else if (recordingState === 'countdown') {
      if (countdownRef.current) clearInterval(countdownRef.current);
      setRecordingState('idle');
      setCountdownTime(3);
    }
  };

  return (
    <div 
      className={`flex flex-col items-center w-full max-w-xs mx-auto ${className}`}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchEnd={handleMouseUp}
    >
      {/* Fixed Height Container - NO RESIZING */}
      <div className="h-[400px] w-full flex flex-col">
        
        {/* Recording Button - Fixed Position */}
        <div className="flex flex-col items-center space-y-4 mb-6">
          <div className="w-20 h-20 flex items-center justify-center">
            {recordingState === 'idle' && (
              <button
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleMouseDown}
                onTouchEnd={handleMouseUp}
                disabled={disabled}
                className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 disabled:bg-gray-400 flex items-center justify-center text-white transition-colors duration-200 select-none touch-manipulation"
              >
                <Mic className="w-8 h-8" />
              </button>
            )}

            {recordingState === 'countdown' && (
              <div className="w-20 h-20 rounded-full bg-orange-500 flex items-center justify-center text-white text-2xl font-bold select-none">
                {countdownTime}
              </div>
            )}

            {recordingState === 'recording' && (
              <div 
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchEnd={handleMouseUp}
                className="w-20 h-20 rounded-full bg-red-600 flex items-center justify-center text-white animate-pulse cursor-pointer select-none touch-manipulation"
              >
                <Mic className="w-8 h-8" />
              </div>
            )}
          </div>

          {/* Fixed Message Area */}
          <div className="h-12 flex items-center justify-center text-center px-4">
            {recordingState === 'idle' && (
              <p className="text-sm text-gray-600">{buttonText.instructions}</p>
            )}
            {recordingState === 'countdown' && (
              <p className="text-sm text-gray-600">Get ready...</p>
            )}
            {recordingState === 'recording' && (
              <p className="text-sm text-gray-600">Release to stop or auto-stops at {maxRecordingTime}s</p>
            )}
            {recordingState === 'recorded' && (
              <div className="text-center">
                <p className="text-sm text-gray-600">Recording complete!</p>
                <p className="text-xs text-gray-500">Duration: {formatTime(recordingTime)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar - Fixed Position */}
        <div className="h-16 flex items-center justify-center mb-6">
          {recordingState === 'recording' && (
            <div className="w-full">
              <Progress value={progressPercentage} className="h-2" />
              <div className="flex justify-between text-sm text-gray-600 mt-1">
                <span>{formatTime(recordingTime)}</span>
                <span>{formatTime(maxRecordingTime)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Always Show All 4 Buttons - Fixed Position */}
        <div className="flex-1 flex flex-col justify-center space-y-3">
          {/* Play Recording Button */}
          <Button
            onClick={playTempRecording}
            disabled={!tempRecording || isPlayingTemp}
            variant="outline"
            size="lg"
            className="w-full"
          >
            <Play className="w-5 h-5 mr-2" />
            {isPlayingTemp ? 'Playing...' : 'Play Recording'}
          </Button>
          
          {/* Action Buttons Row */}
          <div className="flex space-x-2">
            <Button
              onClick={reRecord}
              disabled={recordingState === 'recording' || recordingState === 'countdown' || isPlayingTemp}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Re-record
            </Button>
            
            <Button
              onClick={playTempRecording}
              disabled={!tempRecording || isPlayingTemp}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <Play className="w-4 h-4 mr-1" />
              Replay
            </Button>
            
            <Button
              onClick={saveRecording}
              disabled={!tempRecording || isPlayingTemp}
              variant="default"
              size="sm"
              className="flex-1"
            >
              <Save className="w-4 h-4 mr-1" />
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}