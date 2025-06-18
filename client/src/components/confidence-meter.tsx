import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, BookOpen, Play, Trophy } from "lucide-react";

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

  const incrementMetric = async (metric: string, timeSpentSeconds?: number) => {
    try {
      const response = await fetch(`/api/stories/${storyId}/confidence/${userId}/increment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ metric, timeSpentSeconds }),
      });

      if (response.ok) {
        const updatedData = await response.json();
        setConfidence(updatedData);
        onMetricUpdate?.(metric, timeSpentSeconds);
      }
    } catch (error) {
      console.error("Failed to increment metric:", error);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  const getConfidenceLevel = (score: number) => {
    if (score >= 80) return { label: "Expert", color: "bg-green-500" };
    if (score >= 60) return { label: "Confident", color: "bg-blue-500" };
    if (score >= 40) return { label: "Learning", color: "bg-yellow-500" };
    return { label: "Beginner", color: "bg-gray-500" };
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Confidence Meter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-2 bg-gray-200 rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!confidence) return null;

  const overallLevel = getConfidenceLevel(confidence.overallConfidence);
  const voiceLevel = getConfidenceLevel(confidence.voiceConfidence);
  const engagementLevel = getConfidenceLevel(confidence.storyEngagement);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Confidence Meter
          <Badge className={`${overallLevel.color} text-white`}>
            {overallLevel.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Confidence */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Overall Confidence</span>
            <span className="text-sm text-muted-foreground">{confidence.overallConfidence}%</span>
          </div>
          <Progress value={confidence.overallConfidence} className="h-3" />
        </div>

        {/* Voice Confidence */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Mic className="h-4 w-4" />
              <span className="text-sm font-medium">Voice Recording</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`${voiceLevel.color} text-white border-none`}>
                {voiceLevel.label}
              </Badge>
              <span className="text-sm text-muted-foreground">{confidence.voiceConfidence}%</span>
            </div>
          </div>
          <Progress value={confidence.voiceConfidence} className="h-2" />
          <div className="text-xs text-muted-foreground">
            {confidence.voiceRecordingsCompleted} recordings completed
          </div>
        </div>

        {/* Story Engagement */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="text-sm font-medium">Story Engagement</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`${engagementLevel.color} text-white border-none`}>
                {engagementLevel.label}
              </Badge>
              <span className="text-sm text-muted-foreground">{confidence.storyEngagement}%</span>
            </div>
          </div>
          <Progress value={confidence.storyEngagement} className="h-2" />
          <div className="text-xs text-muted-foreground">
            {confidence.playbacksCompleted} playbacks • {formatTime(confidence.timeSpentSeconds)} spent
          </div>
        </div>

        {/* Activity Summary */}
        <div className="pt-4 border-t">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Play className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Interactions:</span>
              <span className="font-medium">{confidence.totalInteractions}</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Sessions:</span>
              <span className="font-medium">{confidence.sessionCount}</span>
            </div>
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