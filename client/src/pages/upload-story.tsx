import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { BottomNavigation } from "@/components/bottom-navigation";
import { AppTopNavigation } from "@/components/app-top-navigation";
import { 
  RefreshCw,
  Loader2,
  Heart
} from "lucide-react";

// Story analysis interface
interface StoryAnalysis {
  characters: Array<{
    name: string;
    description: string;
    personality: string;
    role: string;
    appearance?: string;
    traits: string[];
  }>;
  emotions: Array<{
    emotion: string;
    intensity: number;
    context: string;
    quote?: string;
  }>;
  summary: string;
  category: string;
  themes: string[];
  suggestedTags: string[];
  isAdultContent: boolean;
}

export default function UploadStory() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Ensure user is authenticated before allowing story creation
  if (!user?.id) {
    return (
      <div className="min-h-screen bg-dark-bg text-dark-text flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-4">Authentication Required</h2>
          <p className="text-gray-400 mb-4">Please log in to create stories.</p>
          <Button onClick={() => setLocation("/")}>Go to Home</Button>
        </div>
      </div>
    );
  }
  
  // Story management states
  const [storyContent, setStoryContent] = useState("");
  const [storyTitle, setStoryTitle] = useState("");
  const [analysis, setAnalysis] = useState<StoryAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const generateTitleFromContent = (content: string, analysis: StoryAnalysis | null): string => {
    if (analysis?.characters && analysis.characters.length > 0) {
      const mainCharacter = analysis.characters[0].name;
      return `${mainCharacter} and the ${analysis.category || 'story'}`;
    }
    
    const firstLine = content.split('\n')[0];
    if (firstLine.length > 50) {
      return firstLine.substring(0, 47) + "...";
    }
    return firstLine || "Untitled Story";
  };

  const createStoryFromAnalysis = async (analysisData: StoryAnalysis, content: string) => {
    if (!user?.id) {
      throw new Error("User authentication required");
    }

    try {
      const finalTitle = storyTitle.trim() || generateTitleFromContent(content, analysisData) || "Untitled Story";

      const storyData = {
        title: finalTitle,
        content: content,
        category: analysisData.category || 'General',
        summary: analysisData.summary || null,
        isAdultContent: analysisData.isAdultContent || false,
        authorId: user.id,
        uploadType: 'manual',
      };

      const story = await apiRequest('/api/stories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(storyData),
      });

      // Create characters
      for (const character of analysisData.characters) {
        await apiRequest(`/api/stories/${story.id}/characters`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: character.name,
            description: character.description,
            personality: character.personality,
            role: character.role,
            appearance: character.appearance,
            traits: character.traits,
          }),
        });
      }

      // Create emotions
      for (const emotion of analysisData.emotions) {
        await apiRequest(`/api/stories/${story.id}/emotions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            emotion: emotion.emotion,
            intensity: emotion.intensity,
            context: emotion.context,
          }),
        });
      }

      return story;

    } catch (error) {
      throw error;
    }
  };

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

      // Store analysis in localStorage for the analysis page
      localStorage.setItem('storyAnalysis', JSON.stringify({
        analysis: analysisResponse,
        content: storyContent,
        title: storyTitle || 'Untitled Story'
      }));
      
      // Navigate to analysis page
      setLocation('/story-analysis');
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
              <CardTitle className="text-2xl font-bold">Create Your Story</CardTitle>
              <CardDescription className="text-gray-300">
                Upload or write your story and let AI analyze it for you
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Story Input */}
              <div>
                <label className="block text-sm font-medium mb-2">Story Title</label>
                <Input
                  value={storyTitle}
                  onChange={(e) => setStoryTitle(e.target.value)}
                  placeholder="Enter a title for your story..."
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Story Content</label>
                <Textarea
                  value={storyContent}
                  onChange={(e) => setStoryContent(e.target.value)}
                  placeholder="Write or paste your story here..."
                  rows={12}
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 resize-none"
                />
              </div>
              
              {/* Analysis Section */}
              {analysis && (
                <div className="mt-8 space-y-6">
                  <h3 className="text-xl font-semibold">Story Analysis</h3>
                  
                  {/* Characters */}
                  {analysis.characters && analysis.characters.length > 0 && (
                    <div>
                      <h4 className="text-lg font-medium mb-3">Characters ({analysis.characters.length})</h4>
                      <div className="grid gap-3">
                        {analysis.characters.map((character, index) => (
                          <Card key={index} className="bg-white/5 border-white/10">
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <Avatar className="w-12 h-12">
                                  <AvatarFallback className="bg-purple-600 text-white">
                                    {character.name.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <h5 className="font-medium text-white">{character.name}</h5>
                                  <p className="text-sm text-gray-300 mb-2">{character.description}</p>
                                  <div className="flex flex-wrap gap-1">
                                    <Badge variant="secondary" className="text-xs">
                                      {character.role}
                                    </Badge>
                                    {character.traits.slice(0, 3).map((trait, i) => (
                                      <Badge key={i} variant="outline" className="text-xs border-white/20 text-gray-300">
                                        {trait}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Emotions */}
                  {analysis.emotions && analysis.emotions.length > 0 && (
                    <div>
                      <h4 className="text-lg font-medium mb-3">Emotions ({analysis.emotions.length})</h4>
                      <div className="grid gap-2">
                        {analysis.emotions.map((emotion, index) => (
                          <Card key={index} className="bg-white/5 border-white/10">
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
                                    <Heart className="w-4 h-4 text-white" />
                                  </div>
                                  <div>
                                    <span className="font-medium text-white capitalize">{emotion.emotion}</span>
                                    <p className="text-sm text-gray-300">{emotion.context}</p>
                                  </div>
                                </div>
                                <Badge variant="outline" className="border-white/20 text-gray-300">
                                  Intensity: {emotion.intensity}/10
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
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
                
                {analysis && (
                  <>
                    <Button
                      onClick={async () => {
                        try {
                          const story = await createStoryFromAnalysis(analysis, storyContent);
                          toast({
                            title: "Story Created",
                            description: "Your story has been saved successfully!",
                          });
                          setLocation(`/story/${story.id}/play`);
                        } catch (error) {
                          console.error("Story creation failed:", error);
                          toast({
                            title: "Creation Failed",
                            description: "Could not create story. Please try again.",
                            variant: "destructive",
                          });
                        }
                      }}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Create Story
                    </Button>
                    <Button
                      onClick={() => setLocation('/stories')}
                      variant="outline"
                      className="border-white/20 text-white hover:bg-white/10"
                    >
                      View Stories
                    </Button>
                  </>
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