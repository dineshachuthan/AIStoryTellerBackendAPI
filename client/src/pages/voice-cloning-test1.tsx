import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Mic, Clock, CheckCircle, Lock } from "lucide-react";

interface VoiceRecording {
  audioUrl: string;
  recordedAt: string;
  duration: number;
  isLocked: boolean;
}

interface VoiceSample {
  name: string;
  displayName: string;
  intensity: number;
  context: string;
  quote?: string;
  sampleText: string;
  userRecording: VoiceRecording | null;
  isRecorded: boolean;
  isLocked: boolean;
}

interface ValidationResponse {
  storyId: number;
  storyTitle: string;
  emotions: VoiceSample[];
  sounds: VoiceSample[];
  modulations: VoiceSample[];
}

export default function VoiceCloningTest1() {
  const [storyId, setStoryId] = useState("75");
  const [validationData, setValidationData] = useState<ValidationResponse | null>(null);
  const { toast } = useToast();

  // Fetch validation data for a story
  const fetchValidationMutation = useMutation({
    mutationFn: async (id: string) => {
      // Use the single endpoint that returns all ESM data for the story
      const voiceSamples = await apiRequest(`/api/stories/${id}/voice-samples`);
      
      return {
        storyId: parseInt(id),
        storyTitle: voiceSamples.storyTitle || `Story ${id}`,
        emotions: voiceSamples.emotions || [],
        sounds: voiceSamples.sounds || [],
        modulations: voiceSamples.modulations || []
      };
    },
    onSuccess: (data) => {
      setValidationData(data);
      toast({
        title: "Data loaded",
        description: `Found ${data.emotions.length} emotions, ${data.sounds.length} sounds, ${data.modulations.length} modulations`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to load data",
        description: error.message || "Could not fetch story validation data",
        variant: "destructive",
      });
    }
  });

  // Trigger ElevenLabs voice cloning
  const elevenLabsMutation = useMutation({
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
      toast({
        title: "ElevenLabs cloning started",
        description: `Job ${data.jobId} initiated. Processing all voice samples...`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "ElevenLabs cloning failed",
        description: error.message || "Failed to start voice cloning process",
        variant: "destructive",
      });
    }
  });

  const handleFetchData = () => {
    if (!storyId.trim()) {
      toast({
        title: "Story ID required",
        description: "Please enter a story ID",
        variant: "destructive",
      });
      return;
    }
    fetchValidationMutation.mutate(storyId);
  };

  const handleElevenLabsCloning = () => {
    if (!validationData) {
      toast({
        title: "No data loaded",
        description: "Please fetch story data first",
        variant: "destructive",
      });
      return;
    }
    elevenLabsMutation.mutate();
  };

  const renderVoiceSample = (sample: VoiceSample, category: string) => (
    <Card key={`${category}-${sample.name}`} className="mb-2">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {sample.isRecorded ? (
              sample.isLocked ? (
                <Lock className="w-4 h-4 text-blue-600" />
              ) : (
                <CheckCircle className="w-4 h-4 text-green-600" />
              )
            ) : (
              <Mic className="w-4 h-4 text-gray-400" />
            )}
            <span className="font-medium">{sample.displayName}</span>
            <Badge variant="outline">Intensity: {sample.intensity}</Badge>
          </div>
          {sample.isRecorded && (
            <Badge variant={sample.isLocked ? "secondary" : "default"}>
              {sample.isLocked ? "Locked" : "Recorded"}
            </Badge>
          )}
        </div>
        
        <div className="text-sm text-gray-600 mb-2">
          <strong>Sample Text:</strong> {sample.sampleText}
        </div>
        
        {sample.context && (
          <div className="text-sm text-gray-600 mb-2">
            <strong>Context:</strong> {sample.context}
          </div>
        )}
        
        {sample.userRecording && (
          <div className="bg-gray-50 p-2 rounded text-sm">
            <div className="flex items-center gap-4">
              <span>Duration: {sample.userRecording.duration}s</span>
              <span>Recorded: {new Date(sample.userRecording.recordedAt).toLocaleString()}</span>
              {sample.userRecording.isLocked && <Badge variant="secondary">Locked</Badge>}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              Audio: {sample.userRecording.audioUrl}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const getTotalRecorded = () => {
    if (!validationData) return 0;
    return (
      validationData.emotions.filter(e => e.isRecorded).length +
      validationData.sounds.filter(s => s.isRecorded).length +
      validationData.modulations.filter(m => m.isRecorded).length
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Voice Cloning Test - ElevenLabs Integration</CardTitle>
            <CardDescription>
              Enter a story ID to view voice recording metadata and trigger ElevenLabs voice cloning
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              <Input
                placeholder="Enter Story ID (e.g., 75)"
                value={storyId}
                onChange={(e) => setStoryId(e.target.value)}
                className="flex-1"
              />
              <Button 
                onClick={handleFetchData}
                disabled={fetchValidationMutation.isPending}
              >
                {fetchValidationMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Fetch Data
              </Button>
            </div>

            {validationData && (
              <div className="mb-4">
                <Alert>
                  <AlertDescription>
                    <strong>Story:</strong> {validationData.storyTitle} (ID: {validationData.storyId})
                    <br />
                    <strong>Recorded Samples:</strong> {getTotalRecorded()} total 
                    ({validationData.emotions.filter(e => e.isRecorded).length} emotions, 
                    {validationData.sounds.filter(s => s.isRecorded).length} sounds, 
                    {validationData.modulations.filter(m => m.isRecorded).length} modulations)
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {validationData && getTotalRecorded() > 0 && (
              <Button 
                onClick={handleElevenLabsCloning}
                disabled={elevenLabsMutation.isPending}
                className="w-full mb-6"
                variant="default"
              >
                {elevenLabsMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Trigger ElevenLabs Voice Cloning ({getTotalRecorded()} samples)
              </Button>
            )}
          </CardContent>
        </Card>

        {validationData && (
          <div className="grid gap-6">
            {validationData.emotions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Emotions ({validationData.emotions.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {validationData.emotions.map(emotion => renderVoiceSample(emotion, 'emotion'))}
                </CardContent>
              </Card>
            )}

            {validationData.sounds.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Sounds ({validationData.sounds.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {validationData.sounds.map(sound => renderVoiceSample(sound, 'sound'))}
                </CardContent>
              </Card>
            )}

            {validationData.modulations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Modulations ({validationData.modulations.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {validationData.modulations.map(modulation => renderVoiceSample(modulation, 'modulation'))}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {validationData && getTotalRecorded() === 0 && (
          <Alert>
            <AlertDescription>
              No voice recordings found for this story. Users need to record voice samples before ElevenLabs voice cloning can be triggered.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}