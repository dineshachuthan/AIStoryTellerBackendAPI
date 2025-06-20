import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { AppTopNavigation } from "@/components/app-top-navigation";
import { StoryAnalysisPanel } from "@/components/story/StoryAnalysisPanel";
import { RolePlayAnalysisPanel } from "@/components/story/RolePlayAnalysisPanel";

interface StoryAnalysis {
  characters: Array<{
    name: string;
    description: string;
    personality: string;
    role: 'protagonist' | 'antagonist' | 'supporting' | 'narrator' | 'other';
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
  genre: string;
  themes: string[];
  suggestedTags: string[];
  emotionalTags: string[];
  readingTime: number;
  ageRating: 'general' | 'teen' | 'mature';
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
  const [userVoiceEmotions, setUserVoiceEmotions] = useState<Record<string, boolean>>({});
  const [playingSample, setPlayingSample] = useState<string>("");

  // Handler for when user records an emotion voice
  const handleEmotionRecorded = (emotion: string, audioBlob: Blob) => {
    setUserVoiceEmotions(prev => ({ ...prev, [emotion]: true }));
    toast({
      title: "Voice Recorded",
      description: `Your ${emotion} voice has been saved to your repository.`,
    });
  };

  // Handler for playing emotion sample
  const handlePlayEmotionSample = async (emotion: string, intensity: number) => {
    setPlayingSample(emotion);
    try {
      const response = await fetch('/api/emotions/generate-sample', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emotion,
          intensity,
          text: `This is a sample of ${emotion} emotion with intensity ${intensity}.`
        }),
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        const audio = new Audio(result.audioUrl);
        audio.play();
        audio.onended = () => setPlayingSample("");
      } else {
        throw new Error('Failed to generate sample');
      }
    } catch (error) {
      console.error('Error playing sample:', error);
      setPlayingSample("");
      toast({
        title: "Playback Error",
        description: "Could not play emotion sample.",
        variant: "destructive",
      });
    }
  };

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
        const story = storyData as any;
        const analysis: AnalysisData = {
          analysis: {
            characters: Array.isArray(characters) ? characters : [],
            emotions: Array.isArray(emotions) ? emotions : [],
            summary: story.summary || "",
            category: story.category || "General",
            genre: story.genre || "Fiction",
            themes: Array.isArray(story.themes) ? story.themes : [],
            suggestedTags: Array.isArray(story.tags) ? story.tags : [],
            emotionalTags: Array.isArray(story.emotionalTags) ? story.emotionalTags : [],
            readingTime: story.readingTime || 5,
            ageRating: story.ageRating || 'general',
            isAdultContent: story.isAdultContent || false
          },
          content: story.content || "",
          title: story.title || "Untitled Story"
        };
        setAnalysisData(analysis);
      }).catch(error => {
        console.error('Failed to fetch story details:', error);
        // Fallback to basic story data
        const analysis: AnalysisData = {
          analysis: {
            characters: [],
            emotions: [],
            summary: (storyData as any).summary || "",
            category: (storyData as any).category || "General",
            genre: (storyData as any).genre || "Fiction",
            themes: (storyData as any).themes || [],
            suggestedTags: (storyData as any).tags || [],
            emotionalTags: (storyData as any).emotionalTags || [],
            readingTime: (storyData as any).readingTime || 5,
            ageRating: (storyData as any).ageRating || 'general',
            isAdultContent: (storyData as any).isAdultContent || false
          },
          content: (storyData as any).content,
          title: (storyData as any).title
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

          {/* Main Analysis Tabs */}
          <Tabs defaultValue="narrative" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="narrative">Narrative Analysis</TabsTrigger>
              <TabsTrigger value="roleplay">Role Play Analysis</TabsTrigger>
            </TabsList>

            <TabsContent value="narrative" className="space-y-6">
              <StoryAnalysisPanel
                analysis={analysisData.analysis}
                userVoiceEmotions={userVoiceEmotions}
                onEmotionRecorded={handleEmotionRecorded}
                onPlayEmotionSample={handlePlayEmotionSample}
                isPlayingSample={playingSample}
              />
            </TabsContent>

            <TabsContent value="roleplay" className="space-y-6">
              <RolePlayAnalysisPanel
                storyContent={analysisData.content}
                existingCharacters={analysisData.analysis?.characters || []}
                onAnalysisGenerated={(rolePlayAnalysis) => {
                  console.log('Role-play analysis generated:', rolePlayAnalysis);
                }}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}