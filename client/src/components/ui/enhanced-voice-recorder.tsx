import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { Mic, Play, RotateCcw, Save, Radio, Volume2, CheckCircle, Circle, Lock, Unlock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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
  isRecorded?: boolean;
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
  isRecorded = false,
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

  // Status configuration for locked/unlocked states
  const getStatusConfig = () => {
    if (isLocked) {
      return {
        icon: <Lock className="w-4 h-4 text-blue-500" />,
        color: "blue",
        label: "Locked", 
        description: "Used for voice cloning - locked from editing"
      };
    } else if (isRecorded || recordedSample) {
      return {
        icon: <CheckCircle className="w-4 h-4 text-green-500" />,
        color: "green",
        label: "Recorded",
        description: "Sample recorded - available for voice cloning"
      };
    } else {
      return {
        icon: <Circle className="w-4 h-4 text-gray-400" />,
        color: "gray",
        label: "Empty",
        description: "No sample recorded yet"
      };
    }
  };

  const statusConfig = getStatusConfig();

  // Progress calculation
  const progressPercentage = (recordingTime / maxRecordingTime) * 100;

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (holdDelayRef.current) clearTimeout(holdDelayRef.current);
      if (equalizerIntervalRef.current) clearInterval(equalizerIntervalRef.current);
      if (tempRecording?.url) {
        URL.revokeObjectURL(tempRecording.url);
      }
    };
  }, [tempRecording]);

  const startCountdown = () => {
    setRecordingState('countdown');
    setCountdownTime(3);
    
    countdownRef.current = setInterval(() => {
      setCountdownTime(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          beginRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const beginRecording = async () => {
    try {
      // Use similar constraints to mictests.com for optimal microphone capture
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false, // Disable echo cancellation like mictests.com
          noiseSuppression: false, // Disable noise suppression like mictests.com
          autoGainControl: false,  // Disable auto gain control for raw audio
          sampleRate: 44100,      // Use CD quality sample rate
          channelCount: 1         // Mono recording
        }
      });
      
      // Try to use the best available format from configuration
      let mimeType = AUDIO_PROCESSING_CONFIG.fallbackRecordingFormat;
      for (const format of AUDIO_PROCESSING_CONFIG.preferredRecordingFormats) {
        if (MediaRecorder.isTypeSupported(format)) {
          mimeType = format;
          break;
        }
      }
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Implement microphone monitoring like mictests.com - direct audio feedback
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      
      // Store for cleanup
      (mediaRecorderRef.current as any).audioContext = audioContext;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Use the actual MIME type that MediaRecorder supports
        const actualMimeType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: actualMimeType });
        
        // Log recording results after completion
        console.log(`Audio blob created:`, {
          size: audioBlob.size,
          type: audioBlob.type,
          chunks: audioChunksRef.current.length
        });
        
        const url = URL.createObjectURL(audioBlob);
        setTempRecording({ blob: audioBlob, url });
        setRecordingState('recorded');
        setRecordingTime(0);
        
        // Clean up stream and audio context
        stream.getTracks().forEach(track => track.stop());
        if ((mediaRecorderRef.current as any)?.audioContext) {
          (mediaRecorderRef.current as any).audioContext.close();
        }
        
        // Stop equalizer animation
        if (equalizerIntervalRef.current) {
          clearInterval(equalizerIntervalRef.current);
          setEqualizerBars(Array(8).fill(2));
        }
      };

      setRecordingState('recording');
      setRecordingTime(0);
      mediaRecorder.start();

      // Start equalizer animation with real-time audio analysis
      equalizerIntervalRef.current = setInterval(() => {
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);
        
        // Convert frequency data to equalizer bars
        const barCount = 8;
        const barWidth = dataArray.length / barCount;
        const newBars = [];
        
        for (let i = 0; i < barCount; i++) {
          const start = Math.floor(i * barWidth);
          const end = Math.floor((i + 1) * barWidth);
          let sum = 0;
          for (let j = start; j < end; j++) {
            sum += dataArray[j];
          }
          const average = sum / (end - start);
          // Scale to appropriate height (2-25px)
          const height = Math.max(2, Math.min(25, (average / 255) * 25));
          newBars.push(height);
        }
        
        setEqualizerBars(newBars);
      }, 100);

      // Recording timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 0.1;
          if (newTime >= maxRecordingTime) {
            stopRecording();
            return maxRecordingTime;
          }
          return newTime;
        });
      }, 100);

    } catch (error) {
      console.error('Recording setup error:', error);
      setRecordingState('idle');
      toast({
        title: "Recording Error",
        description: "Failed to start recording. Please check microphone permissions.",
        variant: "destructive"
      });
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

  const handleMouseDown = () => {
    if (recordingState !== 'idle' || disabled || isLocked) return;
    
    // Start recording after 300ms hold delay (prevents accidental clicks)
    holdDelayRef.current = setTimeout(() => {
      startCountdown();
    }, 300);
  };

  const handleMouseUp = () => {
    // Cancel hold timer if released before 300ms
    if (holdDelayRef.current) {
      clearTimeout(holdDelayRef.current);
      holdDelayRef.current = null;
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

  const playTempRecording = () => {
    if (tempRecording?.url) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      
      const audio = new Audio(tempRecording.url);
      audioRef.current = audio;
      
      audio.onended = () => setIsPlayingTemp(false);
      audio.play();
      setIsPlayingTemp(true);
    }
  };

  const playExistingRecording = () => {
    if (recordedSample?.audioUrl) {
      if (onPlaySample) {
        onPlaySample(recordedSample.audioUrl);
      } else {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
        
        const audio = new Audio(recordedSample.audioUrl);
        audioRef.current = audio;
        
        audio.onended = () => setIsPlayingExisting(false);
        audio.play();
        setIsPlayingExisting(true);
      }
    }
  };

  const saveRecording = () => {
    if (tempRecording) {
      onRecordingComplete(tempRecording.blob, tempRecording.url);
      if (onSaveSample) {
        onSaveSample();
      }
      setTempRecording(null);
      setRecordingState('idle');
    }
  };

  const discardRecording = () => {
    if (tempRecording?.url) {
      URL.revokeObjectURL(tempRecording.url);
    }
    setTempRecording(null);
    setRecordingState('idle');
    setIsPlayingTemp(false);
  };

  const reRecord = () => {
    discardRecording();
    startCountdown();
  };

  // Simple mode for narrative analysis
  if (simpleMode) {
    return (
      <TooltipProvider>
        <div className={cn("w-full max-w-md mx-auto", className)}>
          {title && (
            <h3 className="text-lg font-semibold mb-4 text-center">{title}</h3>
          )}
          
          <div className="bg-black text-white p-6 rounded-lg space-y-4">
            <div className="text-center">
              <h4 className="text-lg font-medium mb-2">Voice Recording</h4>
              <p className="text-sm text-gray-300">{buttonText.instructions}</p>
            </div>

            {/* Recording interface */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <button
                  onMouseDown={handleMouseDown}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseLeave}
                  disabled={disabled || recordingState === 'countdown'}
                  className={cn(
                    "w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 select-none",
                    recordingState === 'recording' 
                      ? "bg-red-600 hover:bg-red-700 scale-110 shadow-lg shadow-red-500/50" 
                      : recordingState === 'countdown'
                      ? "bg-yellow-600 animate-pulse"
                      : "bg-blue-600 hover:bg-blue-700",
                    disabled && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {recordingState === 'countdown' ? (
                    <span className="text-2xl font-bold text-white">{countdownTime}</span>
                  ) : (
                    <Mic className="w-6 h-6 text-white" />
                  )}
                </button>
              </div>

              {/* Recording status */}
              {recordingState === 'recording' && (
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-mono">{formatTime(Math.floor(recordingTime))}</span>
                  </div>
                  <Progress value={progressPercentage} className="w-40 h-2" />
                </div>
              )}

              {/* Action buttons */}
              {(tempRecording || hasRecording) && (
                <div className="flex items-center justify-center space-x-3">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={tempRecording ? playTempRecording : playExistingRecording}
                        disabled={isPlayingTemp || isPlayingExisting}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Play recording</p>
                    </TooltipContent>
                  </Tooltip>

                  {tempRecording && (
                    <>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={saveRecording}
                            size="sm"
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            <Save className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Save recording</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={discardRecording}
                            size="sm"
                            variant="outline"
                            className="border-gray-400 text-gray-400"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Discard and re-record</p>
                        </TooltipContent>
                      </Tooltip>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  // Voice sample card mode with radio styling
  return (
    <TooltipProvider>
      <div className={cn("w-full", className)}>
        <div className="bg-black text-white p-4 rounded-lg">
          {/* Header with emotion name and status */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Radio className="w-4 h-4 text-blue-400" />
              <span className="font-medium">{emotionName || "Voice Sample"}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center">
                    {statusConfig.icon}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{statusConfig.description}</p>
                </TooltipContent>
              </Tooltip>
            </div>
            {intensity && (
              <Badge variant="outline" className="text-xs border-gray-400 text-gray-300">
                Intensity: {intensity}
              </Badge>
            )}
          </div>

          {/* Main content: Button on left, text on right */}
          <div className="flex items-start space-x-4">
            {/* Left: Recording button with status */}
            <div className="flex flex-col items-center space-y-2">
              <div className="relative">
                <button
                  onMouseDown={handleMouseDown}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseLeave}
                  disabled={disabled || isLocked || recordingState === 'countdown'}
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 select-none",
                    recordingState === 'recording' 
                      ? "bg-red-600 hover:bg-red-700 scale-110 shadow-lg shadow-red-500/50" 
                      : recordingState === 'countdown'
                      ? "bg-yellow-600 animate-pulse"
                      : "bg-blue-600 hover:bg-blue-700",
                    (disabled || isLocked) && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {recordingState === 'countdown' ? (
                    <span className="text-lg font-bold text-white">{countdownTime}</span>
                  ) : (
                    <Mic className="w-5 h-5 text-white" />
                  )}
                </button>
              </div>

              {/* Status indicator */}
              <div className="text-xs text-gray-400 text-center">
                {recordingState === 'recording' ? (
                  <span className="text-red-400">{formatTime(Math.floor(recordingTime))}</span>
                ) : recordingState === 'countdown' ? (
                  <span className="text-yellow-400">Get ready...</span>
                ) : isLocked ? (
                  <span className="text-blue-400">Locked</span>
                ) : tempRecording ? (
                  <span className="text-green-400">Recorded</span>
                ) : recordedSample ? (
                  <span className="text-green-400">Saved</span>
                ) : (
                  <span>Hold to record</span>
                )}
              </div>
            </div>

            {/* Right: Sample text */}
            <div className="flex-1">
              {sampleText && (
                <div className="mb-3">
                  <p className="text-sm italic text-gray-300 leading-relaxed">
                    "{sampleText}"
                  </p>
                </div>
              )}
              
              <div className="text-xs text-gray-400">
                Target: {maxRecordingTime}s • {buttonText.instructions}
              </div>

              {/* Recording progress */}
              {recordingState === 'recording' && (
                <div className="mt-2 space-y-1">
                  <Progress value={progressPercentage} className="w-full h-1" />
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>{formatTime(Math.floor(recordingTime))}</span>
                    <span>{formatTime(maxRecordingTime)}</span>
                  </div>
                </div>
              )}

              {/* Equalizer animation during recording */}
              {recordingState === 'recording' && (
                <div className="flex items-end space-x-1 mt-2 h-8">
                  {equalizerBars.map((height, index) => (
                    <div
                      key={index}
                      className="bg-blue-400 w-1 transition-all duration-100 ease-out"
                      style={{ height: `${height}px` }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bottom: Action buttons - always visible */}
          <div className="flex items-center justify-center space-x-3 mt-4">
            {/* Play button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={tempRecording ? playTempRecording : playExistingRecording}
                  disabled={!hasRecording || isPlayingTemp || isPlayingExisting}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:opacity-50"
                >
                  <Play className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Play recording</p>
              </TooltipContent>
            </Tooltip>

            {/* Save button - only for temp recordings */}
            {tempRecording && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={saveRecording}
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Save className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Save recording</p>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Re-record button */}
            {(tempRecording || recordedSample) && !isLocked && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={tempRecording ? reRecord : () => startCountdown()}
                    size="sm"
                    variant="outline"
                    className="border-gray-400 text-gray-400 hover:border-gray-300 hover:text-gray-300"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Re-record</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}