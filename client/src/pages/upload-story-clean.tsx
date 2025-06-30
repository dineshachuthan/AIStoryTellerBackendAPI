import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { BottomNavigation } from "@/components/bottom-navigation";

export default function UploadStoryClean() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [storyTitle, setStoryTitle] = useState("");
  const [storyContent, setStoryContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);

  // Load pre-filled content from session storage (from audio transcription)
  useEffect(() => {
    const prefilledContent = sessionStorage.getItem('prefilledStoryContent');
    const prefilledTitle = sessionStorage.getItem('prefilledStoryTitle');
    
    if (prefilledContent) {
      setIsLoadingContent(true);
      setTimeout(() => {
        setStoryContent(prefilledContent);
        if (prefilledTitle) setStoryTitle(prefilledTitle);
        setIsLoadingContent(false);
        sessionStorage.removeItem('prefilledStoryContent');
        sessionStorage.removeItem('prefilledStoryTitle');
      }, 1000);
    }
  }, []);

  const handleSubmit = async () => {
    if (!storyContent.trim()) return;
    
    setIsSubmitting(true);
    try {
      const response = await apiRequest('/api/stories', {
        method: 'POST',
        body: {
          title: storyTitle || 'Untitled Story',
          content: storyContent,
          uploadType: 'text',
          category: 'General'
        }
      });
      
      setLocation(`/story/${response.id}`);
    } catch (error) {
      console.error('Error creating story:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const wordCount = storyContent.trim() ? storyContent.trim().split(/\s+/).length : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-white">
            <CardContent className="p-6">
              {/* Simple header with title and language */}
              <div className="flex items-center justify-between mb-4">
                <Input 
                  value={storyTitle}
                  onChange={(e) => setStoryTitle(e.target.value)}
                  placeholder="Story title (optional)..."
                  className="w-80 bg-white/10 border-white/20 text-white placeholder-white/40"
                />
                <span className="text-xs text-white/50">Language: English</span>
              </div>

              {/* Main story content - takes up most of the space */}
              {isLoadingContent ? (
                <div className="min-h-[500px] bg-white/10 border-white/20 rounded-md flex items-center justify-center border-2 border-dashed">
                  <div className="text-center space-y-4">
                    <Loader2 className="w-8 h-8 animate-spin text-white mx-auto" />
                    <div className="space-y-2">
                      <p className="text-white font-medium">Processing your audio...</p>
                      <p className="text-white/60 text-sm">Converting speech to text using AI transcription</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <Textarea
                    value={storyContent}
                    onChange={(e) => setStoryContent(e.target.value)}
                    placeholder="Write your story here... (500-1000 words recommended)"
                    className="min-h-[500px] bg-white/10 border-white/20 text-white placeholder-white/50 resize-none text-base leading-relaxed"
                  />
                  
                  {/* Word count and submit */}
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-white/60">
                      <span>Word count: {wordCount}</span>
                      <span className="ml-4 text-white/40">Recommended: 500-1000 words</span>
                    </div>
                    
                    <Button
                      onClick={handleSubmit}
                      disabled={!storyContent.trim() || isSubmitting}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating Story...
                        </>
                      ) : (
                        'Create Story'
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      <BottomNavigation />
    </div>
  );
}