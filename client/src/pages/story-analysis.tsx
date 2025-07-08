import { useState, useEffect, useRef } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Clock, Users, Film, MapPin, Headphones } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { AppTopNavigation } from "@/components/app-top-navigation";
import { StoryAnalysisPanel } from "@/components/story/StoryAnalysisPanel";
import { RolePlayAnalysisPanel } from "@/components/story/RolePlayAnalysisPanel";
import StoryNarratorControls from "@/components/ui/story-narrator-controls";
import StoryVoiceSamples from "@/components/story/story-voice-samples";
// import { EnhancedNarrationPlayer } from "@/components/enhanced-narration-player";

interface StoryAnalysis {
  title: string; // AI-generated title for the story
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
  // Story data will come from the query
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
  const [playingUserRecording, setPlayingUserRecording] = useState<string>("");
  const [audioEnabled, setAudioEnabled] = useState(false);
  
  // Simple audio player ref pattern (from working upload-audio page)
  const userAudioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Enable audio context on first user interaction
  const enableAudio = async () => {
    if (!audioEnabled && typeof window !== 'undefined') {
      try {
        if (window.AudioContext || (window as any).webkitAudioContext) {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          if (audioContext.state === 'suspended') {
            await audioContext.resume();
          }
        }
        setAudioEnabled(true);
        console.log('Audio context enabled');
      } catch (error) {
        console.error('Failed to enable audio context:', error);
      }
    }
  };

  // Load story-specific user voice emotions
  const loadStoryVoiceEmotions = async (storyEmotions: string[]) => {
    if (!user?.id || !storyEmotions.length) return;

    try {
      // Check each emotion from this story specifically
      const emotionChecks = storyEmotions.map(async (emotion) => {
        const response = await fetch(`/api/user-voice-emotions/${user.id}?emotion=${emotion}`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          return { emotion, hasRecording: data.samples && data.samples.length > 0 };
        }
        return { emotion, hasRecording: false };
      });

      const results = await Promise.all(emotionChecks);
      const emotionMap: Record<string, boolean> = {};
      
      results.forEach(({ emotion, hasRecording }) => {
        emotionMap[emotion] = hasRecording;
      });
      
      setUserVoiceEmotions(emotionMap);
      console.log('Story-specific voice emotions loaded:', emotionMap);
    } catch (error) {
      console.error('Failed to load story voice emotions:', error);
    }
  };

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
    // Enable audio context on first interaction
    await enableAudio();
    
    setPlayingSample(emotion);
    try {
      console.log('Generating emotion sample:', { emotion, intensity });
      
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
        console.log('Audio generation result:', result);
        
        if (result.audioUrl) {
          const audio = new Audio(result.audioUrl);
          
          audio.addEventListener('loadstart', () => {
            console.log('Audio loading started');
          });
          
          audio.addEventListener('canplay', () => {
            console.log('Audio can play');
          });
          
          audio.addEventListener('error', (e) => {
            console.error('Audio error:', e);
            setPlayingSample("");
            toast({
              title: "Audio Error",
              description: "Could not load audio file.",
              variant: "destructive",
            });
          });
          
          audio.onended = () => {
            console.log('Audio playback ended');
            setPlayingSample("");
          };
          
          try {
            // Check if audio context is allowed
            if (typeof window !== 'undefined' && window.AudioContext) {
              const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
              if (audioContext.state === 'suspended') {
                await audioContext.resume();
              }
            }
            
            // Set volume to ensure it's audible
            audio.volume = 0.8;
            
            await audio.play();
            console.log('Audio playback started successfully');
          } catch (playError) {
            console.error('Audio play error:', playError);
            setPlayingSample("");
            
            // Check if it's an autoplay policy error
            if ((playError as any).name === 'NotAllowedError') {
              toast({
                title: "Audio Blocked",
                description: "Browser blocked audio. Please click anywhere on the page first, then try again.",
                variant: "destructive",
              });
            } else {
              toast({
                title: "Playback Error",
                description: "Could not play audio. Check your speakers and volume.",
                variant: "destructive",
              });
            }
          }
        } else {
          throw new Error('No audio URL in response');
        }
      } else {
        const errorText = await response.text();
        console.error('Sample generation failed:', response.status, errorText);
        throw new Error(`Failed to generate sample: ${response.status}`);
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

  // Handle user voice recording playback
  const handlePlayUserRecording = async (emotion: string) => {
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to play your voice recordings.",
        variant: "destructive",
      });
      return;
    }

    await enableAudio();
    
    try {
      setPlayingUserRecording(emotion);
      console.log(`Playing user recording for emotion: ${emotion}`);
      
      // Find the actual user voice file using the correct endpoint
      const response = await fetch(`/api/user-voice-emotions/${user.id}?emotion=${emotion}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('User voice data:', data);
        
        // Check if we have samples for this emotion
        if (!data.samples || data.samples.length === 0) {
          throw new Error('No voice recordings found for this emotion');
        }
        
        // Use the audioUrl from the most recent sample and convert old format to new format
        let audioUrl = data.samples[0].audioUrl;
        
        // Convert old URL format to new format for compatibility
        if (audioUrl.includes('/api/user-voice-emotions/') && !audioUrl.includes('/files/')) {
          const filename = audioUrl.split('/api/user-voice-emotions/')[1];
          audioUrl = `/api/user-voice-emotions/files/${filename}`;
        }
        
        // Stop any currently playing audio
        if (userAudioPlayerRef.current) {
          userAudioPlayerRef.current.pause();
          userAudioPlayerRef.current = null;
        }
        
        // Fetch audio with credentials and create blob URL (like upload-audio page)
        const audioResponse = await fetch(audioUrl, {
          credentials: 'include'
        });
        
        if (!audioResponse.ok) {
          throw new Error('Failed to fetch audio file');
        }
        
        const audioBlob = await audioResponse.blob();
        const blobUrl = URL.createObjectURL(audioBlob);
        
        // Use blob URL pattern like upload-audio page
        userAudioPlayerRef.current = new Audio(blobUrl);
        userAudioPlayerRef.current.volume = 0.8;
        
        userAudioPlayerRef.current.onended = () => {
          console.log('User recording playback ended');
          setPlayingUserRecording("");
          URL.revokeObjectURL(blobUrl); // Clean up blob URL
        };
        
        userAudioPlayerRef.current.onerror = (e) => {
          console.error('Audio error:', e);
          setPlayingUserRecording("");
          URL.revokeObjectURL(blobUrl); // Clean up blob URL
          toast({
            title: "Playback Error",
            description: "Could not play your voice recording.",
            variant: "destructive",
          });
        };
        
        await userAudioPlayerRef.current.play();
        console.log('User recording playback started successfully');
      } else {
        throw new Error('User voice recording not found');
      }
    } catch (error) {
      console.error('Error playing user recording:', error);
      setPlayingUserRecording("");
      toast({
        title: "Playback Error",
        description: "Could not play your voice recording.",
        variant: "destructive",
      });
    }
  };

  // Fetch story data if storyId is provided
  const { data: storyDataFromQuery, isLoading: storyLoading } = useQuery({
    queryKey: [`/api/stories/${storyId}`],
    enabled: !!storyId && !!user?.id,
  });

  // Generate both narrative and roleplay analyses automatically
  const generateComprehensiveAnalysis = async (story: any) => {
    console.log('Starting comprehensive analysis for story:', storyId);
    setIsLoadingAnalyses(true);
    setAnalysisProgress({ narrative: false, roleplay: false });

    try {
      // Try to fetch existing narrative analysis first
      console.log('Fetching existing narrative analysis:', `/api/stories/${storyId}/narrative`);
      let narrativeResponse;
      
      try {
        narrativeResponse = await apiRequest(`/api/stories/${storyId}/narrative`, {
          method: 'GET',
          credentials: 'include'
        });
        console.log('Found existing narrative analysis');
      } catch (fetchError: any) {
        if (fetchError.message?.includes('404')) {
          console.log('No existing narrative analysis, generating new one...');
          narrativeResponse = await apiRequest(`/api/stories/${storyId}/narrative`, {
            method: 'POST',
            credentials: 'include'
          });
        } else {
          throw fetchError;
        }
      }

      const narrativeAnalysis: AnalysisData = {
        analysis: narrativeResponse,
        content: story.content || "",
        title: narrativeResponse.title || story.title || "Untitled Story"
      };
      
      console.log('Setting analysis data:', {
        hasAnalysis: !!narrativeResponse,
        hasEmotions: !!(narrativeResponse?.emotions),
        emotionCount: narrativeResponse?.emotions?.length || 0,
        emotions: narrativeResponse?.emotions?.map((e: any) => `${e.emotion} (${e.intensity})`) || [],
        analysisStructure: Object.keys(narrativeResponse || {})
      });
      
      setAnalysisData(narrativeAnalysis);
      setAnalysisProgress(prev => ({ ...prev, narrative: true }));

      // Load story-specific user voice emotions
      if (narrativeResponse.emotions) {
        const storyEmotions = narrativeResponse.emotions.map((e: any) => e.emotion);
        await loadStoryVoiceEmotions(storyEmotions);
      }

      // Update story title in database if AI generated a new one
      if (narrativeResponse.title && narrativeResponse.title !== story.title) {
        try {
          await apiRequest(`/api/stories/${storyId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: narrativeResponse.title }),
            credentials: 'include'
          });
          console.log('Story title updated to:', narrativeResponse.title);
        } catch (titleUpdateError) {
          console.error('Failed to update story title:', titleUpdateError);
        }
      }

      // Try to fetch existing roleplay analysis (generated by unified cache logic)
      try {
        console.log('Fetching existing roleplay analysis:', `/api/stories/${storyId}/roleplay`);
        const rolePlayResponse = await apiRequest(`/api/stories/${storyId}/roleplay`, {
          method: 'GET',
          credentials: 'include'
        });
        console.log('Found existing roleplay analysis');
        setRolePlayAnalysis(rolePlayResponse);
        setAnalysisProgress(prev => ({ ...prev, roleplay: true }));
      } catch (roleplayError: any) {
        if (roleplayError.message?.includes('404')) {
          console.log('No existing roleplay analysis found - will be generated by unified cache logic');
          setAnalysisProgress(prev => ({ ...prev, roleplay: false }));
          setRolePlayAnalysis(null);
        } else {
          console.error('Roleplay analysis error:', roleplayError);
          setAnalysisProgress(prev => ({ ...prev, roleplay: false }));
          setRolePlayAnalysis(null);
        }
      }

    } catch (error) {
      console.error('Failed to generate comprehensive analysis:', error);
      
      // Fallback to basic story data for narrative
      const analysis: AnalysisData = {
        analysis: {
          title: story.title || "Untitled Story",
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
    console.log('StoryAnalysis useEffect triggered:', { storyId, hasStoryData: !!storyDataFromQuery, userId: user?.id });
    
    if (storyId && storyDataFromQuery && user?.id) {
      console.log('Triggering dual analysis for existing story');
      // Automatically generate both analyses when story data is available
      generateComprehensiveAnalysis(storyDataFromQuery);
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
  }, [storyId, storyDataFromQuery, user?.id, setLocation]);

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
      // Use AI-generated title first, then user-provided title, then fallback
      const finalTitle = analysisData.title?.trim() || title.trim() || generateTitleFromContent(content, analysisData) || "Untitled Story";
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
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900" onClick={enableAudio}>
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

          {/* Story Narration Button - Navigate to dedicated narration page */}
          {storyId && storyDataFromQuery && user?.id === (storyDataFromQuery as any).authorId ? (
            <div className="mb-8">
              <Button
                onClick={() => setLocation(`/stories/${storyId}/narration`)}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                size="lg"
              >
                <Headphones className="w-5 h-5 mr-2" />
                Open Story Narration
              </Button>
            </div>
          ) : storyId && storyDataFromQuery && user?.id !== (storyDataFromQuery as any).authorId ? (
            <div className="mb-8 p-4 bg-blue-900/30 rounded-xl border border-blue-500/50">
              <div className="text-blue-300 text-sm">
                <span className="font-medium">📖 Story Narration:</span> Only the story author can generate narrations
              </div>
            </div>
          ) : null}

          {/* Enhanced Narration Player - ElevenLabs Voice Clone Integration */}
          {/* {storyId && user?.id && (
            <div className="mb-8">
              <EnhancedNarrationPlayer 
                storyId={parseInt(storyId)}
                userId={user.id}
                variant="compact"
              />
            </div>
          )} */}

          {/* Main Analysis Tabs */}
          <Tabs defaultValue="narrative" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="narrative">Narrative Analysis</TabsTrigger>
              <TabsTrigger value="roleplay">Role Play Analysis</TabsTrigger>
            </TabsList>

            <TabsContent value="narrative" className="space-y-6">
              <StoryAnalysisPanel
                analysis={analysisData.analysis}
                storyId={parseInt(storyId!)}
                userVoiceEmotions={userVoiceEmotions}
                onEmotionRecorded={handleEmotionRecorded}
                onPlayEmotionSample={handlePlayEmotionSample}
                onPlayUserRecording={handlePlayUserRecording}
                isPlayingSample={playingSample}
                isPlayingUserRecording={playingUserRecording}
              />
            </TabsContent>

            <TabsContent value="roleplay" className="space-y-6">
              <RolePlayAnalysisPanel
                storyId={parseInt(storyId!)}
                storyContent={(storyDataFromQuery as any)?.content || ""}
                existingCharacters={analysisData.analysis.characters}
                existingAnalysis={rolePlayAnalysis}
                onAnalysisGenerated={(analysis) => {
                  console.log("Roleplay analysis generated:", analysis);
                  setRolePlayAnalysis(analysis);
                }}
              />
            </TabsContent>


          </Tabs>
        </div>
      </div>
    </div>
  );
}