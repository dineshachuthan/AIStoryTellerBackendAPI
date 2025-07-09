import { useEffect, useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, UserPlus, Mic, Play, Check, Pause, Volume2, Sparkles, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { EnhancedVoiceRecorder } from "@/components/ui/enhanced-voice-recorder";

interface NarrationInvitationData {
  id: number;
  storyId: number;
  inviterId: string;
  token: string;
  inviteeEmail?: string;
  inviteePhone?: string;
  expiresAt: string;
  status: string;
  story?: {
    title: string;
    summary?: string;
  };
  inviter?: {
    firstName?: string;
    lastName?: string;
    email: string;
  };
}

export default function NarrationInvitationLanding() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [selectedEmotion, setSelectedEmotion] = useState<string>("happy");
  const [emotionRecordings, setEmotionRecordings] = useState<Map<string, { blob: Blob, sampleText: string }>>(new Map());
  const [isRecording, setIsRecording] = useState(false);
  const [currentStage, setCurrentStage] = useState<"preview" | "recording" | "generating">("preview");
  const [isPlayingNarration, setIsPlayingNarration] = useState(false);
  const [narrationProgress, setNarrationProgress] = useState(0);
  const [sampleTexts, setSampleTexts] = useState<Map<string, string>>(new Map());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Common emotions for narrator voice
  const narratorEmotions = [
    "happy", "sad", "angry", "excited", "calm", 
    "fearful", "surprised", "contemplative", "dramatic", "neutral"
  ];

  // Minimum samples needed for voice cloning
  const MIN_SAMPLES_FOR_CLONING = 5;

  // Fetch invitation details
  const { data: invitation, isLoading, error } = useQuery<NarrationInvitationData>({
    queryKey: [`/api/invitations/${token}`],
    enabled: !!token,
  });

  // Fetch story narration if available
  const { data: storyNarration } = useQuery({
    queryKey: [`/api/stories/${invitation?.storyId}/narration/saved`, token],
    enabled: !!invitation?.storyId && !!token && currentStage === "preview",
    queryFn: async () => {
      try {
        const response = await apiRequest(`/api/stories/${invitation?.storyId}/narration/saved?invitationToken=${token}`, {
          method: 'GET'
        });
        return response || null;
      } catch (error) {
        // No saved narration found - this is normal for pending invitations
        console.log('No saved narration found for preview');
        return null;
      }
    },
  });

  // Fetch sample texts for all emotions
  const { data: emotionSampleTexts } = useQuery({
    queryKey: [`/api/stories/${invitation?.storyId}/emotion-sample-texts`],
    queryFn: async () => {
      const texts = new Map<string, string>();
      
      // Fetch sample texts for all emotions
      const results = await Promise.all(
        narratorEmotions.map(async (emotion) => {
          try {
            const response = await apiRequest(`/api/stories/${invitation?.storyId}/sample-text`, {
              method: 'POST',
              body: JSON.stringify({ emotion })
            });
            return { emotion, text: response.sampleText };
          } catch (error) {
            console.error(`Failed to get sample text for ${emotion}:`, error);
            return { emotion, text: `Express the emotion of ${emotion} in your voice with genuine feeling` };
          }
        })
      );
      
      results.forEach(({ emotion, text }) => {
        texts.set(emotion, text);
      });
      
      return texts;
    },
    enabled: !!invitation?.storyId && currentStage === "recording",
  });

  // Update sample texts when fetched
  useEffect(() => {
    if (emotionSampleTexts) {
      setSampleTexts(emotionSampleTexts);
    }
  }, [emotionSampleTexts]);

  // Generate narration with new voice
  const generateNarrationMutation = useMutation({
    mutationFn: async (voiceId: string) => {
      return await apiRequest(`/api/stories/${invitation?.storyId}/narration`, {
        method: 'POST',
        body: JSON.stringify({ voiceId }),
      });
    },
    onSuccess: (data) => {
      // Navigate to story narration page
      setLocation(`/story/${invitation?.storyId}/narration`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to generate narration. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Create voice clone mutation
  const createVoiceCloneMutation = useMutation({
    mutationFn: async () => {
      // Convert recordings to the format expected by backend
      const voiceSamples = await Promise.all(
        Array.from(emotionRecordings.entries()).map(async ([emotion, recording]) => {
          // Convert blob to base64
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve) => {
            reader.onloadend = () => {
              const base64 = reader.result?.toString().split(',')[1] || '';
              resolve(base64);
            };
          });
          reader.readAsDataURL(recording.blob);
          const audioData = await base64Promise;
          
          // Create a temporary URL for the blob
          const audioUrl = URL.createObjectURL(recording.blob);
          
          return {
            emotion,
            audioUrl,
            audioData
          };
        })
      );
      
      return await apiRequest('/api/voice-cloning/create-narrator', {
        method: 'POST',
        body: JSON.stringify({
          invitationToken: token,
          voiceSamples
        }),
      });
    },
    onSuccess: async (data) => {
      toast({
        title: "Success!",
        description: "Your narrator voice has been created. Generating story narration...",
      });
      setCurrentStage("generating");
      // Generate narration with the new voice
      await generateNarrationMutation.mutate(data.voiceId);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to create voice. Please try again.",
        variant: "destructive",
      });
      setCurrentStage("recording");
    },
  });

  useEffect(() => {
    if (error) {
      toast({
        title: "Invalid Invitation",
        description: "This invitation link is invalid or has expired.",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  // Cleanup audio when component unmounts or stage changes
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [currentStage]);

  const handleAcceptInvitation = async () => {
    if (!invitation) return;

    try {
      // Accept the invitation
      await apiRequest(`/api/invitations/${token}/accept`, {
        method: 'POST',
      });
      
      // Update the invitation status locally
      queryClient.setQueryData([`/api/invitations/${token}`], (old: any) => ({
        ...old,
        status: 'accepted',
      }));
      
      setCurrentStage("recording");
      
      toast({
        title: "Welcome!",
        description: "Let's create your unique narrator voice.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to accept invitation. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRecordingSaved = (emotion: string, blob: Blob, sampleText: string) => {
    const newRecordings = new Map(emotionRecordings);
    newRecordings.set(emotion, { blob, sampleText });
    setEmotionRecordings(newRecordings);
    
    // Check if we have enough samples
    if (newRecordings.size >= MIN_SAMPLES_FOR_CLONING && newRecordings.size === MIN_SAMPLES_FOR_CLONING) {
      toast({
        title: "Great progress!",
        description: `You've recorded ${MIN_SAMPLES_FOR_CLONING} emotions. You can now create your narrator voice or continue recording more for better quality.`,
      });
    }
    
    // Auto-advance to next unrecorded emotion
    const nextEmotion = narratorEmotions.find(e => !newRecordings.has(e));
    if (nextEmotion) {
      setSelectedEmotion(nextEmotion);
    }
  };

  const handleDeleteRecording = (emotion: string) => {
    const newRecordings = new Map(emotionRecordings);
    newRecordings.delete(emotion);
    setEmotionRecordings(newRecordings);
  };

  const handleSubmitAllRecordings = async () => {
    if (emotionRecordings.size < MIN_SAMPLES_FOR_CLONING) {
      toast({
        title: "More recordings needed",
        description: `Please record at least ${MIN_SAMPLES_FOR_CLONING} different emotions for a quality narrator voice.`,
        variant: "destructive",
      });
      return;
    }
    
    setCurrentStage("generating");
    await createVoiceCloneMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-tiktok-red" />
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Card className="w-full max-w-md bg-dark-card border-gray-800">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-white">Invalid Invitation</CardTitle>
            <CardDescription className="text-gray-400">
              This invitation link is invalid or has expired.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const isExpired = new Date(invitation.expiresAt) < new Date();

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-4xl mx-auto p-6 pt-20 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-white">
            {currentStage === "preview" ? "Experience the Story" : 
             currentStage === "recording" ? "Create Your Narrator Voice" : 
             "Generating Your Narration"}
          </h1>
          <p className="text-gray-400">
            {currentStage === "preview" 
              ? `${invitation.inviter?.firstName || "Someone"} has invited you to narrate their story`
              : currentStage === "recording"
              ? "Record voice samples with different emotions"
              : "Please wait while we create your personalized narration"}
          </p>
        </div>

        {/* Story Details */}
        <Card className="bg-dark-card border-gray-800">
          <CardHeader>
            <CardTitle className="text-xl text-white">{invitation.story?.title}</CardTitle>
            {invitation.story?.summary && (
              <CardDescription className="text-gray-400 mt-2">
                {invitation.story.summary}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-lg p-4 border border-blue-800">
              <p className="text-sm text-gray-400 mb-2">Your narrator voice will bring this story to life</p>
              <p className="text-blue-300">
                Record voice samples with different emotions to create a personalized narrator voice for this story.
              </p>
            </div>

            {isExpired ? (
              <div className="text-center py-4">
                <p className="text-red-400 mb-4">This invitation has expired.</p>
                <Button variant="outline" className="border-gray-700">
                  Request New Invitation
                </Button>
              </div>
            ) : currentStage === "preview" ? (
              <div className="space-y-4">
                {/* Story Preview with Original Narrator */}
                <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-lg p-6 border border-purple-800">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Listen with Original Narrator</h3>
                    <Badge className="bg-purple-600 text-white">
                      <Volume2 className="w-3 h-3 mr-1" />
                      {invitation.inviter?.firstName}'s Voice
                    </Badge>
                  </div>
                  
                  {/* Audio Player */}
                  <div className="bg-black/40 rounded-lg p-4 space-y-3">
                    {storyNarration?.audioUrls?.length > 0 ? (
                      <>
                        <Button 
                          onClick={() => {
                            if (isPlayingNarration) {
                              audioRef.current?.pause();
                              setIsPlayingNarration(false);
                            } else {
                              // Initialize audio if not already initialized
                              if (!audioRef.current || audioRef.current.src !== storyNarration.audioUrls[0]) {
                                audioRef.current = new Audio(storyNarration.audioUrls[0]);
                                audioRef.current.addEventListener('timeupdate', () => {
                                  if (audioRef.current) {
                                    const progress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
                                    setNarrationProgress(progress);
                                  }
                                });
                                audioRef.current.addEventListener('ended', () => {
                                  setIsPlayingNarration(false);
                                  setNarrationProgress(0);
                                });
                              }
                              audioRef.current.play();
                              setIsPlayingNarration(true);
                            }
                          }}
                          className="w-full bg-purple-600 hover:bg-purple-700"
                        >
                          {isPlayingNarration ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                          {isPlayingNarration ? "Pause Story" : "Play Story"}
                        </Button>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-purple-600 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${narrationProgress}%` }}
                          ></div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center text-gray-400 py-4">
                        <p className="text-sm">Story narration is being prepared...</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Call to Action */}
                <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-lg p-6 border border-blue-800">
                  <div className="text-center space-y-3">
                    <Sparkles className="w-8 h-8 text-yellow-400 mx-auto" />
                    <h4 className="text-xl font-bold text-white">Want to hear this in YOUR voice?</h4>
                    <p className="text-gray-300">Create your own narrator voice in just a few minutes!</p>
                  </div>
                </div>

                {!isAuthenticated && (
                  <div className="bg-blue-950/30 border border-blue-800 rounded-lg p-4">
                    <p className="text-blue-300 text-sm mb-2">
                      Sign in to save your narrator voice and use it in all your stories
                    </p>
                    <Button 
                      onClick={() => window.location.href = "/api/login"}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Sign In & Create Voice
                    </Button>
                  </div>
                )}

                <Button 
                  onClick={handleAcceptInvitation}
                  className="w-full bg-tiktok-red hover:bg-red-600"
                  size="lg"
                >
                  <Mic className="w-5 h-5 mr-2" />
                  Create My Narrator Voice
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            ) : currentStage === "recording" ? (
              <div className="space-y-4">
                {/* Progress Indicator */}
                <div className="bg-gray-900 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Voice Samples Progress</span>
                    <span className="text-sm text-white font-semibold">
                      {emotionRecordings.size} / {MIN_SAMPLES_FOR_CLONING} minimum
                    </span>
                  </div>
                  <Progress 
                    value={(emotionRecordings.size / narratorEmotions.length) * 100} 
                    className="h-2"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Record at least {MIN_SAMPLES_FOR_CLONING} emotions. More samples = better voice quality!
                  </p>
                </div>

                {/* Emotion Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {narratorEmotions.map((emotion) => {
                    const hasRecording = emotionRecordings.has(emotion);
                    const isSelected = selectedEmotion === emotion;
                    
                    return (
                      <button
                        key={emotion}
                        onClick={() => setSelectedEmotion(emotion)}
                        className={`
                          relative p-4 rounded-lg border-2 transition-all
                          ${isSelected 
                            ? 'border-tiktok-red bg-red-950/30' 
                            : hasRecording
                            ? 'border-green-600 bg-green-950/20'
                            : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                          }
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-white font-medium capitalize">{emotion}</span>
                          {hasRecording && <Check className="w-4 h-4 text-green-400" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Voice Recorder */}
                <div className="bg-gray-900 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Record "{selectedEmotion}" Voice
                  </h3>
                  <p className="text-sm text-gray-400 mb-4">
                    Read the sample text with a {selectedEmotion} emotion (15-25 seconds)
                  </p>
                  
                  {/* Voice recording interface with proper sample text */}
                  <div className="bg-black/40 rounded-lg p-4 space-y-3">
                    <div className="text-sm text-gray-300 italic mb-3 p-3 bg-gray-800/50 rounded">
                      {sampleTexts.get(selectedEmotion) || `Loading sample text for ${selectedEmotion}...`}
                    </div>
                    
                    <div className="flex justify-center">
                      <EnhancedVoiceRecorder
                        emotion={selectedEmotion}
                        sampleText={sampleTexts.get(selectedEmotion) || `Express the emotion of ${selectedEmotion} in your voice with genuine feeling`}
                        category="emotions"
                        storyId={invitation?.storyId || 0}
                        onRecordingSaved={handleRecordingSaved}
                        isLocked={false}
                        existingRecording={emotionRecordings.get(selectedEmotion) ? {
                          audioUrl: URL.createObjectURL(emotionRecordings.get(selectedEmotion)!.blob),
                          recordedAt: new Date().toISOString(),
                          duration: 10
                        } : undefined}
                        hideStoryInfo={true}
                        color="purple"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                {emotionRecordings.size >= MIN_SAMPLES_FOR_CLONING && (
                  <Button 
                    onClick={handleSubmitAllRecordings}
                    className="w-full bg-green-600 hover:bg-green-700"
                    size="lg"
                    disabled={createVoiceCloneMutation.isPending}
                  >
                    {createVoiceCloneMutation.isPending ? (
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="w-5 h-5 mr-2" />
                    )}
                    Create My Narrator Voice ({emotionRecordings.size} emotions)
                  </Button>
                )}
              </div>
            ) : (
              /* Generating Stage */
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-lg p-8 border border-blue-800">
                  <div className="text-center space-y-4">
                    <Loader2 className="w-12 h-12 text-blue-400 animate-spin mx-auto" />
                    <h3 className="text-xl font-semibold text-white">Creating Your Narrator Voice</h3>
                    <p className="text-gray-300">
                      {createVoiceCloneMutation.isPending 
                        ? "Processing your voice samples..."
                        : "Generating story narration with your voice..."}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}