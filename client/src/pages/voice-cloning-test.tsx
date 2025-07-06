import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { VoiceMessageService } from "@shared/i18n-config";
import { Zap, AlertCircle, CheckCircle, Clock, Loader2 } from "lucide-react";

export default function VoiceCloningTest() {
  const [storyId, setStoryId] = useState("75");
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const { toast } = useToast();

  // Get validation status for all categories
  const { data: emotionsData, refetch: refetchEmotions } = useQuery({
    queryKey: ["/api/voice-cloning/validation", storyId, "emotions"],
    queryFn: async () => {
      if (!storyId) return null;
      return await apiRequest(`/api/voice-cloning/validation/${storyId}/emotions`);
    },
    enabled: !!storyId
  });

  const { data: soundsData, refetch: refetchSounds } = useQuery({
    queryKey: ["/api/voice-cloning/validation", storyId, "sounds"],
    queryFn: async () => {
      if (!storyId) return null;
      return await apiRequest(`/api/voice-cloning/validation/${storyId}/sounds`);
    },
    enabled: !!storyId
  });

  const { data: modulationsData, refetch: refetchModulations } = useQuery({
    queryKey: ["/api/voice-cloning/validation", storyId, "modulations"],
    queryFn: async () => {
      if (!storyId) return null;
      return await apiRequest(`/api/voice-cloning/validation/${storyId}/modulations`);
    },
    enabled: !!storyId
  });

  // Calculate total counts
  const emotionsCount = emotionsData?.totalCompletedFromStory || 0;
  const soundsCount = soundsData?.totalCompletedFromStory || 0;
  const modulationsCount = modulationsData?.totalCompletedFromStory || 0;
  const totalCount = emotionsCount + soundsCount + modulationsCount;
  const isReady = totalCount >= 5;

  // Get job status when we have an active job
  const { data: jobStatus } = useQuery({
    queryKey: ["/api/voice-cloning/jobs", activeJobId, "status"],
    queryFn: async () => {
      if (!activeJobId) return null;
      return await apiRequest(`/api/voice-cloning/jobs/${activeJobId}/status`);
    },
    enabled: !!activeJobId,
    refetchInterval: 2000, // Poll every 2 seconds
  });

  // Clear activeJobId when job completes or fails to stop infinite polling
  useEffect(() => {
    if (jobStatus && (jobStatus.status === 'completed' || jobStatus.status === 'failed')) {
      setActiveJobId(null);
    }
  }, [jobStatus]);

  // Voice cloning mutation - MVP1 approach for all ESM samples
  const createVoiceCloneMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/voice-cloning/emotions/${storyId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
    },
    onSuccess: (data) => {
      setActiveJobId(data.jobId);
      toast({
        title: "Voice cloning started",
        description: `MVP1 voice cloning job ${data.jobId} started. Processing all ESM samples...`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Voice cloning failed",
        description: error.message || "Failed to start voice cloning process",
        variant: "destructive",
      });
    }
  });

  const handleCreateVoiceClone = () => {
    if (!storyId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a story ID",
        variant: "destructive",
      });
      return;
    }
    if (!isReady) {
      toast({
        title: "Error", 
        description: `Need at least 5 total ESM samples. You have ${totalCount}.`,
        variant: "destructive",
      });
      return;
    }
    createVoiceCloneMutation.mutate();
  };

  const getButtonText = () => {
    if (createVoiceCloneMutation.isPending) {
      return "Processing All ESM Samples...";
    }
    
    if (!isReady) {
      const needed = Math.max(0, 5 - totalCount);
      return `Need ${needed} more samples (have ${totalCount}/5)`;
    }

    return `Create Voice Clone (${totalCount} samples)`;
  };

  const isButtonDisabled = () => {
    if (createVoiceCloneMutation.isPending) return true;
    return !isReady;
  };

  const refetchAll = () => {
    refetchEmotions();
    refetchSounds();
    refetchModulations();
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Voice Cloning Test</h1>
        <p className="text-gray-600">
          Test manual voice cloning functionality with ElevenLabs integration
        </p>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Manual Voice Cloning Test
          </CardTitle>
          <CardDescription>
            Enter a story ID to test the voice cloning workflow
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Enter story ID (e.g., 1, 2, 3...)"
                value={storyId}
                onChange={(e) => setStoryId(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateVoiceClone();
                  }
                }}
              />
              <Button 
                onClick={() => refetchAll()}
                variant="outline"
                disabled={!storyId.trim()}
              >
                Refresh
              </Button>
            </div>
          </div>

          {(emotionsData || soundsData || modulationsData) && (
            <div className="space-y-4">
              {/* Main Status */}
              <Alert className={isReady ? "border-green-200 bg-green-50" : "border-orange-200 bg-orange-50"}>
                {isReady ? 
                  <CheckCircle className="h-4 w-4 text-green-600" /> : 
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                }
                <AlertDescription>
                  <div className="font-medium">
                    {isReady ? 
                      `✅ Ready for voice cloning! You have ${totalCount} total ESM samples.` :
                      `Need ${Math.max(0, 5 - totalCount)} more ESM samples to start cloning.`
                    }
                  </div>
                </AlertDescription>
              </Alert>

              {/* ESM Category Breakdown */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">ESM Sample Breakdown</span>
                  <span className="text-sm text-gray-600">
                    {totalCount} / 5 minimum required
                  </span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full transition-all duration-300 ${
                      isReady ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${Math.min((totalCount / 5) * 100, 100)}%` }}
                  />
                </div>

                {/* Category Counts */}
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-white rounded-lg p-3">
                    <div className="text-2xl font-bold text-blue-600">{emotionsCount}</div>
                    <div className="text-sm text-gray-600">Emotions</div>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <div className="text-2xl font-bold text-green-600">{soundsCount}</div>
                    <div className="text-sm text-gray-600">Sounds</div>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <div className="text-2xl font-bold text-purple-600">{modulationsCount}</div>
                    <div className="text-sm text-gray-600">Modulations</div>
                  </div>
                </div>

                {/* Sample Lists */}
                {emotionsData?.completedFromStory?.length > 0 && (
                  <div className="text-sm">
                    <span className="font-medium text-blue-600">Recorded Emotions:</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {emotionsData.completedFromStory.map((item: string, index: number) => (
                        <Badge key={index} variant="secondary" className="text-xs bg-blue-100">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {soundsData?.completedFromStory?.length > 0 && (
                  <div className="text-sm">
                    <span className="font-medium text-green-600">Recorded Sounds:</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {soundsData.completedFromStory.map((item: string, index: number) => (
                        <Badge key={index} variant="secondary" className="text-xs bg-green-100">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {modulationsData?.completedFromStory?.length > 0 && (
                  <div className="text-sm">
                    <span className="font-medium text-purple-600">Recorded Modulations:</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {modulationsData.completedFromStory.map((item: string, index: number) => (
                        <Badge key={index} variant="secondary" className="text-xs bg-purple-100">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <Button 
            onClick={handleCreateVoiceClone}
            disabled={isButtonDisabled()}
            className="w-full"
            size="lg"
          >
            {createVoiceCloneMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            <Zap className="mr-2 h-4 w-4" />
            {getButtonText()}
          </Button>

          {activeJobId && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div className="font-medium">Active Job: {activeJobId}</div>
                  {jobStatus && (
                    <div className="space-y-1">
                      <div>Status: <Badge variant="outline">{jobStatus.status}</Badge></div>
                      {jobStatus.progress && (
                        <div>Progress: {jobStatus.progress}%</div>
                      )}
                      {jobStatus.message && (
                        <div className="text-sm text-gray-600">{jobStatus.message}</div>
                      )}
                      {jobStatus.estimatedCost && (
                        <div className="text-sm">
                          Estimated Cost: ${jobStatus.estimatedCost.toFixed(2)}
                        </div>
                      )}
                      {jobStatus.actualCost && (
                        <div className="text-sm">
                          Actual Cost: ${jobStatus.actualCost.toFixed(2)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <div className="text-center text-sm text-gray-500 max-w-2xl mx-auto">
        <p>
          MVP1 ElevenLabs Integration: All ESM samples (emotions, sounds, modulations) are sent together to create one universal narrator voice.
          The system requires a minimum of 5 total ESM samples from any combination of categories.
          Your narrator voice will be stored across all ESM recordings for future story narration.
        </p>
      </div>
    </div>
  );
}