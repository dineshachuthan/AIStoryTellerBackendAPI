import { useState, useEffect, useCallback } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { ArrowLeft, RefreshCw, Loader2, FileText, Upload, Plus } from "lucide-react";
import { AppTopNavigation } from "@/components/app-top-navigation";
import { BottomNavigation } from "@/components/bottom-navigation";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function UploadStory() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Extract story ID from URL if present, or from sessionStorage
  const [match, params] = useRoute("/:storyId/upload-story");
  const urlStoryId = params?.storyId;
  const sessionStoryId = sessionStorage.getItem('currentStoryId');
  const storyId = urlStoryId || sessionStoryId;
  
  // Check for URL parameters to detect source
  const urlParams = new URLSearchParams(window.location.search);
  const sourceType = urlParams.get('source'); // 'voice' or 'upload'
  
  // Story management states
  const [storyContent, setStoryContent] = useState("");
  const [storyTitle, setStoryTitle] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  
  // Fetch existing story if storyId is present
  const { data: existingStory, isLoading: storyLoading } = useQuery({
    queryKey: ['/api/stories', storyId],
    enabled: !!storyId,
  });

  // Type guard for existingStory
  const story = existingStory as any;

  // Audio transcription mutation for intermediate pages
  const transcribeAudioMutation = useMutation({
    mutationFn: async (audioBlob: Blob) => {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');
      
      const response = await fetch('/api/audio/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to transcribe audio');
      }

      return await response.json();
    },
    onSuccess: (data) => {
      setStoryContent(data.text || '');
      setIsLoadingContent(false);
      
      // Clear session storage after successful transcription
      sessionStorage.removeItem('pendingAudioBlob');
    },
    onError: (error: any) => {
      setIsLoadingContent(false);
      console.error('Transcription error details:', error);
      
      // Extract meaningful error message from server response
      let errorMessage = "Could not convert audio to text. Please try again.";
      let errorDetails = "";
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
        if (error.response.data.details) {
          errorDetails = error.response.data.details;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      console.error('Audio processing failed:', errorDetails ? `${errorMessage} ${errorDetails}` : errorMessage);
    },
  });

  // Track if OnLoad has already been executed to prevent infinite loops
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  // Modular OnLoad function to handle different page entry flows
  useEffect(() => {
    if (hasLoadedOnce) return; // Prevent multiple executions
    
    console.log('OnLoad triggered - analyzing page context...');
    
    const handlePageLoad = async () => {
      // Flow 1: Existing story (from database/search)
      if (storyId && story && !storyLoading) {
        console.log('Flow: Loading existing story from database');
        setStoryTitle(story.title || "");
        setStoryContent(story.content || "");
        setHasLoadedOnce(true);
        return;
      }
      
      // Flow 2: Audio intermediate pages (voice recording or audio upload)
      if (sourceType === 'voice' || sourceType === 'upload') {
        console.log('Flow: Audio intermediate page redirect');
        setIsLoadingContent(true);
        
        // Check for pending audio blob from intermediate pages
        const pendingAudioData = sessionStorage.getItem('pendingAudioBlob');
        if (pendingAudioData) {
          try {
            // Convert base64 back to blob and transcribe
            const response = await fetch(pendingAudioData);
            const audioBlob = await response.blob();
            // Clear immediately to prevent reprocessing
            sessionStorage.removeItem('pendingAudioBlob');
            transcribeAudioMutation.mutate(audioBlob);
            setHasLoadedOnce(true);
          } catch (error) {
            console.error('Error processing pending audio:', error);
            setIsLoadingContent(false);
            sessionStorage.removeItem('pendingAudioBlob');
            toast({
              title: "Audio Processing Failed",
              description: "Could not process the audio file.",
              variant: "destructive",
            });
            setHasLoadedOnce(true);
          }
          return;
        }
        
        // Fallback: Check session storage for pre-transcribed content
        const extractedContent = sessionStorage.getItem('extractedContent') || sessionStorage.getItem('uploadedStoryContent');
        if (extractedContent) {
          console.log('Found pre-transcribed content in session storage');
          setStoryContent(extractedContent);
          sessionStorage.removeItem('extractedContent');
          sessionStorage.removeItem('uploadedStoryContent');
          
          toast({
            title: "Audio Processed Successfully",
            description: `Your audio has been converted to text (${extractedContent.length} characters).`,
          });
        }
        setIsLoadingContent(false);
        setHasLoadedOnce(true);
        return;
      }
      
      // Flow 3: Normal write text flow (default)
      console.log('Flow: Normal write text flow - no action needed');
      setHasLoadedOnce(true);
    };

    handlePageLoad();
  }, [storyId, story, storyLoading, sourceType, hasLoadedOnce]);

  // Update story content
  async function updateStoryContent() {
    if (!storyId) {
      toast({
        title: "No Story ID",
        description: "Story ID is missing.",
        variant: "destructive",
      });
      return;
    }

    if (!storyContent.trim()) {
      toast({
        title: "No Content",
        description: "Please write your story content.",
        variant: "destructive",
      });
      return;
    }

    try {
      const updatedStory = await apiRequest(`/api/stories/${storyId}/content`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: storyTitle.trim() || story?.title || "Untitled Story",
          content: storyContent
        }),
      });

      console.log('Story content updated:', updatedStory);
      
      toast({
        title: "Content Saved",
        description: "Your story content has been saved.",
      });
    } catch (error) {
      console.error("Content update error:", error);
      toast({
        title: "Save Failed",
        description: "Could not save story content. Please try again.",
        variant: "destructive",
      });
    }
  }

  // Analyze story and trigger dual analysis
  async function analyzeStory() {
    if (!storyId) {
      toast({
        title: "No Story",
        description: "Story ID is missing.",
        variant: "destructive",
      });
      return;
    }

    if (!storyContent.trim()) {
      toast({
        title: "No Content",
        description: "Please add content to your story before analyzing.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);

    try {
      // First save any unsaved content
      await updateStoryContent();
      
      // Navigate to analysis page to trigger dual analysis
      setLocation(`/analysis/${storyId}`);
    } catch (error) {
      console.error("Analysis error:", error);
      toast({
        title: "Analysis Failed",
        description: "Could not start analysis. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <AppTopNavigation />
      
      {/* Proper top padding to account for fixed navigation */}
      <div className="container mx-auto px-4 pt-20 pb-28">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <Input 
                  value={storyTitle}
                  onChange={(e) => setStoryTitle(e.target.value)}
                  placeholder="Story title (optional)..."
                  className="w-64 h-9 bg-white/10 border-white/20 text-white placeholder-white/40"
                />
                <span className="text-xs text-white/50">Language: English</span>
              </div>
              
              {/* Loading state for audio transcription */}
              {isLoadingContent ? (
                <div className="min-h-[400px] bg-white/10 border-white/20 rounded-md flex items-center justify-center border-2 border-dashed">
                  <div className="text-center space-y-4">
                    <Loader2 className="w-8 h-8 animate-spin text-white mx-auto" />
                    <div className="space-y-2">
                      <p className="text-white font-medium">Processing your audio...</p>
                      <p className="text-white/60 text-sm">Converting speech to text using AI transcription</p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <Textarea
                    value={storyContent}
                    onChange={(e) => setStoryContent(e.target.value)}
                    placeholder="Write your story here... (500-1000 words recommended)"
                    className="min-h-[400px] bg-white/10 border-white/20 text-white placeholder-white/50 resize-none text-base"
                  />
                  <div className="flex justify-between text-sm text-white/60 mt-2">
                    <span>Word count: {storyContent.trim() ? storyContent.trim().split(/\s+/).length : 0}</span>
                    <span>Recommended: 500-1000 words</span>
                  </div>
                </>
              )}
              
              {/* Compact Story Status */}
              {story && (
                <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-md">
                  <FileText className="w-3 h-3 text-green-400" />
                  <span className="text-sm text-green-300">{story.title}</span>
                  <span className="text-xs text-green-400/70 ml-auto">
                    {story.status === 'draft' ? 'Draft' : story.status || 'Draft'}
                  </span>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="space-y-3 pt-4">
                {storyId ? (
                  <Button
                    onClick={analyzeStory}
                    disabled={isAnalyzing || !storyContent.trim() || storyLoading}
                    className="w-full bg-purple-600 hover:bg-purple-700 h-11"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Starting Analysis...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Analyze Story
                      </>
                    )}
                  </Button>
                ) : (
                  // Fallback for direct navigation without story ID
                  <div className="text-center p-6">
                    <p className="text-white/70 mb-4">Please create a story from the home page to continue.</p>
                    <Button
                      onClick={() => setLocation("/")}
                      variant="outline"
                      className="border-white/20 text-white hover:bg-white/10"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Go Home
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <BottomNavigation />
    </div>
  );
}