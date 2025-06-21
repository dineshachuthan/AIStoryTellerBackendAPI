import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, RefreshCw, Loader2, FileText, Upload, Plus } from "lucide-react";
import { AppTopNavigation } from "@/components/app-top-navigation";
import { BottomNavigation } from "@/components/bottom-navigation";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";

export default function UploadStory() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Story management states
  const [storyContent, setStoryContent] = useState("");
  const [storyTitle, setStoryTitle] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [draftStory, setDraftStory] = useState<any>(null);
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);

  // Create new draft story
  async function createDraftStory() {
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to create stories.",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingDraft(true);

    try {
      const draft = await apiRequest('/api/stories/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: storyTitle.trim() || "Untitled Story"
        }),
      });

      console.log('Draft story created:', draft);
      setDraftStory(draft);
      
      toast({
        title: "Story Created",
        description: "Your draft story has been created. You can now add content.",
      });
    } catch (error) {
      console.error("Draft creation error:", error);
      toast({
        title: "Creation Failed",
        description: "Could not create draft story. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingDraft(false);
    }
  }

  // Update story content
  async function updateStoryContent() {
    if (!draftStory?.id) {
      toast({
        title: "No Draft Story",
        description: "Please create a story first.",
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
      const updatedStory = await apiRequest(`/api/stories/${draftStory.id}/content`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: storyTitle.trim() || draftStory.title,
          content: storyContent
        }),
      });

      console.log('Story content updated:', updatedStory);
      setDraftStory(updatedStory);
      
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
    if (!draftStory?.id) {
      toast({
        title: "No Story",
        description: "Please create and save your story first.",
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
      setLocation(`/analysis/${draftStory.id}`);
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
      
      <div className="container mx-auto px-4 py-8">
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
            <CardContent className="space-y-6">
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
                  className="min-h-[400px] bg-white/10 border-white/20 text-white placeholder-white/50 resize-none"
                />
                <div className="flex justify-between text-sm text-white/60">
                  <span>Word count: {storyContent.trim().split(/\s+/).filter(word => word.length > 0).length}</span>
                  <span>Recommended: 500-1000 words</span>
                </div>
              </div>
              
              {/* Draft Story Status */}
              {draftStory && (
                <div className="p-4 bg-green-500/20 border border-green-500/30 rounded-lg">
                  <div className="flex items-center gap-2 text-green-400">
                    <FileText className="w-4 h-4" />
                    <span className="text-sm font-medium">Draft Story: {draftStory.title}</span>
                  </div>
                  <p className="text-xs text-green-300 mt-1">Status: {draftStory.status || 'draft'}</p>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="space-y-4 pt-6">
                {!draftStory ? (
                  // Step 1: Create new story
                  <Button
                    onClick={createDraftStory}
                    disabled={isCreatingDraft}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {isCreatingDraft ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating Story...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Create New Story
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="space-y-3">
                    {/* Step 2: Save content */}
                    <Button
                      onClick={updateStoryContent}
                      disabled={!storyContent.trim()}
                      variant="outline"
                      className="w-full border-white/20 text-white hover:bg-white/10"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Save Content
                    </Button>
                    
                    {/* Step 3: Analyze story */}
                    <Button
                      onClick={analyzeStory}
                      disabled={isAnalyzing || !storyContent.trim()}
                      className="w-full bg-purple-600 hover:bg-purple-700"
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