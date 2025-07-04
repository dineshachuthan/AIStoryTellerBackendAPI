import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Lock, Unlock, Play, Pause, Volume2, Mic, Clock, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { VoiceRecordingCard, VoiceTemplate, RecordedSample } from "@/components/voice-recording/VoiceRecordingCard";

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

  // Create VoiceTemplate for VoiceRecordingCard
  const template: VoiceTemplate = {
    id: 0, // Not used in this context
    modulationType: category,
    modulationKey: emotion,
    displayName: displayName,
    description: description,
    sampleText: sampleText,
    targetDuration: targetDuration || 10,
    category: category,
    voiceSettings: undefined
  };

  // Handle the recording callback to match VoiceRecordingCard's signature
  const handleRecord = async (modulationKey: string, audioBlob: Blob): Promise<void> => {
    onRecordingComplete(audioBlob);
  };

  return (
    <div className={cn(
      "w-full max-w-sm mx-auto",
      disabled && "opacity-60 cursor-not-allowed",
      className
    )}>
      <VoiceRecordingCard
        template={template}
        recordedSample={recordedSample}
        isRecorded={isRecorded}
        onRecord={handleRecord}
        onPlayRecorded={onPlaySample}
        className="w-full"
      />
    </div>
  );
}