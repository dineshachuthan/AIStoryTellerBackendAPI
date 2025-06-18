import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Play } from "lucide-react";

interface ConfidenceData {
  id: number;
  storyId: number;
  userId: string;
  totalInteractions: number;
  voiceRecordingsCompleted: number;
  emotionsRecorded: number;
  playbacksCompleted: number;
  timeSpentSeconds: number;
  voiceConfidence: number;
  storyEngagement: number;
  overallConfidence: number;
  sessionCount: number;
  lastInteractionAt: string;
  firstInteractionAt: string;
  createdAt: string;
  updatedAt: string;
}

interface ConfidenceMeterProps {
  storyId: number;
  userId: string;
  onMetricUpdate?: (metric: string, timeSpent?: number) => void;
}

export function ConfidenceMeter({ storyId, userId, onMetricUpdate }: ConfidenceMeterProps) {
  const [confidence, setConfidence] = useState<ConfidenceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConfidenceData();
  }, [storyId, userId]);

  const fetchConfidenceData = async () => {
    try {
      const response = await fetch(`/api/stories/${storyId}/confidence/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setConfidence(data);
      }
    } catch (error) {
      console.error("Failed to fetch confidence data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="w-full max-w-xs">
        <CardContent className="pt-4">
          <div className="text-xs text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (!confidence) return null;

  return (
    <Card className="w-full max-w-xs">
      <CardContent className="pt-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Trophy className="h-3 w-3" />
            <span>{confidence.overallConfidence}%</span>
          </div>
          <div className="flex items-center gap-1">
            <Play className="h-3 w-3" />
            <span>{confidence.playbacksCompleted}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Hook for tracking confidence metrics
export function useConfidenceTracking(storyId: number, userId: string) {
  const trackVoiceRecording = async () => {
    try {
      await fetch(`/api/stories/${storyId}/confidence/${userId}/increment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metric: "voiceRecordingsCompleted" }),
      });
    } catch (error) {
      console.error("Failed to track voice recording:", error);
    }
  };

  const trackEmotionRecording = async () => {
    try {
      await fetch(`/api/stories/${storyId}/confidence/${userId}/increment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metric: "emotionsRecorded" }),
      });
    } catch (error) {
      console.error("Failed to track emotion recording:", error);
    }
  };

  const trackPlayback = async () => {
    try {
      await fetch(`/api/stories/${storyId}/confidence/${userId}/increment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metric: "playbacksCompleted" }),
      });
    } catch (error) {
      console.error("Failed to track playback:", error);
    }
  };

  const trackInteraction = async (timeSpentSeconds?: number) => {
    try {
      await fetch(`/api/stories/${storyId}/confidence/${userId}/increment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metric: "totalInteractions", timeSpentSeconds }),
      });
    } catch (error) {
      console.error("Failed to track interaction:", error);
    }
  };

  return {
    trackVoiceRecording,
    trackEmotionRecording,
    trackPlayback,
    trackInteraction,
  };
}