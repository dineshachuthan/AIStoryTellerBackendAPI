import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Clock, Users, Film, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  const [match, params] = useRoute("/analysis/:storyId");
  const storyId = params?.storyId;
  
  console.log('Route match:', match);
  console.log('Route params:', params);
  console.log('Extracted storyId:', storyId);
  
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [rolePlayAnalysis, setRolePlayAnalysis] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoadingAnalyses, setIsLoadingAnalyses] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<{
    narrative: boolean;
    roleplay: boolean;
  }>({ narrative: false, roleplay: false });
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

  // Generate both narrative and roleplay analyses automatically
  const generateComprehensiveAnalysis = async (story: any) => {
    console.log('Starting comprehensive analysis for story:', storyId);
    setIsLoadingAnalyses(true);
    setAnalysisProgress({ narrative: false, roleplay: false });

    try {
      // Generate narrative analysis first
      console.log('Calling narrative endpoint:', `/api/stories/${storyId}/narrative`);
      const narrativeResponse = await apiRequest(`/api/stories/${storyId}/narrative`, {
        method: 'POST',
        credentials: 'include'
      });

      const narrativeAnalysis: AnalysisData = {
        analysis: narrativeResponse,
        content: story.content || "",
        title: story.title || "Untitled Story"
      };
      setAnalysisData(narrativeAnalysis);
      setAnalysisProgress(prev => ({ ...prev, narrative: true }));

      // Generate roleplay analysis
      try {
        console.log('Calling roleplay endpoint:', `/api/stories/${storyId}/roleplay`);
        const rolePlayResponse = await apiRequest(`/api/stories/${storyId}/roleplay`, {
          method: 'POST',
          credentials: 'include'
        });
        console.log('Roleplay analysis completed successfully');
        setRolePlayAnalysis(rolePlayResponse);
        setAnalysisProgress(prev => ({ ...prev, roleplay: true }));
      } catch (roleplayError: any) {
        console.error('Roleplay analysis error:', roleplayError);
        setAnalysisProgress(prev => ({ ...prev, roleplay: false }));
        setRolePlayAnalysis(null);
      }

    } catch (error) {
      console.error('Failed to generate comprehensive analysis:', error);
      
      // Fallback to basic story data for narrative
      const analysis: AnalysisData = {
        analysis: {
          characters: [],
          emotions: [],
          summary: story.summary || "",
          category: story.category || "General",
          genre: story.genre || "Fiction",
          themes: story.themes || [],
          suggestedTags: story.tags || [],
          emotionalTags: story.emotionalTags || [],
          readingTime: story.readingTime || 5,
          ageRating: story.ageRating || 'general',
          isAdultContent: story.isAdultContent || false
        },
        content: story.content,
        title: story.title
      };
      setAnalysisData(analysis);
      setAnalysisProgress({ narrative: true, roleplay: false });
    } finally {
      setIsLoadingAnalyses(false);
    }
  };

  useEffect(() => {
    console.log('StoryAnalysis useEffect triggered:', { storyId, hasStoryData: !!storyData, userId: user?.id });
    
    if (storyId && storyData && user?.id) {
      console.log('Triggering dual analysis for existing story');
      // Automatically generate both analyses when story data is available
      generateComprehensiveAnalysis(storyData);
    } else if (!storyId) {
      console.log('No storyId - checking localStorage for upload flow');
      // Fall back to localStorage for upload flow
      const stored = localStorage.getItem('storyAnalysis');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          console.log('Found stored analysis, using it');
          setAnalysisData(parsed);
        } catch (error) {
          console.error('Failed to parse stored analysis:', error);
          setLocation('/upload-story');
        }
      } else {
        setLocation('/upload-story');
      }
    } else {
      console.log('Waiting for story data or user auth...');
    }
  }, [storyId, storyData, user?.id, setLocation]);

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



  if (storyLoading || isLoadingAnalyses) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-8 max-w-md w-full mx-4">
          <div className="text-center text-white space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
            <h3 className="text-xl font-semibold">
              {storyLoading ? "Loading Story" : "Generating Analysis"}
            </h3>
            {isLoadingAnalyses && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span>Narrative Analysis</span>
                  {analysisProgress.narrative ? (
                    <span className="text-green-400">✓ Complete</span>
                  ) : (
                    <span className="text-yellow-400">Processing...</span>
                  )}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Roleplay Analysis</span>
                  {analysisProgress.roleplay ? (
                    <span className="text-green-400">✓ Complete</span>
                  ) : analysisProgress.narrative ? (
                    <span className="text-yellow-400">Processing...</span>
                  ) : (
                    <span className="text-gray-400">Waiting...</span>
                  )}
                </div>
                <div className="w-full bg-white/20 rounded-full h-2">
                  <div 
                    className="bg-purple-400 h-2 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${(
                        (analysisProgress.narrative ? 50 : 0) + 
                        (analysisProgress.roleplay ? 50 : 0)
                      )}%` 
                    }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!analysisData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white">No analysis data available.</div>
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
              {rolePlayAnalysis ? (
                <div className="space-y-6">
                  {/* Analysis Overview */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Film className="h-5 w-5" />
                        {rolePlayAnalysis.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{rolePlayAnalysis.genre}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{rolePlayAnalysis.estimatedPlaytime} min</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Film className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{rolePlayAnalysis.totalScenes} scenes</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{rolePlayAnalysis.characters.length} characters</span>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-2">Overall Tone</h4>
                          <Badge variant="outline">{rolePlayAnalysis.overallTone}</Badge>
                        </div>
                        
                        <div>
                          <h4 className="font-medium mb-2">Characters</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {rolePlayAnalysis.characters.map((character: any, index: number) => (
                              <div key={index} className="border rounded-lg p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                  <h5 className="font-medium">{character.name}</h5>
                                  <Badge variant="outline" className="text-xs">
                                    {character.role}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">{character.personality}</p>
                                <p className="text-xs text-muted-foreground">Voice: {character.voiceProfile}</p>
                                {character.costumeSuggestion && (
                                  <p className="text-xs text-muted-foreground">Costume: {character.costumeSuggestion}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Scenes */}
                  {rolePlayAnalysis.scenes.map((scene: any, sceneIndex: number) => (
                    <Card key={scene.sceneNumber}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <span className="bg-purple-100 text-purple-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
                            {scene.sceneNumber}
                          </span>
                          {scene.title}
                        </CardTitle>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {Math.floor(scene.estimatedDuration / 60)}:{(scene.estimatedDuration % 60).toString().padStart(2, '0')}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {scene.emotionalTone}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Scene Background */}
                        <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 space-y-3">
                          <h4 className="font-medium flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            Scene Background
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium">Location:</span> {scene.background.location}
                            </div>
                            <div>
                              <span className="font-medium">Time:</span> {scene.background.timeOfDay}
                            </div>
                            <div>
                              <span className="font-medium">Atmosphere:</span> {scene.background.atmosphere}
                            </div>
                            {scene.background.lighting && (
                              <div>
                                <span className="font-medium">Lighting:</span> {scene.background.lighting}
                              </div>
                            )}
                          </div>
                          <div>
                            <span className="font-medium">Visual Description:</span>
                            <p className="mt-1 text-muted-foreground">{scene.background.visualDescription}</p>
                          </div>
                        </div>

                        {/* Dialogue Sequence */}
                        <div className="space-y-3">
                          <h4 className="font-medium">Dialogue Sequence</h4>
                          <div className="space-y-3">
                            {scene.dialogueSequence.map((dialogue: any, dialogueIndex: number) => (
                              <div key={dialogueIndex} className="border rounded-lg p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-purple-700 dark:text-purple-300">
                                    {dialogue.characterName}
                                  </span>
                                  <div className="flex items-center gap-2 text-xs">
                                    <Badge variant="outline">{dialogue.emotion}</Badge>
                                    <span className="text-muted-foreground">Intensity: {dialogue.intensity}/10</span>
                                  </div>
                                </div>
                                <p className="text-sm">{dialogue.dialogue}</p>
                                {dialogue.action && (
                                  <p className="text-xs text-muted-foreground italic">
                                    *{dialogue.action}*
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8">
                    <p className="text-center text-muted-foreground">
                      Roleplay analysis will be generated automatically.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}