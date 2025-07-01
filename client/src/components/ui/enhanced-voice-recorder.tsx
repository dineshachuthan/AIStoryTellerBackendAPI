import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { Mic, Play, RotateCcw, Save, Radio, Volume2, CheckCircle, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AUDIO_PROCESSING_CONFIG } from "../../../../shared/audio-config";

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
  // Optional context for voice samples
  sampleText?: string;
  emotionName?: string;
  intensity?: number;
  isLocked?: boolean;
  // Optional existing recording display
  recordedSample?: {
    audioUrl: string;
    recordedAt: Date;
    duration?: number;
  };
  onPlaySample?: (audioUrl: string) => void;
  onSaveSample?: () => void;
  // Simple mode for narrative analysis
  simpleMode?: boolean;
  title?: string;
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
  sampleText,
  emotionName,
  intensity,
  isLocked = false,
  recordedSample,
  onPlaySample,
  onSaveSample,
  simpleMode = false,
  title
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
  const holdDelayRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const formatTime = (seconds: number) => {
    return `${seconds.toString().padStart(2, '0')}s`;
  };

  // Calculate if we have a recording (either new temp recording or existing)
  const hasRecording = !!tempRecording || !!recordedSample;

  // Get the current recording URL for playback
  const currentRecordingUrl = tempRecording?.url || recordedSample?.audioUrl;

  const progressPercentage = (recordingTime / maxRecordingTime) * 100;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (holdDelayRef.current) clearTimeout(holdDelayRef.current);
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
      
      // Use requestAnimationFrame to prevent flickering during state transition
      requestAnimationFrame(() => {
        setTempRecording({ blob: audioBlob, url: audioUrl });
        setRecordingState('recorded');
      });
      
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
    
    // Smooth transition for equalizer before stopping
    if (equalizerIntervalRef.current) {
      clearInterval(equalizerIntervalRef.current);
      // Gradually reduce equalizer bars to prevent abrupt stop
      setTimeout(() => {
        setEqualizerBars(Array(8).fill(1));
      }, 100);
    }
    
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
    if (!recordedSample?.audioUrl) return;
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsPlayingExisting(false);
    }

    audioRef.current = new Audio(recordedSample.audioUrl);
    audioRef.current.onended = () => setIsPlayingExisting(false);
    audioRef.current.onerror = () => setIsPlayingExisting(false);
    audioRef.current.play().catch(() => setIsPlayingExisting(false));
    setIsPlayingExisting(true);
    
    if (onPlaySample) {
      onPlaySample(recordedSample.audioUrl);
    }
  };



  const saveRecording = () => {
    if (tempRecording) {
      // Optimistic update - immediately show saved state to prevent flickering
      const blob = tempRecording.blob;
      const url = tempRecording.url;
      
      setTempRecording(null);
      setRecordingState('idle');
      setRecordingTime(0);
      setCountdownTime(3);
      
      // Then trigger the actual save
      if (onSaveSample) {
        onSaveSample();
      }
      onRecordingComplete(blob, url);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    if (disabled) return;
    if (recordingState !== 'idle' && recordingState !== 'recorded') return;
    
    // Reset temp recording if re-recording
    if (tempRecording) {
      URL.revokeObjectURL(tempRecording.url);
      setTempRecording(null);
    }
    
    // Add 300ms hold delay before starting countdown
    holdDelayRef.current = setTimeout(() => {
      startCountdown();
    }, 300);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Clear hold delay if user releases before 300ms
    if (holdDelayRef.current) {
      clearTimeout(holdDelayRef.current);
      holdDelayRef.current = null;
    }
    
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
    if (disabled) return;
    if (recordingState !== 'idle' && recordingState !== 'recorded') return;
    
    // Reset temp recording if re-recording
    if (tempRecording) {
      URL.revokeObjectURL(tempRecording.url);
      setTempRecording(null);
    }
    
    // Add 300ms hold delay before starting countdown
    holdDelayRef.current = setTimeout(() => {
      startCountdown();
    }, 300);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    
    // Clear hold delay if user releases before 300ms
    if (holdDelayRef.current) {
      clearTimeout(holdDelayRef.current);
      holdDelayRef.current = null;
    }
    
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
        {/* Radio/TV Style Voice Recorder Panel - Dynamic background for recorded samples */}
        <div className={`rounded-2xl p-4 shadow-2xl border h-[380px] flex flex-col overflow-hidden ${
          hasRecording 
            ? 'bg-gradient-to-br from-blue-900/70 to-purple-900/70 border-blue-500/50' 
            : 'bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700'
        }`}>
        
        {/* Header with Emotion Info */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <Radio className="w-5 h-5 text-red-400 mr-2" />
            <div className="flex items-center gap-2">
              {hasRecording ? (
                <CheckCircle className="w-4 h-4 text-green-400" />
              ) : (
                <Circle className="w-4 h-4 text-gray-400" />
              )}
              <span className="text-sm font-medium text-gray-300">
                {emotionName || 'Voice Recorder'}
              </span>
              {isLocked && (
                <Badge variant="outline" className="text-xs text-orange-400 border-orange-400">
                  🔒 Locked
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {intensity && (
              <Badge variant="outline" className="text-xs text-blue-400 border-blue-400">
                {intensity}/10
              </Badge>
            )}
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

        {/* Main Recording Display - Flexible container */}
        <div className="bg-black rounded-lg p-4 border border-gray-600 flex-1 flex flex-col">
          {/* Title and Instructions */}
          {!simpleMode && sampleText && (
            <div className="text-blue-300 text-xs font-medium mb-2 text-left tracking-wide">
              📖 {emotionName ? `Read this text with ${emotionName.toLowerCase()} emotion` : 'Read this text aloud'}
            </div>
          )}
          {simpleMode && title && (
            <div className="text-blue-300 text-xs font-medium mb-2 text-left tracking-wide">
              🎙️ {title}
            </div>
          )}
          
          {/* Static Progress Bar - Always visible */}
          <div className="mb-2">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>{recordingState === 'recording' ? formatTime(recordingTime) : '00:00'}</span>
              <span>{formatTime(maxRecordingTime)}</span>
            </div>
            <Progress 
              value={recordingState === 'recording' ? progressPercentage : 0} 
              className="h-1 bg-gray-700" 
            />
          </div>
          
          <div className="flex items-start space-x-4">
            
            {/* Recording Button */}
            <div className="flex flex-col items-center mb-2">
              <div className="relative mb-1">
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

                {recordingState === 'recorded' && (
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
                      <p>Hold to re-record voice sample</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              
              {/* Instructions under mic - Fixed height to prevent flickering */}
              <div className="text-xs text-gray-400 text-center leading-tight h-6 flex items-center justify-center">
                {recordedSample || tempRecording ? (
                  <div>
                    Hold to<br />re-record
                  </div>
                ) : (
                  <div>
                    Hold to<br />record
                  </div>
                )}
              </div>
            </div>

            {/* Sample Text Display */}
            <div className="flex-1">
              <div className="text-white text-sm leading-relaxed">
                <span className="italic text-blue-200">
                  "{(sampleText && sampleText.length > 150 ? sampleText.substring(0, 150) + '...' : sampleText) || 'Sample text not provided'}"
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed bottom section for recorded sample info and controls */}
        <div className="mt-2">
          {/* Recorded Sample Info and Controls - Fixed height section */}
          <div className="h-10 mb-2">
            {recordedSample && (
              <div className="p-2 bg-gray-900 border border-gray-600 rounded-md h-full">
                <div className="flex items-center gap-2 text-xs h-full">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onPlaySample?.(recordedSample.audioUrl)}
                    className="h-6 w-6 p-0 shrink-0 text-green-400 hover:text-green-300"
                  >
                    <Play className="w-3 h-3" />
                  </Button>
                  
                  <div className="text-gray-300 flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span>{recordedSample.duration ? `${recordedSample.duration}s` : 'Unknown'}</span>
                      <span className="text-gray-500">•</span>
                      <span className="truncate">{recordedSample.recordedAt.toLocaleDateString()}</span>
                    </div>
                  </div>


                </div>
              </div>
            )}
          </div>

          {/* Control Buttons with Tooltips - Compact at bottom */}
          <div className="flex gap-2 justify-center">
              {/* Single Play button - prioritizes new recording over existing */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={tempRecording ? playTempRecording : playExistingRecording}
                    disabled={!tempRecording && !existingRecording || isPlayingTemp || isPlayingExisting}
                    variant="outline"
                    size="sm"
                    className="bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-50 flex-1 max-w-[100px]"
                  >
                    <Play className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{tempRecording ? "Play new recording" : recordedSample ? "Play saved recording" : "No recording to play"}</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={saveRecording}
                    disabled={!tempRecording || isPlayingTemp}
                    variant="default"
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 disabled:opacity-50 flex-1 max-w-[100px]"
                  >
                    <Save className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{existingRecording ? "Save new recording" : "Save recording"}</p>
                </TooltipContent>
              </Tooltip>
            </div>
        </div>
        </div>
      </div>
    </TooltipProvider>
  );
}