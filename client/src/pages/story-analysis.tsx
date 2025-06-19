import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { AppTopNavigation } from "@/components/app-top-navigation";
import { StoryAnalysisOutput } from "@/components/story-analysis-output";

interface StoryAnalysis {
  characters: Array<{
    name: string;
    description: string;
    personality: string;
    role: string;
    appearance?: string;
    traits: string[];
    assignedVoice?: string;
    voiceSampleId?: number;
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
  const params = useParams();
  const storyId = params.storyId;
  
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch story data if storyId is provided
  const { data: storyData, isLoading: storyLoading } = useQuery({
    queryKey: ["/api/stories", storyId],
    enabled: !!storyId && !!user?.id,
  });

  useEffect(() => {
    if (storyId && storyData) {
      // Fetch story characters and emotions
      Promise.all([
        fetch(`/api/stories/${storyId}/characters`).then(res => res.ok ? res.json() : []),
        fetch(`/api/stories/${storyId}/emotions`).then(res => res.ok ? res.json() : [])
      ]).then(([characters, emotions]) => {
        const analysis: AnalysisData = {
          analysis: {
            characters: characters || [],
            emotions: emotions || [],
            summary: storyData.summary || "",
            category: storyData.category || "General",
            themes: [],
            suggestedTags: storyData.tags || [],
            isAdultContent: storyData.isAdultContent || false
          },
          content: storyData.content,
          title: storyData.title
        };
        setAnalysisData(analysis);
      }).catch(error => {
        console.error('Failed to fetch story details:', error);
        // Fallback to basic story data
        const analysis: AnalysisData = {
          analysis: {
            characters: [],
            emotions: [],
            summary: storyData.summary || "",
            category: storyData.category || "General",
            themes: [],
            suggestedTags: storyData.tags || [],
            isAdultContent: storyData.isAdultContent || false
          },
          content: storyData.content,
          title: storyData.title
        };
        setAnalysisData(analysis);
      });
    } else if (!storyId) {
      // Fall back to localStorage for upload flow
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
    }
  }, [storyId, storyData, setLocation]);

  const generateTitleFromContent = (content: string, analysis: StoryAnalysis): string => {
    // Use the first character name + category as a simple title
    if (analysis.characters.length > 0) {
      const mainCharacter = analysis.characters.find(char => char.role === 'protagonist') || analysis.characters[0];
      return `${mainCharacter.name} and the ${analysis.category}`;
    }
    
    // Fallback to content-based title
    if (analysis.summary) {
      const words = analysis.summary.split(' ').slice(0, 6);
      return words.join(' ') + (words.length >= 6 ? '...' : '');
    }
    
    const firstSentence = content.split('.')[0] || content.substring(0, 50);
    const words = firstSentence.trim().split(' ').slice(0, 5);
    return words.join(' ') + (words.length >= 5 ? '...' : '');
  };

  const createStoryFromAnalysis = async (analysisData: StoryAnalysis, content: string, title: string) => {
    if (!user?.id) {
      throw new Error("User authentication required");
    }

    try {
      const finalTitle = title.trim() || generateTitleFromContent(content, analysisData) || "Untitled Story";
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

      return story;
    } catch (error) {
      throw error;
    }
  };

  const handleCreateStory = async (analysis: StoryAnalysis, content: string, title: string) => {
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to create stories",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const story = await createStoryFromAnalysis(analysis, content, title);
      
      if (!storyId) {
        localStorage.removeItem('storyAnalysis');
      }
      
      toast({
        title: "Story Created",
        description: "Your story has been saved successfully!",
      });
      
      setLocation(`/story/${story.id}`);
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

  const handleUpdateStory = async (storyId: number) => {
    setIsUpdating(true);
    try {
      // For now, just show a success message - in future this could save character/emotion updates
      toast({
        title: "Story Updated",
        description: "Navigating to story player...",
      });
      
      // Navigate to play page after updating
      setTimeout(() => {
        setLocation(`/story/${storyId}`);
      }, 1000);
    } catch (error) {
      console.error("Story update failed:", error);
      toast({
        title: "Update Failed",
        description: "Could not update story. Please try again.",
        variant: "destructive",
      });
      setIsUpdating(false);
    }
  };



  if (storyLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white">Loading story...</div>
      </div>
    );
  }

  if (!analysisData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white">Loading analysis...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <AppTopNavigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Button
              onClick={() => {
                if (!storyId) {
                  localStorage.removeItem('storyAnalysis');
                }
                setLocation(storyId ? '/stories' : '/upload-story');
              }}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {storyId ? 'Back to Stories' : 'Back to Editor'}
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">{analysisData.title}</h1>
              <p className="text-white/70">Character & Emotion Analysis</p>
            </div>
          </div>

          {/* Use the reusable StoryAnalysisOutput component */}
          <StoryAnalysisOutput
            analysis={analysisData.analysis}
            content={analysisData.content}
            title={analysisData.title}
            onCreateStory={handleCreateStory}
            showCreateButton={!storyId} // Only show create button for new stories
            isCreating={isCreating}
            storyId={storyId ? parseInt(storyId) : undefined}
            onUpdateStory={handleUpdateStory}
            isUpdating={isUpdating}
            isPrivateStory={!!storyId} // For now, show buttons for all existing stories
          />
        </div>
      </div>
    </div>
  );
}