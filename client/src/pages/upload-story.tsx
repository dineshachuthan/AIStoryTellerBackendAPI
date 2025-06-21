import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, RefreshCw, Loader2, FileText, Upload } from "lucide-react";
import { AppTopNavigation } from "@/components/app-top-navigation";
import { BottomNavigation } from "@/components/bottom-navigation";
import { apiRequest } from "@/lib/queryClient";

export default function UploadStory() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Story management states
  const [storyContent, setStoryContent] = useState("");
  const [storyTitle, setStoryTitle] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  async function analyzeStory() {
    if (!storyContent.trim()) {
      toast({
        title: "No Content",
        description: "Please write your story first.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);

    try {
      const analysisResponse = await apiRequest('/api/stories/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: storyContent }),
      });

      // Generate intelligent title if none provided
      const generateTitleFromAnalysis = (analysis: any, content: string): string => {
        if (analysis.characters?.length > 0) {
          const mainCharacter = analysis.characters.find((c: any) => c.role === 'protagonist') || analysis.characters[0];
          const themes = analysis.themes || [];
          
          if (themes.length > 0) {
            return `${mainCharacter.name} and the ${themes[0]}`;
          }
          
          return `The ${analysis.category} of ${mainCharacter.name}`;
        }
        
        if (analysis.summary) {
          const words = analysis.summary.split(' ').slice(0, 6);
          return words.join(' ') + (words.length >= 6 ? '...' : '');
        }
        
        const firstSentence = content.split('.')[0] || content.substring(0, 50);
        const words = firstSentence.trim().split(' ').slice(0, 5);
        return words.join(' ') + (words.length >= 5 ? '...' : '');
      };

      const finalTitle = storyTitle.trim() || generateTitleFromAnalysis(analysisResponse, storyContent);

      // Create story in database first
      const createResponse = await apiRequest('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: finalTitle,
          content: storyContent,
          isPublic: false
        }),
      });

      console.log('Story created:', createResponse);
      
      // Navigate to analysis page with the new story ID to trigger dual analysis
      setLocation(`/analysis/${createResponse.id}`);
    } catch (error) {
      console.error("Analysis error:", error);
      toast({
        title: "Analysis Failed",
        description: "Could not analyze story. Please try again.",
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
              
              {/* Action Buttons */}
              <div className="flex gap-4 pt-6">
                <Button
                  onClick={analyzeStory}
                  disabled={isAnalyzing || !storyContent.trim()}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Analyze Story
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <BottomNavigation />
    </div>
  );
}