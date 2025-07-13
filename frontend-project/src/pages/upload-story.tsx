import { useState, useEffect, useCallback } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

import { ArrowLeft, RefreshCw, Loader2, FileText, Upload, Plus } from "lucide-react";
import { AppTopNavigation } from "@/components/app-top-navigation";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast, toastMessages } from "@/lib/toast-utils";
import { UIMessages } from '@/config/i18n-config';
import { getMessage } from '@/lib/i18n';

export default function UploadStory() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  
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
  const [selectedLanguage, setSelectedLanguage] = useState("en-US");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [originalContent, setOriginalContent] = useState(""); // Track original content for change detection
  
  // Fetch existing story if storyId is present
  const { data: existingStory, isLoading: storyLoading, error: storyError } = useQuery({
    queryKey: ['/api/stories', storyId],
    queryFn: () => apiClient.stories.get(parseInt(storyId)),
    enabled: !!storyId,
  });

  // Type guard for existingStory
  const story = existingStory as any;
  


  // Audio transcription mutation for intermediate pages
  const transcribeAudioMutation = useMutation({
    mutationFn: async (audioBlob: Blob) => {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');
      
      return await apiClient.audio.transcribe(formData);
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
      let errorMessage = getMessage('upload_story.errors.audio_conversion_failed');
      let errorDetails = ";
      
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

  // Separate effect for existing story data population
  useEffect(() => {
    if (storyId && story && !storyLoading) {
      setStoryTitle(story.title || "");
      setStoryContent(story.content || "");
      setOriginalContent(story.content || ""); // Track original content for change detection
      setHasLoadedOnce(true);
    }
  }, [storyId, story, storyLoading]);

  // Modular OnLoad function to handle different page entry flows
  useEffect(() => {
    if (hasLoadedOnce) return; // Prevent multiple executions
    
    const handlePageLoad = async () => {
      // Flow 1: Existing story (handled by separate useEffect above)
      if (storyId && !storyLoading) {
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
            toast.error(toastMessages.uploadFailed('Audio processing failed'));
            setHasLoadedOnce(true);
          }
          return;
        }
        
        // Fallback logic goes here
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
      toast.error(toastMessages.saveFailed('Story ID missing'));
      return;
    }

    if (!storyContent.trim()) {
      toast.error(toastMessages.saveFailed('Story content is empty'));
      return;
    }

    try {
      const updatedStory = await apiClient.stories.updateContent(parseInt(storyId), {
        title: storyTitle.trim() || story?.title || getMessage('upload_story.defaults.untitled_story'),
        content: storyContent,
        language: selectedLanguage
      });

      console.log('Story content updated:', updatedStory);
      
      // Only show "Content Saved" if content actually changed
      const hasContentChanged = storyContent.trim() !== originalContent.trim();
      if (hasContentChanged) {
        toast.success(toastMessages.saveSuccess('story content'));
        // Update the original content after successful save
        setOriginalContent(storyContent);
      }
    } catch (error) {
      console.error("Content update error:", error);
      toast.error(toastMessages.saveFailed('Failed to save story content'));
    }
  }

  // Analyze story and trigger dual analysis
  async function analyzeStory() {
    if (!storyId) {
      toast.error(toastMessages.saveFailed('No story selected'));
      return;
    }

    if (!storyContent.trim()) {
      toast.error(toastMessages.saveFailed('Cannot analyze empty content'));
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
      toast.error(toastMessages.saveFailed('Failed to start analysis'));
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
            <CardHeader>
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => setLocation('/')}
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/10"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {getMessage('upload_story.actions.home')}
                </Button>
                <div>
                  <CardTitle className="text-2xl">{getMessage('upload_story.title.create_your_story')}</CardTitle>
                  <CardDescription className="text-white/70">
                    {getMessage('upload_story.title.description')}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Title Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">{UIMessages.getLabel('STORY_TITLE_LABEL')}</label>
                <Input
                  value={storyTitle}
                  onChange={(e) => setStoryTitle(e.target.value)}
                  placeholder={UIMessages.getLabel('STORY_TITLE_PLACEHOLDER')}
                  className="bg-white/10 border-white/20 text-white placeholder-white/50"
                />
              </div>

              {/* Language Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-white">{UIMessages.getLabel('LANGUAGE_LABEL')}</Label>
                <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder={UIMessages.getLabel('SELECT_LANGUAGE_PLACEHOLDER')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en-US">{getMessage('upload_story.languages.english')}</SelectItem>
                    <SelectItem value="es-ES">{getMessage('upload_story.languages.spanish')}</SelectItem>
                    <SelectItem value="fr-FR">{getMessage('upload_story.languages.french')}</SelectItem>
                    <SelectItem value="de-DE">{getMessage('upload_story.languages.german')}</SelectItem>
                    <SelectItem value="it-IT">{getMessage('upload_story.languages.italian')}</SelectItem>
                    <SelectItem value="pt-BR">{getMessage('upload_story.languages.portuguese')}</SelectItem>
                    <SelectItem value="ja-JP">{getMessage('upload_story.languages.japanese')}</SelectItem>
                    <SelectItem value="ko-KR">{getMessage('upload_story.languages.korean')}</SelectItem>
                    <SelectItem value="zh-CN">{getMessage('upload_story.languages.chinese_simplified')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Story Content */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">{UIMessages.getLabel('YOUR_STORY_LABEL')}</label>
                
                {/* Loading state for audio transcription */}
                {isLoadingContent ? (
                  <div className="min-h-[300px] bg-white/10 border-white/20 rounded-md flex items-center justify-center border-2 border-dashed">
                    <div className="text-center space-y-4">
                      <Loader2 className="w-8 h-8 animate-spin text-white mx-auto" />
                      <div className="space-y-2">
                        <p className="text-white font-medium">{getMessage('upload_story.processing.audio_processing')}</p>
                        <p className="text-white/60 text-sm">{getMessage('upload_story.processing.audio_transcription')}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Textarea
                    value={storyContent}
                    onChange={(e) => setStoryContent(e.target.value)}
                    placeholder={getMessage('upload_story.form.story_placeholder')}
                    className="min-h-[300px] bg-white/10 border-white/20 text-white placeholder-white/50 resize-none"
                  />
                )}
                
                <div className="flex justify-between text-sm text-white/60">
                  <span>{getMessage('upload_story.form.word_count', { count: storyContent.trim() ? storyContent.trim().split(/\s+/).length : 0 })}</span>
                  <span>{getMessage('upload_story.form.word_count_recommendation')}</span>
                </div>
              </div>
              
              {/* Compact Story Status */}
              {story && (
                <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-md">
                  <FileText className="w-3 h-3 text-green-400" />
                  <span className="text-sm text-green-300">{story.title}</span>
                  <span className="text-xs text-green-400/70 ml-auto">
                    {story.status === 'draft' ? getMessage('upload_story.status.draft') : story.status || getMessage('upload_story.status.draft')}
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
                        {getMessage('upload_story.actions.starting_analysis')}
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        {getMessage('upload_story.actions.analyze_story')}
                      </>
                    )}
                  </Button>
                ) : (
                  // Fallback for direct navigation without story ID
                  <div className="text-center p-6">
                    <p className="text-white/70 mb-4">{getMessage('upload_story.errors.no_story_created')}</p>
                    <Button
                      onClick={() => setLocation("/")}
                      variant="outline"
                      className="border-white/20 text-white hover:bg-white/10"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      {getMessage('upload_story.actions.go_home')}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
    </div>
  );
}