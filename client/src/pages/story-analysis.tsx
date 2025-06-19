import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Users, Heart, BookOpen, Tag, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { AppTopNavigation } from "@/components/app-top-navigation";

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

interface AnalysisData {
  analysis: StoryAnalysis;
  content: string;
  title: string;
}

export default function StoryAnalysis() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('storyAnalysis');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setAnalysisData(parsed);
      } catch (error) {
        console.error('Failed to parse stored analysis:', error);
        setLocation('/upload-story');
      }
    } else {
      setLocation('/upload-story');
    }
  }, [setLocation]);

  const createStoryFromAnalysis = async (analysisData: StoryAnalysis, content: string, title: string) => {
    if (!user?.id) {
      throw new Error("User authentication required");
    }

    try {
      const storyData = {
        title: title.trim() || "Untitled Story",
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

  const handleCreateStory = async () => {
    if (!analysisData) return;

    setIsCreating(true);
    try {
      const story = await createStoryFromAnalysis(analysisData.analysis, analysisData.content, analysisData.title);
      
      // Clear stored analysis
      localStorage.removeItem('storyAnalysis');
      
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
    } finally {
      setIsCreating(false);
    }
  };

  if (!analysisData) {
    return <div>Loading...</div>;
  }

  const { analysis } = analysisData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <AppTopNavigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Button
              onClick={() => {
                localStorage.removeItem('storyAnalysis');
                setLocation('/upload-story');
              }}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Editor
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">{analysisData.title}</h1>
              <p className="text-white/70">Story Analysis Complete</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Characters */}
            <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-white">
              <CardHeader>
                <CardTitle className="flex items-center text-xl">
                  <Users className="w-5 h-5 mr-2 text-blue-400" />
                  Characters ({analysis.characters.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {analysis.characters.map((character, index) => (
                  <div key={index} className="bg-white/5 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-white">{character.name}</h3>
                      <Badge variant="outline" className="border-white/30 text-white/70">
                        {character.role}
                      </Badge>
                    </div>
                    <p className="text-white/80 text-sm mb-2">{character.description}</p>
                    <p className="text-white/70 text-sm mb-3">{character.personality}</p>
                    <div className="flex flex-wrap gap-1">
                      {character.traits.map((trait, traitIndex) => (
                        <Badge key={traitIndex} variant="secondary" className="text-xs bg-white/10 text-white/80">
                          {trait}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Emotions */}
            <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-white">
              <CardHeader>
                <CardTitle className="flex items-center text-xl">
                  <Heart className="w-5 h-5 mr-2 text-red-400" />
                  Emotions ({analysis.emotions.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {analysis.emotions.map((emotion, index) => (
                  <div key={index} className="bg-white/5 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-white capitalize">{emotion.emotion}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white/70">Intensity:</span>
                        <Badge className="bg-gradient-to-r from-yellow-500 to-red-500">
                          {emotion.intensity}/10
                        </Badge>
                      </div>
                    </div>
                    <p className="text-white/80 text-sm mb-2">{emotion.context}</p>
                    {emotion.quote && (
                      <blockquote className="text-white/70 text-sm italic border-l-2 border-white/30 pl-3">
                        "{emotion.quote}"
                      </blockquote>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Story Summary */}
            <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-white lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center text-xl">
                  <BookOpen className="w-5 h-5 mr-2 text-green-400" />
                  Story Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white/90 leading-relaxed">{analysis.summary}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge className="bg-purple-600">{analysis.category}</Badge>
                  {analysis.themes.map((theme, index) => (
                    <Badge key={index} variant="outline" className="border-white/30 text-white/70">
                      {theme}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Tags */}
            <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-white lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center text-xl">
                  <Tag className="w-5 h-5 mr-2 text-yellow-400" />
                  Suggested Tags
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {analysis.suggestedTags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="bg-white/10 text-white/80">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mt-8 justify-center">
            <Button
              onClick={handleCreateStory}
              disabled={isCreating}
              className="bg-green-600 hover:bg-green-700 px-8 py-3 text-lg"
            >
              {isCreating ? (
                <>
                  <Sparkles className="w-5 h-5 mr-2 animate-spin" />
                  Creating Story...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Create Story & Start Playing
                </>
              )}
            </Button>
            <Button
              onClick={() => setLocation('/stories')}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10 px-8 py-3 text-lg"
            >
              View All Stories
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}