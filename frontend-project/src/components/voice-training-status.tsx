import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertCircle, Mic } from 'lucide-react';

interface VoiceTrainingStatusProps {
  userId: string;
}

export function VoiceTrainingStatus({ userId }: VoiceTrainingStatusProps) {
  const { data: trainingStatus, isLoading } = useQuery({
    queryKey: ['/api/voice-training/status'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: voiceStats } = useQuery({
    queryKey: ['/api/voice-selection/stats'],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Voice Training Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'training':
        return <Clock className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Mic className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'training':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Voice clone ready';
      case 'training':
        return 'Training in progress';
      case 'failed':
        return 'Training failed';
      default:
        return 'No voice clone';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-5 w-5" />
          Voice Training Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Training Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon(trainingStatus?.status)}
            <span className="font-medium">{getStatusText(trainingStatus?.status)}</span>
          </div>
          <Badge className={getStatusColor(trainingStatus?.status)}>
            {trainingStatus?.status}
          </Badge>
        </div>

        {/* Progress Bar for Training */}
        {trainingStatus?.status === 'training' && trainingStatus?.trainingProgress && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Training Progress</span>
              <span>{trainingStatus.trainingProgress}%</span>
            </div>
            <Progress value={trainingStatus.trainingProgress} className="h-2" />
          </div>
        )}

        {/* Voice Collection Progress */}
        {voiceStats && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Voice Samples Collected</span>
              <span>{voiceStats.userRecordedEmotions}/{voiceStats.totalEmotionsInConfig}</span>
            </div>
            <Progress value={voiceStats.coveragePercentage} className="h-2" />
            <p className="text-xs text-gray-600">
              {voiceStats.coveragePercentage}% coverage • {voiceStats.readyForNarration ? 'Ready for narration' : 'More samples needed'}
            </p>
          </div>
        )}

        {/* Voice Clone Info */}
        {trainingStatus?.status === 'completed' && trainingStatus?.voiceId && (
          <div className="p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-green-800">
              ✅ Your voice clone is ready! Voice ID: {trainingStatus.voiceId.slice(0, 8)}...
            </p>
          </div>
        )}

        {/* Missing Emotions */}
        {voiceStats?.missingEmotions && voiceStats.missingEmotions.length > 0 && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800 mb-2">Missing emotions:</p>
            <div className="flex flex-wrap gap-1">
              {voiceStats.missingEmotions.slice(0, 5).map((emotion: string) => (
                <Badge key={emotion} variant="outline" className="text-xs">
                  {emotion}
                </Badge>
              ))}
              {voiceStats.missingEmotions.length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{voiceStats.missingEmotions.length - 5} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}