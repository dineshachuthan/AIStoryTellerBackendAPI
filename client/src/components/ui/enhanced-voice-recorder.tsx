import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { Mic, Play, RotateCcw, Save, Radio, Volume2 } from "lucide-react";
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
  existingRecording?: {
    url: string;
    recordedAt: Date;
  };
  sampleText?: string;
  emotionDescription?: string;
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
  },
  existingRecording,
  sampleText,
  emotionDescription
}: EnhancedVoiceRecorderProps) {
  const [recordingState, setRecordingState] = useState<'idle' | 'countdown' | 'recording' | 'recorded'>('idle');
  const [countdownTime, setCountdownTime] = useState(3);
  const [recordingTime, setRecordingTime] = useState(0);
  const [tempRecording, setTempRecording] = useState<{blob: Blob, url: string} | null>(null);
  const [isPlayingTemp, setIsPlayingTemp] = useState(false);
  const [isPlayingExisting, setIsPlayingExisting] = useState(false);
  const [equalizerBars, setEqualizerBars] = useState<number[]>(Array(8).fill(2));
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const equalizerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const formatTime = (seconds: number) => {
    return `${seconds.toString().padStart(2, '0')}s`;
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

  const playExistingRecording = () => {
    if (!existingRecording) return;
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsPlayingExisting(false);
    }

    audioRef.current = new Audio(existingRecording.url);
    audioRef.current.onended = () => setIsPlayingExisting(false);
    audioRef.current.play();
    setIsPlayingExisting(true);
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

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    if (disabled || recordingState !== 'idle') return;
    startCountdown();
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    e.preventDefault();
    if (recordingState === 'recording') {
      stopRecording();
    } else if (recordingState === 'countdown') {
      if (countdownRef.current) clearInterval(countdownRef.current);
      setRecordingState('idle');
      setCountdownTime(3);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    if (disabled || recordingState !== 'idle') return;
    startCountdown();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    if (recordingState === 'recording') {
      stopRecording();
    } else if (recordingState === 'countdown') {
      if (countdownRef.current) clearInterval(countdownRef.current);
      setRecordingState('idle');
      setCountdownTime(3);
    }
  };

  return (
    <TooltipProvider>
      <div className={`w-full max-w-sm mx-auto ${className}`}>
        {/* Radio/TV Style Voice Recorder Panel */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-4 shadow-2xl border border-gray-700">
        
        {/* Header with Radio Icon */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <Radio className="w-5 h-5 text-red-400 mr-2" />
            <span className="text-sm font-medium text-gray-300">Voice Recorder</span>
          </div>
          
          {/* Horizontal Equalizer Visual in Header */}
          <div className="flex items-end space-x-1 h-4">
            {[...Array(6)].map((_, i) => {
              const isActive = recordingState === 'recording' || recordingState === 'countdown';
              const baseHeight = 2;
              const maxHeight = 12;
              const animationHeight = isActive ? baseHeight + (Math.sin(Date.now() / 150 + i) + 1) * (maxHeight - baseHeight) / 2 : baseHeight;
              
              return (
                <div
                  key={i}
                  className={`w-0.5 rounded-sm transition-all duration-100 ${
                    isActive 
                      ? 'bg-gradient-to-t from-green-600 to-green-400 opacity-100' 
                      : 'bg-gray-600 opacity-40'
                  }`}
                  style={{
                    height: `${animationHeight}px`,
                    minHeight: `${baseHeight}px`
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Main Recording Display */}
        <div className="bg-black rounded-lg p-4 mb-3 border border-gray-600">
          {/* Title */}
          <div className="text-blue-300 text-sm font-semibold mb-3 text-left uppercase tracking-wide">
            📖 Read this text{emotionDescription ? ` in ${emotionDescription.toLowerCase()}` : ''}
          </div>
          
          <div className="flex items-center space-x-4">
            
            {/* Recording Button */}
            <div className="flex flex-col items-center">
              <div className="relative mb-2">
                {recordingState === 'idle' && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onMouseDown={handleMouseDown}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onTouchStart={handleTouchStart}
                        onTouchEnd={handleTouchEnd}
                        disabled={disabled}
                        className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 disabled:bg-gray-600 flex items-center justify-center text-white transition-all duration-200 select-none touch-manipulation shadow-lg hover:shadow-red-500/25"
                      >
                        <Mic className="w-6 h-6" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Hold to record voice sample</p>
                    </TooltipContent>
                  </Tooltip>
                )}

                {recordingState === 'countdown' && (
                  <div className="w-16 h-16 rounded-full bg-orange-500 flex items-center justify-center text-white text-xl font-bold select-none shadow-lg animate-pulse">
                    {countdownTime}
                  </div>
                )}

                {recordingState === 'recording' && (
                  <button
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchEnd={handleTouchEnd}
                    className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center text-white animate-pulse cursor-pointer select-none touch-manipulation shadow-lg shadow-red-500/50"
                  >
                    <Mic className="w-6 h-6" />
                  </button>
                )}
              </div>
              
              {/* Instructions under mic */}
              <div className="text-xs text-gray-400 text-center">
                {recordingState === 'idle' && buttonText.instructions}
                {recordingState === 'countdown' && "Get Ready..."}
                {recordingState === 'recording' && "Release to stop"}
                {recordingState === 'recorded' && "Recording complete"}
              </div>
            </div>

            {/* Sample Text Display */}
            <div className="flex-1">
              <div className="text-white text-sm leading-relaxed mb-2">
                <span className="italic text-blue-200">"{sampleText || 'Sample text not provided'}"</span>
              </div>

              {/* Progress Bar */}
              {recordingState === 'recording' && (
                <div className="mb-2">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>{formatTime(recordingTime)}</span>
                    <span>{formatTime(maxRecordingTime)}</span>
                  </div>
                  <Progress value={progressPercentage} className="h-2 bg-gray-700" />
                </div>
              )}
              
              {recordingState === 'recorded' && (
                <div className="text-green-400 text-sm">
                  ✓ Recorded {formatTime(recordingTime)} seconds
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Control Buttons with Tooltips */}
        <div className="grid grid-cols-4 gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={playTempRecording}
                  disabled={!tempRecording || isPlayingTemp}
                  variant="outline"
                  size="sm"
                  className="bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-50"
                >
                  <Play className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Play new recording</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={reRecord}
                  disabled={recordingState === 'recording' || recordingState === 'countdown' || isPlayingTemp || isPlayingExisting}
                  variant="outline"
                  size="sm"
                  className="bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-50"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{existingRecording ? "Re-record" : "Record again"}</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={playExistingRecording}
                  disabled={!existingRecording || isPlayingExisting}
                  variant="outline"
                  size="sm"
                  className="bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-50"
                >
                  <Volume2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Play saved recording</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={saveRecording}
                  disabled={!tempRecording || isPlayingTemp}
                  variant="default"
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{existingRecording ? "Save new recording" : "Save recording"}</p>
              </TooltipContent>
            </Tooltip>
          </div>

        {/* Status Indicator Lights */}
        <div className="flex justify-center space-x-2 mt-3">
          <div className={`w-2 h-2 rounded-full ${recordingState === 'recording' ? 'bg-red-500 animate-pulse' : 'bg-gray-600'}`}></div>
          <div className={`w-2 h-2 rounded-full ${(tempRecording || existingRecording) ? 'bg-green-500' : 'bg-gray-600'}`}></div>
          <div className={`w-2 h-2 rounded-full ${(isPlayingTemp || isPlayingExisting) ? 'bg-blue-500 animate-pulse' : 'bg-gray-600'}`}></div>
        </div>
        </div>
      </div>
    </TooltipProvider>
  );
}