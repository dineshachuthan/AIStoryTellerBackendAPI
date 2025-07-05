import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { Mic, Play, RotateCcw, Save, Radio, Volume2, CheckCircle, Circle, Lock, Unlock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AUDIO_PROCESSING_CONFIG } from "../../../../shared/audio-config";
import { apiRequest } from "@/lib/queryClient";
import { UIMessages } from "@shared/i18n-config";

interface EnhancedVoiceRecorderProps {
  onRecordingComplete?: (audioBlob: Blob, audioUrl: string) => void;
  maxRecordingTime?: number;
  disabled?: boolean;
  className?: string;
  buttonText?: {
    hold: string;
    recording: string;
    instructions: string;
  };
  // Voice sample context and save configuration
  sampleText?: string;
  emotionName?: string;
  intensity?: number;
  isLocked?: boolean;
  isRecorded?: boolean;
  // Save configuration - when provided, component handles save internally
  saveConfig?: {
    endpoint: string; // API endpoint for saving
    payload: Record<string, any>; // Additional data to send with save
    minDuration: number; // Minimum recording duration in seconds
    onSaveSuccess?: (data: any) => void; // Called after successful save
    onSaveError?: (error: string) => void; // Called on save error
  };
  // Optional existing recording display
  recordedSample?: {
    audioUrl: string;
    recordedAt: Date;
    duration?: number;
  };
  onPlaySample?: (audioUrl: string) => void;
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
    hold: UIMessages.getLabel('VOICE_RECORDER_HOLD_TO_RECORD'),
    recording: UIMessages.getLabel('VOICE_RECORDER_RECORDING'),
    instructions: UIMessages.getLabel('VOICE_RECORDER_INSTRUCTIONS')
  },
  sampleText,
  emotionName,
  intensity,
  isLocked = false,
  isRecorded = false,
  recordedSample,
  onPlaySample,
  saveConfig,
  simpleMode = false,
  title
}: EnhancedVoiceRecorderProps) {
  const [recordingState, setRecordingState] = useState<'idle' | 'countdown' | 'recording' | 'recorded' | 'saving' | 'saved'>('idle');
  const [countdownTime, setCountdownTime] = useState(3);
  const [recordingTime, setRecordingTime] = useState(0);
  const [tempRecording, setTempRecording] = useState<{blob: Blob, url: string, duration: number} | null>(null);
  const [isPlayingTemp, setIsPlayingTemp] = useState(false);
  const [isPlayingExisting, setIsPlayingExisting] = useState(false);
  const [equalizerBars, setEqualizerBars] = useState<number[]>(Array(8).fill(2));
  const [errorMessage, setErrorMessage] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  
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

  // Helper function to get audio duration
  const getAudioDuration = (audioBlob: Blob): Promise<number> => {
    return new Promise((resolve) => {
      const audio = new Audio();
      const url = URL.createObjectURL(audioBlob);
      
      audio.addEventListener('loadedmetadata', () => {
        URL.revokeObjectURL(url);
        resolve(audio.duration);
      });
      
      audio.addEventListener('error', () => {
        URL.revokeObjectURL(url);
        resolve(0);
      });
      
      audio.src = url;
    });
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
        title: UIMessages.getError('VOICE_RECORDER_MIC_ERROR_TITLE'),
        description: UIMessages.getError('VOICE_RECORDER_MIC_ERROR_DESCRIPTION'),
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

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { 
        type: mediaRecorderRef.current?.mimeType || 'audio/webm' 
      });
      
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Calculate duration
      const duration = await getAudioDuration(audioBlob);
      
      // Use requestAnimationFrame to prevent flickering during state transition
      requestAnimationFrame(() => {
        setTempRecording({ blob: audioBlob, url: audioUrl, duration });
        setRecordingState('recorded');
        
        // Call the optional callback if provided
        onRecordingComplete?.(audioBlob, audioUrl);
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
      
      // Call the optional callback if provided
      onRecordingComplete?.(blob, url);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    if (disabled || isLocked) return;
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
    if (disabled || isLocked) return;
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

  // Save recording function for internal save handling
  const handleSaveRecording = async () => {
    if (!tempRecording || !saveConfig) return;

    // Frontend validation: Check if audio is long enough
    const audioDuration = tempRecording.duration;
    if (audioDuration < saveConfig.minDuration) {
      setSaveError(`Recording too short: ${audioDuration.toFixed(1)}s. Need at least ${saveConfig.minDuration} seconds for voice cloning.`);
      return;
    }

    // Set saving state
    setRecordingState('saving');
    setSaveError(null);

    try {
      // Prepare form data
      const formData = new FormData();
      formData.append('audio', tempRecording.blob, 'voice-sample.mp3');
      
      // Add additional payload data
      Object.entries(saveConfig.payload).forEach(([key, value]) => {
        formData.append(key, String(value));
      });

      // Make API call
      const response = await apiRequest(saveConfig.endpoint, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      // Success
      setRecordingState('saved');
      setTempRecording(null);
      saveConfig.onSaveSuccess?.(response);
    } catch (error: any) {
      // Error
      setRecordingState('recorded');
      setSaveError(error.message || 'Failed to save voice sample');
      saveConfig.onSaveError?.(error.message || 'Failed to save voice sample');
    }
  };

  // Status configuration for visual indicators
  const statusConfig = {
    icon: isLocked ? <Lock className="w-3 h-3 text-blue-400" /> 
          : (isRecorded || recordedSample) ? <CheckCircle className="w-3 h-3 text-green-400" />
          : <Circle className="w-3 h-3 text-gray-400" />,
    label: isLocked ? UIMessages.getLabel('VOICE_SAMPLE_LOCKED')
           : (isRecorded || recordedSample) ? UIMessages.getSuccess('VOICE_SAMPLE_RECORDED')
           : UIMessages.getLabel('VOICE_SAMPLE_NEEDED'),
    description: isLocked ? UIMessages.getInfo('VOICE_SAMPLE_CLONING_DESCRIPTION')
                 : (isRecorded || recordedSample) ? UIMessages.getSuccess('VOICE_SAMPLE_READY_DESCRIPTION')
                 : UIMessages.getInfo('VOICE_SAMPLE_RECORD_DESCRIPTION')
  };

  return (
    <TooltipProvider>
      <div className={`w-full max-w-sm mx-auto ${className}`}>
        {/* Radio/TV Style Voice Recorder Panel - Dynamic background for three states */}
        <div className={`rounded-2xl p-4 shadow-2xl border flex flex-col ${
          isLocked 
            ? 'bg-gradient-to-br from-blue-900/80 to-indigo-900/80 border-blue-400/60' 
            : (isRecorded || recordedSample)
              ? 'bg-gradient-to-br from-green-900/70 to-emerald-900/70 border-green-500/50'
              : 'bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700'
        }`}>
        
        {/* Header with Emotion Info */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-help">
                  {statusConfig.icon}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p><strong>{statusConfig.label}</strong></p>
                <p className="text-sm text-gray-400">{statusConfig.description}</p>
              </TooltipContent>
            </Tooltip>
            <span className="text-sm font-medium text-gray-300">
              {emotionName && emotionName.length > 20 ? emotionName.substring(0, 20) + '...' : emotionName || 'Voice Recorder'}
            </span>
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
          
          {/* Duration Status with Progress Bar */}
          <div className="mb-3 space-y-2">
            <div className="flex justify-between text-xs text-gray-400">
              <span>Duration:</span>
              <span className={cn(
                recordingState === 'recording' ? 
                  (recordingTime >= 5 ? "text-green-400" : "text-orange-400") 
                  : recordedSample?.duration 
                    ? (recordedSample.duration >= 5 ? "text-green-400" : "text-red-400")
                    : "text-gray-400"
              )}>
                {recordingState === 'recording' 
                  ? `${formatTime(recordingTime)} / ${formatTime(maxRecordingTime)} ${recordingTime >= 5 ? "✓" : ""}`
                  : recordedSample?.duration 
                    ? `${recordedSample.duration.toFixed(1)}s ${recordedSample.duration >= 5 ? "✓" : "⚠️"}`
                    : `${formatTime(maxRecordingTime)} max`
                }
              </span>
            </div>
            
            {/* Progress Bar with Minimum Length Indicator */}
            <div className="relative">
              <Progress 
                value={recordingState === 'recording' ? progressPercentage : 
                       recordedSample?.duration ? Math.min((recordedSample.duration / maxRecordingTime) * 100, 100) : 0} 
                className="h-2 bg-gray-700"
              />
              
              {/* Minimum length indicator at 5 seconds */}
              <div 
                className="absolute top-0 h-2 w-0.5 bg-yellow-400"
                style={{ left: `${(5 / maxRecordingTime) * 100}%` }}
              />
            </div>
            
            {/* Error display section */}
            <div className="h-4 text-xs text-center">
              {saveError && (
                <span className="text-red-400">{saveError}</span>
              )}
            </div>
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


          </div>
        </div>

        {/* Recorded Sample Info - Removed duration and date display as requested */}

        {/* Control Buttons - Minimal margin */}
        <div className="mt-1 flex gap-2 justify-center">
              {/* Single Play button - prioritizes new recording over existing */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={tempRecording ? playTempRecording : playExistingRecording}
                    disabled={!tempRecording && !recordedSample || isPlayingTemp || isPlayingExisting || isLocked}
                    variant="outline"
                    size="sm"
                    className="bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-50 flex-1 max-w-[100px]"
                  >
                    <Play className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{tempRecording ? UIMessages.getTooltip('VOICE_RECORDER_PLAY_NEW') : recordedSample ? UIMessages.getTooltip('VOICE_RECORDER_PLAY_SAVED') : UIMessages.getTooltip('VOICE_RECORDER_NO_RECORDING')}</p>
                </TooltipContent>
              </Tooltip>
              
              {/* Save button only shows when saveConfig is provided and we have a temp recording */}
              {saveConfig && tempRecording && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleSaveRecording}
                      disabled={recordingState === 'saving' || isPlayingTemp || isLocked}
                      variant="default"
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 disabled:opacity-50 flex-1 max-w-[100px]"
                    >
                      {recordingState === 'saving' ? (
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{recordingState === 'saving' ? 'Saving...' : 'Save recording'}</p>
                  </TooltipContent>
                </Tooltip>
              )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}