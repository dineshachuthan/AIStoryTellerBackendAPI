import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Zap, CheckCircle, AlertCircle, Clock } from "lucide-react";

interface VoiceCloneButtonProps {
  storyId: number;
  voiceName: string;
  voiceType: 'emotion' | 'sound' | 'modulation';
  intensity?: number;
  context?: string;
  quote?: string;
  description?: string;
  hasRecording: boolean;
  cloneStatus?: 'not_cloned' | 'pending' | 'training' | 'completed' | 'failed';
  onCloneStarted?: (voiceName: string, voiceType: string) => void;
  onCloneCompleted?: (voiceName: string, voiceType: string) => void;
  className?: string;
  variant?: 'default' | 'compact' | 'card';
}

export function VoiceCloneButton({
  storyId,
  voiceName,
  voiceType,
  intensity,
  context,
  quote,
  description,
  hasRecording,
  cloneStatus = 'not_cloned',
  onCloneStarted,
  onCloneCompleted,
  className = "",
  variant = 'default'
}: VoiceCloneButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCloning, setIsCloning] = useState(false);

  const cloneMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Authentication required');
      
      const response = await apiRequest(`/api/voice-cloning/manual-clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId,
          voiceName,
          voiceType,
          intensity,
          context,
          quote
        }),
        credentials: 'include'
      });
      
      return response;
    },
    onMutate: () => {
      setIsCloning(true);
      onCloneStarted?.(voiceName, voiceType);
    },
    onSuccess: (data) => {
      toast({
        title: "Voice Cloning Started",
        description: `Creating your personalized ${voiceName} voice. This may take a few minutes.`,
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: [`/api/stories/${storyId}/voice-requirements`] });
      queryClient.invalidateQueries({ queryKey: [`/api/voice-cloning/status`] });
      
      onCloneCompleted?.(voiceName, voiceType);
    },
    onError: (error: any) => {
      toast({
        title: "Voice Cloning Failed",
        description: error.message || "Failed to start voice cloning. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsCloning(false);
    }
  });

  const getStatusIcon = () => {
    switch (cloneStatus) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'training':
      case 'pending':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Zap className="h-4 w-4" />;
    }
  };

  const getStatusText = () => {
    switch (cloneStatus) {
      case 'completed':
        return 'Voice Ready';
      case 'training':
        return 'Training...';
      case 'pending':
        return 'Pending';
      case 'failed':
        return 'Failed';
      default:
        return hasRecording ? 'Clone Voice' : 'Record First';
    }
  };

  const isDisabled = !hasRecording || cloneStatus === 'training' || cloneStatus === 'pending' || isCloning;

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Badge variant={cloneStatus === 'completed' ? 'default' : 'secondary'} className="flex items-center gap-1">
          {getStatusIcon()}
          {voiceName}
        </Badge>
        <Button
          size="sm"
          variant={cloneStatus === 'completed' ? 'secondary' : 'default'}
          disabled={isDisabled}
          onClick={() => cloneMutation.mutate()}
          className="h-6 px-2 text-xs"
        >
          {isCloning && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
          {getStatusText()}
        </Button>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <Card className={`${className}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            {getStatusIcon()}
            {voiceName}
            {intensity && <Badge variant="outline" className="text-xs">{intensity}/10</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
          {quote && (
            <blockquote className="text-xs italic border-l-2 border-muted pl-2 text-muted-foreground">
              "{quote}"
            </blockquote>
          )}
          {context && (
            <p className="text-xs text-muted-foreground">
              <strong>Context:</strong> {context}
            </p>
          )}
          <Button
            size="sm"
            variant={cloneStatus === 'completed' ? 'secondary' : 'default'}
            disabled={isDisabled}
            onClick={() => cloneMutation.mutate()}
            className="w-full"
          >
            {isCloning && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {getStatusText()}
          </Button>
          {!hasRecording && (
            <p className="text-xs text-orange-600">
              Record a voice sample first to enable cloning
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // Default variant
  return (
    <Button
      size="sm"
      variant={cloneStatus === 'completed' ? 'secondary' : 'default'}
      disabled={isDisabled}
      onClick={() => cloneMutation.mutate()}
      className={`flex items-center gap-2 ${className}`}
    >
      {isCloning && <Loader2 className="h-4 w-4 animate-spin" />}
      {getStatusIcon()}
      {getStatusText()}
    </Button>
  );
}