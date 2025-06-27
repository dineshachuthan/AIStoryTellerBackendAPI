import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, RefreshCw, Loader2, FileText, Upload, Plus } from "lucide-react";
import { AppTopNavigation } from "@/components/app-top-navigation";
import { BottomNavigation } from "@/components/bottom-navigation";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function UploadStory() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Extract story ID from URL if present
  const [match, params] = useRoute("/:storyId/upload-story");
  const storyId = params?.storyId;
  
  // Story management states
  const [storyContent, setStoryContent] = useState("");
  const [storyTitle, setStoryTitle] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Fetch existing story if storyId is present
  const { data: existingStory, isLoading: storyLoading } = useQuery({
    queryKey: ['/api/stories', storyId],
    enabled: !!storyId,
  });

  // Type guard for existingStory
  const story = existingStory as any;

  // Initialize story content from existing story
  useEffect(() => {
    if (story && !storyLoading) {
      setStoryTitle(story.title || "");
      setStoryContent(story.content || "");
    }
  }, [story, storyLoading]);

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
            <CardHeader>
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => setLocation('/')}
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/10"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Home
                </Button>
                <div>
                  <CardTitle className="text-2xl">Create Your Story</CardTitle>
                  <CardDescription className="text-white/70">
                    Write your story and let AI analyze characters and emotions
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Title Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Story Title (Optional)</label>
                <Input
                  value={storyTitle}
                  onChange={(e) => setStoryTitle(e.target.value)}
                  placeholder="Enter your story title..."
                  className="bg-white/10 border-white/20 text-white placeholder-white/50"
                />
              </div>

              {/* Story Content */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Your Story</label>
                <Textarea
                  value={storyContent}
                  onChange={(e) => setStoryContent(e.target.value)}
                  placeholder="Write your story here... (500-1000 words recommended)"
                  className="min-h-[300px] bg-white/10 border-white/20 text-white placeholder-white/50 resize-none"
                />
                <div className="flex justify-between text-sm text-white/60">
                  <span>Word count: {storyContent.trim() ? storyContent.trim().split(/\s+/).length : 0}</span>
                  <span>Recommended: 500-1000 words</span>
                </div>
              </div>
              
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
                  <div className="space-y-3">
                    {/* Step 1: Save content */}
                    <Button
                      onClick={updateStoryContent}
                      disabled={!storyContent.trim() || storyLoading}
                      variant="outline"
                      className="w-full border-white/20 text-white hover:bg-white/10 h-11"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Save Content
                    </Button>
                    
                    {/* Step 2: Analyze story */}
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
                  </div>
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