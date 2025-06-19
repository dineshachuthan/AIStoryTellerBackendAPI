import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { BottomNavigation } from "@/components/bottom-navigation";
import { AppTopNavigation } from "@/components/app-top-navigation";
import { 
  ArrowLeft, 
  Type, 
  Mic, 
  FileText, 
  Eye, 
  CheckCircle,
  Loader2
} from "lucide-react";

export default function UploadStory() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [storyContent, setStoryContent] = useState("");
  const [storyTitle, setStoryTitle] = useState("");
  const [uploadType, setUploadType] = useState<'text' | 'voice' | 'file'>('text');
  const [analysis, setAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCreatingStory, setIsCreatingStory] = useState(false);

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

  const analyzeStory = async () => {
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

      setAnalysis(analysisResponse);
      
      toast({
        title: "Analysis Complete",
        description: `Found ${analysisResponse.characters?.length || 0} characters and ${analysisResponse.emotions?.length || 0} emotions.`,
      });
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
  };

  const createStory = async () => {
    if (!analysis || !user?.id) {
      toast({
        title: "Missing Information",
        description: "Story analysis and authentication are required.",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingStory(true);

    try {
      const finalTitle = storyTitle.trim() || `Story by ${user.email?.split('@')[0] || 'User'}`;

      const storyData = {
        title: finalTitle,
        content: storyContent,
        category: analysis.category || 'General',
        summary: analysis.summary || null,
        isAdultContent: analysis.isAdultContent || false,
        authorId: user.id,
        uploadType: 'manual',
      };

      const story = await apiRequest('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(storyData),
      });

      // Create characters
      for (const character of analysis.characters || []) {
        await apiRequest(`/api/stories/${story.id}/characters`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
      for (const emotion of analysis.emotions || []) {
        await apiRequest(`/api/stories/${story.id}/emotions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            emotion: emotion.emotion,
            intensity: emotion.intensity,
            context: emotion.context,
          }),
        });
      }

      toast({
        title: "Story Created!",
        description: "Your story has been created successfully.",
      });

      setTimeout(() => {
        setLocation(`/story/${story.id}/play`);
      }, 2000);
    } catch (error) {
      console.error("Story creation error:", error);
      toast({
        title: "Creation Failed",
        description: error instanceof Error ? error.message : "Could not create story. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingStory(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg text-dark-text">
      <AppTopNavigation />
      
      <div className="pt-20 p-4 pb-20">
        <Card className="bg-dark-card border-gray-800 max-w-4xl mx-auto">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/stories")}
                className="text-gray-400 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Stories
              </Button>
            </div>
            <CardTitle className="text-white text-2xl">Create New Story</CardTitle>
            <CardDescription className="text-gray-400">
              Upload your story and bring it to life with AI
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Progress Indicator */}
            <div className="flex items-center space-x-4 mb-8">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step <= currentStep 
                      ? 'bg-tiktok-cyan text-black' 
                      : 'bg-gray-700 text-gray-400'
                  }`}>
                    {step}
                  </div>
                  {step < 3 && <div className={`w-8 h-0.5 ${
                    step < currentStep ? 'bg-tiktok-cyan' : 'bg-gray-700'
                  }`} />}
                </div>
              ))}
            </div>

            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Write Your Story</h3>
                  <div className="space-y-4">
                    <Input
                      placeholder="Story Title (optional)"
                      value={storyTitle}
                      onChange={(e) => setStoryTitle(e.target.value)}
                      className="bg-gray-800 border-gray-700 text-white"
                    />

                    <Textarea
                      placeholder="Write your story here..."
                      value={storyContent}
                      onChange={(e) => setStoryContent(e.target.value)}
                      className="bg-gray-800 border-gray-700 text-white min-h-[300px]"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={() => setCurrentStep(2)}
                    disabled={!storyContent.trim()}
                    className="bg-tiktok-cyan hover:bg-tiktok-cyan/80 text-black"
                  >
                    Next: Analyze Story
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">AI Story Analysis</h3>
                  <p className="text-gray-400 mb-4">
                    Let AI analyze your story to extract characters, emotions, and themes.
                  </p>
                  
                  {!analysis ? (
                    <div className="text-center py-8">
                      <Button
                        onClick={analyzeStory}
                        disabled={isAnalyzing}
                        className="bg-tiktok-pink hover:bg-tiktok-pink/80"
                      >
                        {isAnalyzing ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Analyzing Story...
                          </>
                        ) : (
                          <>
                            <Eye className="w-4 h-4 mr-2" />
                            Analyze with AI
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-medium text-white mb-2">Characters Found</h4>
                          <div className="space-y-2">
                            {(analysis.characters || []).map((char: any, idx: number) => (
                              <div key={idx} className="bg-gray-800 p-3 rounded-lg">
                                <div className="font-medium text-white">{char.name}</div>
                                <div className="text-sm text-gray-400">{char.role}</div>
                                <div className="text-xs text-gray-500">{char.description}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-white mb-2">Emotions Detected</h4>
                          <div className="space-y-2">
                            {(analysis.emotions || []).map((emotion: any, idx: number) => (
                              <div key={idx} className="bg-gray-800 p-3 rounded-lg">
                                <div className="flex justify-between items-center">
                                  <span className="font-medium text-white">{emotion.emotion}</span>
                                  <span className="text-sm text-gray-400">Intensity: {emotion.intensity}/10</span>
                                </div>
                                <div className="text-xs text-gray-500">{emotion.context}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-gray-800 p-4 rounded-lg">
                        <h4 className="font-medium text-white mb-2">Story Summary</h4>
                        <p className="text-gray-400 text-sm">{analysis.summary}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge variant="secondary">{analysis.category}</Badge>
                          {(analysis.themes || []).map((theme: string, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {theme}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex justify-between">
                        <Button
                          variant="outline"
                          onClick={() => setCurrentStep(1)}
                          className="border-gray-600 text-gray-300"
                        >
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Back
                        </Button>
                        <Button
                          onClick={() => setCurrentStep(3)}
                          className="bg-tiktok-cyan hover:bg-tiktok-cyan/80 text-black"
                        >
                          Create Story
                          <Eye className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-white mb-4">Creating Your Story</h3>
                  {!isCreatingStory ? (
                    <div className="space-y-4">
                      <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                      <p className="text-gray-400">Ready to create your interactive story with AI-generated content.</p>
                      <Button
                        onClick={createStory}
                        className="bg-tiktok-cyan hover:bg-tiktok-cyan/80 text-black"
                      >
                        Create Story Now
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Loader2 className="w-16 h-16 text-tiktok-cyan mx-auto animate-spin" />
                      <p className="text-gray-400">Creating your story with characters and emotions...</p>
                      <div className="text-sm text-gray-500">This may take a moment</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <BottomNavigation />
    </div>
  );
}