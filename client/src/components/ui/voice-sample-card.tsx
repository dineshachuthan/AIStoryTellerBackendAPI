import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Lock, Unlock, Play, Pause, Volume2, Mic, Clock, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { EnhancedVoiceRecorder } from "@/components/ui/enhanced-voice-recorder";

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
  recordedSample?: {
    audioUrl: string;
    recordedAt: Date;
    duration?: number;
  };
  
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
        description: "Used for voice cloning - locked from editing"
      };
    } else if (isRecorded) {
      return {
        icon: <CheckCircle className="w-4 h-4 text-green-500" />,
        color: "green", 
        label: "Recorded",
        description: "Sample recorded - available for voice cloning"
      };
    } else {
      return {
        icon: <Unlock className="w-4 h-4 text-gray-400" />,
        color: "gray",
        label: "Empty",
        description: "No sample recorded yet"
      };
    }
  };

  const statusConfig = getStatusConfig();

  // Handle play/pause toggle
  const handlePlayToggle = () => {
    if (recordedSample?.audioUrl && onPlaySample) {
      setIsPlaying(!isPlaying);
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
    <div className={cn(
      "p-3 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 space-y-3",
      disabled && "opacity-60 cursor-not-allowed",
      className
    )}>
      {/* Header with status and title */}
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="cursor-help shrink-0">
              {statusConfig.icon}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="max-w-xs">
              <p className="font-semibold">{statusConfig.label}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {statusConfig.description}
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
        
        <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
          {displayName}
        </h3>
        
        {intensity && (
          <Badge variant="outline" className="text-xs shrink-0">
            {intensity}/10
          </Badge>
        )}
        
        <Badge className={cn("text-xs ml-auto", getCategoryColor(category))}>
          {category}
        </Badge>
      </div>

        {/* Recording status and controls */}
        {isRecorded && recordedSample && (
          <div className="p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePlayToggle}
                disabled={disabled}
                className="h-6 w-6 p-0 shrink-0"
              >
                {isPlaying ? (
                  <Pause className="w-3 h-3" />
                ) : (
                  <Play className="w-3 h-3" />
                )}
              </Button>
              
              <div className="text-xs text-muted-foreground flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3 shrink-0" />
                  <span>{recordedSample.duration ? `${recordedSample.duration}s` : 'Unknown'}</span>
                </div>
                <div className="text-[10px] opacity-75 truncate">
                  {recordedSample.recordedAt.toLocaleDateString()}
                </div>
              </div>

              {onDeleteSample && !isLocked && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDeleteSample}
                  disabled={disabled}
                  className="h-6 w-12 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 shrink-0"
                >
                  <span className="text-[10px]">Delete</span>
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Recording component */}
        <div className="space-y-2">
          <div className="w-full">
            <EnhancedVoiceRecorder
              buttonText={{
                hold: disabled
                  ? "🚫 Disabled"
                  : isLocked 
                    ? "🔒 Locked" 
                    : isRecorded 
                      ? "Re-record" 
                      : "Record",
                recording: "Recording...",
                instructions: disabled
                  ? "Recording disabled"
                  : isLocked 
                    ? "Sample locked for voice cloning" 
                    : isRecorded 
                      ? "Hold to re-record your voice" 
                      : "Hold button to record"
              }}
              sampleText={sampleText}
              emotionDescription={description}
              emotionName={displayName}
              category={category}
              isRecorded={isRecorded}
              isLocked={isLocked}
              onRecordingComplete={onRecordingComplete}
              className="w-full"
              disabled={disabled || isLocked}
              maxRecordingTime={targetDuration}
              existingRecording={isRecorded && recordedSample ? {
                url: recordedSample.audioUrl,
                recordedAt: recordedSample.recordedAt
              } : undefined}
            />
          </div>
          
          {/* Recording hint */}
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground justify-center">
            <Mic className="w-3 h-3" />
            <span>Target: {targetDuration}s duration</span>
          </div>
        </div>
      </div>
    </div>
  );
}