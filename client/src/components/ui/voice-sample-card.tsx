import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Lock, Unlock, Play, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { PressHoldRecorder } from "@/components/ui/press-hold-recorder";

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
  onRecordingComplete: (audioBlob: Blob) => void;
  onPlaySample?: (audioUrl: string) => void;
  onDeleteSample?: () => void;
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
  onDeleteSample
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
        icon: <CheckCircle className="w-4 h-4 text-green-500" />,
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
        {/* Radio-style recording interface with black background */}
        <div className="bg-black text-white p-4 rounded-lg">
          <div className="flex items-center gap-4">
            {/* Left side: Press and hold button with status */}
            <div className="flex flex-col items-center gap-2">
              <PressHoldRecorder
                onRecordingComplete={handleRecordingComplete}
                maxRecordingTime={15}
                disabled={disabled || isLocked}
                buttonText={{
                  hold: "Hold",
                  recording: "Recording",
                  instructions: "Press & hold to record"
                }}
              />
              
              {/* Status indicators */}
              <div className="flex items-center gap-1 text-xs">
                {isLocked && (
                  <Tooltip>
                    <TooltipTrigger>
                      <Lock className="w-3 h-3 text-blue-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Locked for voice cloning</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {recordedSample && (
                  <Tooltip>
                    <TooltipTrigger>
                      <span className="text-green-400">{recordedSample.duration.toFixed(1)}s</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Recording duration</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>

            {/* Right side: Sample text */}
            <div className="flex-1">
              <p className="text-sm italic text-gray-300 leading-relaxed">
                "{sampleText}"
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Minimum: {targetDuration}s required
              </p>
            </div>
          </div>

          {/* Control buttons - always visible */}
          <div className="flex justify-center gap-3 mt-4">
            {/* Play button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={playExistingRecording}
                  disabled={!isRecorded || !recordedSample}
                  size="sm"
                  variant="secondary"
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:opacity-50"
                >
                  <Play className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Play your recording</p>
              </TooltipContent>
            </Tooltip>

            {/* Save button - enabled when recording meets minimum duration */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => {/* Will be handled by PressHoldRecorder */}}
                  disabled={!recordedSample || (recordedSample.duration < 6)}
                  size="sm"
                  variant="secondary"
                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:opacity-50"
                >
                  Save
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{recordedSample && recordedSample.duration < 6 ? 
                   `Need ${(6 - recordedSample.duration).toFixed(1)}s more` : 
                   'Save recording'}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}