import { useState } from "react";
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
  const [storyId, setStoryId] = useState("");
  const [category, setCategory] = useState<'emotions' | 'sounds' | 'modulations'>('emotions');
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const { toast } = useToast();

  // Get validation status for selected category and story
  const { data: validationData, refetch: refetchValidation } = useQuery({
    queryKey: ["/api/voice-cloning/validation", storyId, category],
    queryFn: async () => {
      if (!storyId || !category) return null;
      return await apiRequest(`/api/voice-cloning/validation/${storyId}/${category}`);
    },
    enabled: !!storyId && !!category
  });

  // Get job status when we have an active job
  const { data: jobStatus } = useQuery({
    queryKey: ["/api/voice-cloning/jobs", activeJobId, "status"],
    enabled: !!activeJobId,
    refetchInterval: 2000, // Poll every 2 seconds
  });

  // Voice cloning mutation - uses exact same endpoint as other pages
  const createVoiceCloneMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/voice-cloning/${category}/${storyId}`, {
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
        description: `${category} voice cloning job ${data.jobId} started. Processing in background...`,
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
    if (!category) {
      toast({
        title: "Error", 
        description: "Please select a category",
        variant: "destructive",
      });
      return;
    }
    createVoiceCloneMutation.mutate();
  };

  const getButtonText = () => {
    if (createVoiceCloneMutation.isPending) {
      return VoiceMessageService.getInProgressMessage().message;
    }
    
    if (!validationData) {
      return VoiceMessageService.getButtonLabel().message;
    }

    if (!validationData.isReady) {
      const needed = validationData.totalRequired - validationData.totalCompleted;
      return VoiceMessageService.getInsufficientSamplesMessage(needed).message;
    }

    return VoiceMessageService.getButtonLabel().message;
  };

  const isButtonDisabled = () => {
    if (createVoiceCloneMutation.isPending) return true;
    if (!validationData) return true;
    return !validationData.isReady;
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
                onClick={() => refetchValidation()}
                variant="outline"
                disabled={!storyId.trim()}
              >
                Check
              </Button>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Category:</label>
              <Select value={category} onValueChange={(value: 'emotions' | 'sounds' | 'modulations') => setCategory(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="emotions">Emotions</SelectItem>
                  <SelectItem value="sounds">Sounds</SelectItem>
                  <SelectItem value="modulations">Modulations</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {validationData && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div className="font-medium">Validation Results for Story {storyId} - {category}:</div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{category}</Badge>
                    <span>{validationData.totalCompleted}/{validationData.totalRequired} recorded</span>
                    {validationData.isReady ? 
                      <CheckCircle className="h-4 w-4 text-green-600" /> : 
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                    }
                  </div>
                  
                  {validationData.missing && validationData.missing.length > 0 && (
                    <div className="text-sm text-gray-600">
                      Missing: {validationData.missing.join(', ')}
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
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
          This test page calls the manual voice cloning endpoints. 
          Cost estimates are captured internally but hidden from the UI as requested.
          The system processes all categories (emotions, sounds, modulations) simultaneously
          while maintaining individual voice clone records for future expansion.
        </p>
      </div>
    </div>
  );
}