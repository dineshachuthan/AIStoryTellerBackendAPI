import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Mic, Play, Square, Volume2 } from "lucide-react";
import { EmotionBadge } from "./EmotionBadge";

interface EmotionVoiceRecorderProps {
  emotion: string;
  intensity: number;
  onRecordingComplete?: (audioBlob: Blob) => void;
  onPlaySample?: () => void;
  onPlayUserRecording?: () => void;
  isPlayingSample?: boolean;
  isPlayingUserRecording?: boolean;
  hasUserRecording?: boolean;
  className?: string;
}

export function EmotionVoiceRecorder({
  emotion,
  intensity,
  onRecordingComplete,
  onPlaySample,
  onPlayUserRecording,
  isPlayingSample = false,
  isPlayingUserRecording = false,
  hasUserRecording = false,
  className
}: EmotionVoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const { toast } = useToast();
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const holdTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isHoldingRef = useRef<boolean>(false);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 1
        }
      });

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Audio level monitoring
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const monitorLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        setAudioLevel(Math.round(average));
        if (isRecording) {
          requestAnimationFrame(monitorLevel);
        }
      };
      monitorLevel();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const recordingDuration = Date.now() - recordingStartTimeRef.current;
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
        
        // Only save recording if it's at least 1 second long
        if (recordingDuration >= 1000) {
          onRecordingComplete?.(audioBlob);
        } else {
          toast({
            title: "Recording Too Short",
            description: "Please hold the button for at least 1 second to record.",
            variant: "destructive",
          });
        }
        
        stream.getTracks().forEach(track => track.stop());
        audioChunksRef.current = []; // Clear audio chunks for next recording
      };

      setIsRecording(true);
      setRecordingProgress(0);
      recordingStartTimeRef.current = Date.now();
      audioChunksRef.current = []; // Clear previous audio chunks
      mediaRecorder.start();

      // Progress timer (max 10 seconds)
      let progress = 0;
      recordingIntervalRef.current = setInterval(() => {
        progress += 2;
        setRecordingProgress(progress);
        if (progress >= 100) {
          stopRecording();
        }
      }, 100);

    } catch (error) {
      console.error('Recording error:', error);
      toast({
        title: "Recording Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setAudioLevel(0);
      setRecordingProgress(0);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  const handleMouseDown = () => {
    startRecording();
  };

  const handleMouseUp = () => {
    stopRecording();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    startRecording();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    stopRecording();
  };

  return (
    <div className={`flex items-center gap-3 p-4 border rounded-lg ${className}`}>
      <EmotionBadge 
        emotion={emotion} 
        intensity={intensity} 
        showIntensity 
        size="sm"
      />
      
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          {/* Show Play User Recording if available, otherwise show Play Sample */}
          {hasUserRecording ? (
            <Button
              variant="default"
              size="sm"
              onClick={onPlayUserRecording}
              disabled={isPlayingUserRecording}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              {isPlayingUserRecording ? (
                <Volume2 className="h-4 w-4 animate-pulse" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Play Your Voice
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={onPlaySample}
              disabled={isPlayingSample}
              className="gap-2"
            >
              {isPlayingSample ? (
                <Volume2 className="h-4 w-4 animate-pulse" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Play Sample
            </Button>
          )}

          {/* Record Button */}
          <Button
            variant={isRecording ? "destructive" : hasUserRecording ? "secondary" : "default"}
            size="sm"
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="gap-2 select-none"
            disabled={isPlayingSample}
          >
            {isRecording ? (
              <>
                <Square className="h-4 w-4" />
                Recording...
              </>
            ) : (
              <>
                <Mic className="h-4 w-4" />
                {hasUserRecording ? "Re-record" : "Hold to Record"}
              </>
            )}
          </Button>
        </div>

        {/* Recording Progress & Audio Level */}
        {isRecording && (
          <div className="space-y-1">
            <Progress value={recordingProgress} className="h-2" />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Audio Level: {audioLevel}</span>
              <div className="flex-1 bg-gray-200 rounded-full h-1">
                <div 
                  className="bg-green-600 h-1 rounded-full transition-all duration-100"
                  style={{ width: `${Math.min(100, (audioLevel / 128) * 100)}%` }}
                />
              </div>
              <span>{audioLevel > 10 ? "✓" : "Speak louder"}</span>
            </div>
          </div>
        )}

        {hasUserRecording && !isRecording && (
          <p className="text-xs text-green-600">✓ Your voice recorded for this emotion</p>
        )}
      </div>
    </div>
  );
}