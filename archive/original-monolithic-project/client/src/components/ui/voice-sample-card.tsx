import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Lock, Unlock, Play, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { EnhancedVoiceRecorder } from "@/components/ui/enhanced-voice-recorder";

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
  onRecordingComplete?: (audioBlob: Blob) => void;
  onPlaySample?: (audioUrl: string) => void;
  onDeleteSample?: () => void;
  
  // Save configuration for direct API integration
  saveConfig?: {
    endpoint: string;
    payload: Record<string, any>;
    minDuration: number;
    onSaveSuccess?: (data: any) => void;
    onSaveError?: (error: string) => void;
  };
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
  onDeleteSample,
  saveConfig
}: VoiceSampleCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);

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
        icon: <Unlock className="w-4 h-4 text-green-500" />,
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

  // Handle recording using your working PressHoldRecorder
  const handleRecordingComplete = (audioBlob: Blob, audioUrl: string) => {
    onRecordingComplete(audioBlob);
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
      
      <CardContent className="p-0">
        <EnhancedVoiceRecorder
          onRecordingComplete={saveConfig ? undefined : handleRecordingComplete}
          maxRecordingTime={15}
          disabled={disabled || isLocked}
          sampleText={sampleText}
          emotionName={displayName}
          intensity={intensity}
          isLocked={isLocked}
          isRecorded={isRecorded}
          recordedSample={recordedSample ? {
            audioUrl: recordedSample.audioUrl,
            recordedAt: recordedSample.recordedAt || new Date(),
            duration: recordedSample.duration
          } : undefined}
          onPlaySample={onPlaySample}
          buttonText={{
            hold: "Hold to Record",
            recording: "Recording...",
            instructions: "Press and hold to record"
          }}
          saveConfig={saveConfig}
        />
      </CardContent>
    </Card>
  );
}