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
import { VOICE_RECORDING_CONFIG } from "@shared/voice-recording-config";

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
  maxRecordingTime = VOICE_RECORDING_CONFIG.MAX_DURATION,
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
  const [lastSavedDuration, setLastSavedDuration] = useState<number | null>(null);
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
        console.log(`🎙️ Audio chunk received: ${event.data.size} bytes (total chunks: ${audioChunksRef.current.length})`);
      } else {
        console.warn('⚠️ Empty audio chunk received!');
      }
    };

    mediaRecorderRef.current.onstop = async () => {
      // Log debugging info for corruption investigation
      console.log(`🎤 Recording stopped:
        - Chunks collected: ${audioChunksRef.current.length}
        - Total size: ${audioChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0)} bytes
        - MIME type: ${mediaRecorderRef.current?.mimeType || 'audio/webm'}
        - MediaRecorder state: ${mediaRecorderRef.current?.state}
      `);
      
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

    // Ensure URL has leading slash for proper static file access
    const audioUrl = recordedSample.audioUrl.startsWith('/') 
      ? recordedSample.audioUrl 
      : `/${recordedSample.audioUrl}`;
    
    console.log('🎵 Playing audio from:', audioUrl);
    
    audioRef.current = new Audio(audioUrl);
    audioRef.current.onended = () => setIsPlayingExisting(false);
    audioRef.current.onerror = (error) => {
      console.error('❌ Audio playback error:', error);
      setIsPlayingExisting(false);
    };
    audioRef.current.play().catch((error) => {
      console.error('❌ Audio play failed:', error);
      setIsPlayingExisting(false);
    });
    setIsPlayingExisting(true);
    
    if (onPlaySample) {
      onPlaySample(audioUrl);
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
      // Log save details for corruption investigation
      console.log(`💾 Saving voice sample:
        - Blob size: ${tempRecording.blob.size} bytes
        - Blob type: ${tempRecording.blob.type}
        - Duration: ${audioDuration.toFixed(1)}s
        - Endpoint: ${saveConfig.endpoint}
      `);
      
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

      // Success - store duration before clearing tempRecording
      if (tempRecording?.duration) {
        setLastSavedDuration(tempRecording.duration);
      }
      
      // Cleanup temp recording URL
      if (tempRecording) {
        URL.revokeObjectURL(tempRecording.url);
      }
      
      // Reset to fully idle state
      setRecordingState('idle');
      setTempRecording(null);
      setRecordingTime(0);
      setCountdownTime(3);
      setSaveError(null);
      
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
    icon: isLocked ? <Lock className="w-4 h-4 text-blue-400" /> 
          : (isRecorded || recordedSample || recordingState === 'saved') ? <Unlock className="w-4 h-4 text-green-400" />
          : <Unlock className="w-4 h-4 text-gray-300" />,
    label: isLocked ? UIMessages.getLabel('VOICE_SAMPLE_LOCKED')
           : (isRecorded || recordedSample || recordingState === 'saved') ? UIMessages.getSuccess('VOICE_SAMPLE_RECORDED')
           : UIMessages.getLabel('VOICE_SAMPLE_NEEDED'),
    description: isLocked ? UIMessages.getInfo('VOICE_SAMPLE_CLONING_DESCRIPTION')
                 : (isRecorded || recordedSample || recordingState === 'saved') ? UIMessages.getSuccess('VOICE_SAMPLE_READY_DESCRIPTION')
                 : UIMessages.getInfo('VOICE_SAMPLE_RECORD_DESCRIPTION')
  };

  return (
    <TooltipProvider>
      <div className={`w-full max-w-lg mx-auto ${className}`}>
        {/* Radio/TV Style Voice Recorder Panel - Dynamic background for three states */}
        <div className={`rounded-2xl p-4 shadow-2xl border flex flex-col ${
          isLocked 
            ? 'bg-gradient-to-br from-blue-900/80 to-indigo-900/80 border-blue-400/60' 
            : (isRecorded || recordedSample || recordingState === 'saved')
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
          <div className="ml-auto">
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
          {sampleText && (
            <div className="text-blue-300 text-xs font-medium mb-2 text-left tracking-wide">
              📖 {emotionName ? `Talk anything with ${emotionName.toLowerCase()} tone for ${VOICE_RECORDING_CONFIG.MAX_DURATION} seconds or use the helper text to record your tone` : 'Talk anything for 25 seconds or use the helper text below'}
            </div>
          )}
          
          {/* Sample Text Display */}
          {sampleText && (
            <div className="bg-gray-900 rounded p-3 mb-3 border-l-2 border-blue-400">
              <p className="text-gray-200 text-sm leading-relaxed">
                {sampleText}
              </p>
            </div>
          )}
          {simpleMode && title && !sampleText && (
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
                  : tempRecording?.duration 
                    ? (tempRecording.duration >= 5 ? "text-green-400" : "text-red-400")
                    : recordedSample?.duration 
                      ? (recordedSample.duration >= 5 ? "text-green-400" : "text-red-400")
                      : "text-gray-400"
              )}>
                {recordingState === 'recording' 
                  ? `${formatTime(recordingTime)} / ${formatTime(maxRecordingTime)} ${recordingTime >= 5 ? "✓" : ""}`
                  : recordingState === 'saved' && lastSavedDuration
                    ? `${lastSavedDuration.toFixed(1)}s ${lastSavedDuration >= 5 ? "✓" : "⚠️"}`
                    : tempRecording?.duration 
                      ? `${tempRecording.duration.toFixed(1)}s ${tempRecording.duration >= 5 ? "✓" : "⚠️"}`
                      : recordedSample?.duration 
                        ? `${parseFloat(recordedSample.duration).toFixed(1)}s ${parseFloat(recordedSample.duration) >= 5 ? "✓" : "⚠️"}`
                        : `${formatTime(maxRecordingTime)} max`
                }
              </span>
            </div>
            
            {/* Progress Bar with Minimum Length Indicator */}
            <div className="relative">
              <Progress 
                value={recordingState === 'recording' ? progressPercentage : 
                       recordingState === 'saved' && lastSavedDuration ? Math.min((lastSavedDuration / maxRecordingTime) * 100, 100) :
                       tempRecording?.duration ? Math.min((tempRecording.duration / maxRecordingTime) * 100, 100) :
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
          
          {/* All Control Buttons in Single Row */}
          <div className="flex gap-3 justify-center items-center">
            {/* Hold to Record Button */}
            <div className="flex flex-col items-center">
              <div className="relative">
                {recordingState === 'idle' && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onMouseDown={handleMouseDown}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onTouchStart={handleTouchStart}
                        onTouchEnd={handleTouchEnd}
                        disabled={disabled || isLocked}
                        className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 disabled:bg-gray-600 flex items-center justify-center text-white transition-all duration-200 select-none touch-manipulation shadow-lg hover:shadow-red-500/25"
                      >
                        <Mic className="w-6 h-6" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{isLocked ? 'Voice is locked and cannot be re-recorded' : 'Hold to record voice sample'}</p>
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

                {(recordingState === 'recorded' || recordingState === 'saved') && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onMouseDown={handleMouseDown}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onTouchStart={handleTouchStart}
                        onTouchEnd={handleTouchEnd}
                        disabled={disabled || isLocked}
                        className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 disabled:bg-gray-600 flex items-center justify-center text-white transition-all duration-200 select-none touch-manipulation shadow-lg hover:shadow-red-500/25"
                      >
                        <Mic className="w-6 h-6" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{isLocked ? 'Voice is locked and cannot be re-recorded' : 'Hold to re-record voice sample'}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              
              {/* Instructions under mic - Fixed height to prevent flickering */}
              <div className="text-xs text-gray-400 text-center leading-tight h-6 flex items-center justify-center mt-1">
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

            {/* Play Button */}
            <div className="flex flex-col items-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={tempRecording ? playTempRecording : playExistingRecording}
                    disabled={!tempRecording && !recordedSample || isPlayingTemp || isPlayingExisting || isLocked}
                    variant="outline"
                    size="sm"
                    className="bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-50 w-16 h-16 rounded-full"
                  >
                    <Play className="w-6 h-6" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{tempRecording ? UIMessages.getTooltip('VOICE_RECORDER_PLAY_NEW') : recordedSample ? UIMessages.getTooltip('VOICE_RECORDER_PLAY_SAVED') : UIMessages.getTooltip('VOICE_RECORDER_NO_RECORDING')}</p>
                </TooltipContent>
              </Tooltip>
              <div className="text-xs text-gray-400 text-center leading-tight h-6 flex items-center justify-center mt-1">
                Play
              </div>
            </div>
            
            {/* Save Button */}
            {saveConfig && (
              <div className="flex flex-col items-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleSaveRecording}
                      disabled={!tempRecording || recordingState === 'saving' || isPlayingTemp || isLocked}
                      variant="default"
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 disabled:opacity-50 w-16 h-16 rounded-full"
                    >
                      {recordingState === 'saving' ? (
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      ) : (
                        <Save className="w-6 h-6" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{recordingState === 'saving' ? 'Saving...' : !tempRecording ? 'Record audio first' : 'Save recording'}</p>
                  </TooltipContent>
                </Tooltip>
                <div className="text-xs text-gray-400 text-center leading-tight h-6 flex items-center justify-center mt-1">
                  Save
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
    </TooltipProvider>
  );
}