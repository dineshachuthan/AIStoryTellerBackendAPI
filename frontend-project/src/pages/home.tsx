import { useState, useEffect } from "react";
import { CharacterFeed } from "@/components/character-feed";
import { DraftStoriesPanel } from "@/components/draft-stories-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Upload, Mic, Users, FileText, AudioLines, PenTool, Loader2, LogOut, TrendingUp, BookOpen, Sparkles, Target } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AppTopNavigation } from "@/components/app-top-navigation";
import { useQuery } from "@tanstack/react-query";
import { toast, toastMessages } from "@/lib/toast-utils";
import { apiRequest } from "@/lib/queryClient";
import { apiClient } from "@/lib/api-client";
import { useStories } from "@/hooks/use-api";
import { defaultStoryConfig } from '@shared/config/storyConfig';
import { getMessage } from '@/lib/i18n';
import { formatDistanceToNow } from "date-fns";
import { useLanguage } from "@/contexts/language-context";

export default function Home() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();

  const { language } = useLanguage();
  const [isSearchPanelCollapsed, setIsSearchPanelCollapsed] = useState(true); // Default to collapsed
  const [isCreatingStory, setIsCreatingStory] = useState(false);
  const [windowDimensions, setWindowDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768
  });

  // Fetch stories to check for drafts
  const { data: stories = [] } = useStories({
    enabled: !!user?.id,
  });

  // All stories are considered draft stories now
  const draftStories = Array.isArray(stories) ? stories : [];

  // Set initial collapsed state based on draft stories
  useEffect(() => {
    // Only expand if there are draft stories AND screen is large enough
    if (draftStories.length > 0 && windowDimensions.width >= 1024) {
      setIsSearchPanelCollapsed(false);
    }
  }, [draftStories.length, windowDimensions.width]);

  // Dynamic screen size detection
  useEffect(() => {
    const handleResize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
      
      // Auto-collapse sidebar on smaller screens
      if (window.innerWidth < 768) {
        setIsSearchPanelCollapsed(true);
      } else if (window.innerWidth >= 1024 && draftStories.length > 0) {
        // Only expand on large screens if there are draft stories
        setIsSearchPanelCollapsed(false);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Call on initial load

    return () => window.removeEventListener('resize', handleResize);
  }, [draftStories.length]);

  const getUserInitials = () => {
    if (!user) return 'U';
    return user.displayName 
      ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase()
      : user.firstName && user.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
      : user.email ? user.email[0].toUpperCase()
      : 'U';
  };

  // Create empty story and navigate to upload page
  const createStoryAndNavigate = async (storyType: string, targetPath: string) => {
    if (!user?.id) {
      toast({
        title: getMessage('home.errors.auth_required_title', {}, language),
        description: getMessage('home.errors.auth_required_description', {}, language),
        variant: "destructive",
      });
      return;
    }

    setIsCreatingStory(true);

    try {
      console.log('Creating story with request:', {
        url: '/api/stories/draft',
        method: 'POST',
        body: { title: "Untitled Story", storyType }
      });
      
      const story = await apiClient.stories.createDraft({
        title: getMessage('home.story_defaults.untitled_story', {}, language),
        storyType,
        content: '' // Empty content for draft stories
      });

      console.log('Empty story created:', story);
      
      // Store story ID in sessionStorage and navigate to the correct path
      sessionStorage.setItem('currentStoryId', story.id.toString());
      setLocation(targetPath);
    } catch (error) {
      console.error("Story creation error:", error);
      console.error("Error details:", error.message);
      toast({
        title: getMessage('home.errors.creation_failed_title', {}, language),
        description: getMessage('home.errors.creation_failed_description', { error: error.message }, language),
        variant: "destructive",
      });
    } finally {
      setIsCreatingStory(false);
    }
  };

  // Dynamic styling based on screen size
  const getResponsiveStyles = () => {
    const { width, height } = windowDimensions;
    
    return {
      containerPadding: width < 640 ? 'p-2' : width < 1024 ? 'p-3' : 'p-4',
      headerHeight: width < 640 ? 'h-14' : width < 1024 ? 'h-16' : 'h-20',
      buttonSize: width < 640 ? 'h-14' : width < 768 ? 'h-16' : width < 1024 ? 'h-18' : 'h-20',
      textSize: width < 640 ? 'text-xs' : width < 768 ? 'text-sm' : 'text-base',
      gridCols: width < 640 ? 'grid-cols-1' : width < 768 ? 'grid-cols-2' : width < 1024 ? 'grid-cols-2' : 'grid-cols-4',
      cardTopOffset: width < 640 ? 'top-2' : width < 1024 ? 'top-4' : 'top-6'
    };
  };

  const styles = getResponsiveStyles();

  return (
    <div className="relative w-full min-h-screen bg-dark-bg text-dark-text overflow-hidden" 
         style={{ minHeight: windowDimensions.height }}>
      <AppTopNavigation />
      
      <div className="flex h-full pt-16">
        {/* Draft Stories Panel */}
        <DraftStoriesPanel
          isCollapsed={isSearchPanelCollapsed}
          onToggleCollapse={() => setIsSearchPanelCollapsed(!isSearchPanelCollapsed)}
          showToggle={true}
          className="z-30"
        />

        {/* Main Content Area */}
        <div className="flex-1 relative overflow-auto p-4 lg:p-6">
          <div className="max-w-full xl:max-w-[1400px] 2xl:max-w-[1600px] mx-auto space-y-6">
            
            {/* Welcome Section */}
            <div className="text-center mb-8">
              <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
                {user?.displayName ? `Welcome back, ${user.displayName}!` : 'Welcome to Storytelling Platform'}
              </h1>
              <p className="text-gray-400 text-lg">
                Transform your ideas into immersive stories with AI-powered narration
              </p>
            </div>

            {/* Stats Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card className="bg-dark-card border-gray-800">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Total Stories</p>
                      <p className="text-2xl font-bold text-white">{stories?.length || 0}</p>
                    </div>
                    <BookOpen className="w-8 h-8 text-blue-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-dark-card border-gray-800">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Voice Recordings</p>
                      <p className="text-2xl font-bold text-white">
                        {(Array.isArray(stories) ? stories : []).filter(s => s.captureMethod === 'voice').length || 0}
                      </p>
                    </div>
                    <Mic className="w-8 h-8 text-green-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-dark-card border-gray-800">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Narrated Stories</p>
                      <p className="text-2xl font-bold text-white">
                        {(Array.isArray(stories) ? stories : []).filter(s => s.narratorVoice || s.narratorVoiceType).length || 0}
                      </p>
                    </div>
                    <Sparkles className="w-8 h-8 text-purple-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-dark-card border-gray-800">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">This Week</p>
                      <p className="text-2xl font-bold text-white">
                        {(Array.isArray(stories) ? stories : []).filter(s => {
                          const created = new Date(s.createdAt);
                          const weekAgo = new Date();
                          weekAgo.setDate(weekAgo.getDate() - 7);
                          return created > weekAgo;
                        }).length || 0}
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-tiktok-pink opacity-50" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Actions Section */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Create New Story Section */}
              <div className="xl:col-span-2 space-y-6">
                {/* Create New Story */}
                <Card className="bg-dark-card border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Target className="w-5 h-5 mr-2 text-tiktok-pink" />
                    Create Your Story
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Choose how you want to start your storytelling journey
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <Button
                      onClick={() => createStoryAndNavigate("text", "/upload-story")}
                      disabled={isCreatingStory}
                      variant="outline"
                      className="border-blue-500 text-blue-500 hover:bg-blue-500/20 w-full min-h-[4rem] md:min-h-[5rem] py-3 md:py-4 flex items-center justify-between px-3 md:px-6 group"
                    >
                      <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
                        {isCreatingStory ? 
                          <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin flex-shrink-0" /> : 
                          <PenTool className="w-5 h-5 md:w-6 md:h-6 flex-shrink-0" />
                        }
                        <div className="text-left min-w-0">
                          <span className="block font-medium text-sm md:text-base truncate">Write Your Story</span>
                          <span className="hidden sm:block text-xs opacity-70">Type or paste your narrative</span>
                        </div>
                      </div>
                      <div className="hidden lg:flex w-10 h-10 md:w-12 md:h-12 rounded-full bg-blue-500/10 items-center justify-center group-hover:bg-blue-500/20 transition-colors flex-shrink-0 ml-2">
                        <PenTool className="w-4 h-4 md:w-5 md:h-5" />
                      </div>
                    </Button>
                    
                    <Button
                      onClick={() => createStoryAndNavigate("voice", "/voice-record")}
                      disabled={isCreatingStory}
                      variant="outline"
                      className="border-green-500 text-green-500 hover:bg-green-500/20 w-full min-h-[4rem] md:min-h-[5rem] py-3 md:py-4 flex items-center justify-between px-3 md:px-6 group"
                    >
                      <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
                        {isCreatingStory ? 
                          <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin flex-shrink-0" /> : 
                          <Mic className="w-5 h-5 md:w-6 md:h-6 flex-shrink-0" />
                        }
                        <div className="text-left min-w-0">
                          <span className="block font-medium text-sm md:text-base truncate">Record Your Voice</span>
                          <span className="hidden sm:block text-xs opacity-70">Speak your story (up to 5 minutes)</span>
                        </div>
                      </div>
                      <div className="hidden lg:flex w-10 h-10 md:w-12 md:h-12 rounded-full bg-green-500/10 items-center justify-center group-hover:bg-green-500/20 transition-colors flex-shrink-0 ml-2">
                        <Mic className="w-4 h-4 md:w-5 md:h-5" />
                      </div>
                    </Button>

                    <Button
                      onClick={() => createStoryAndNavigate("audio", "/upload-audio")}
                      disabled={isCreatingStory}
                      className="bg-gradient-to-r from-tiktok-red to-purple-600 hover:from-tiktok-red/80 hover:to-purple-600/80 w-full min-h-[4rem] md:min-h-[5rem] py-3 md:py-4 flex items-center justify-between px-3 md:px-6 group text-white"
                    >
                      <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
                        {isCreatingStory ? 
                          <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin flex-shrink-0" /> : 
                          <AudioLines className="w-5 h-5 md:w-6 md:h-6 flex-shrink-0" />
                        }
                        <div className="text-left min-w-0">
                          <span className="block font-medium text-sm md:text-base truncate">Upload Audio</span>
                          <span className="hidden sm:block text-xs opacity-90">Import existing recordings</span>
                        </div>
                      </div>
                      <div className="hidden lg:flex w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 items-center justify-center group-hover:bg-white/20 transition-colors flex-shrink-0 ml-2">
                        <Upload className="w-4 h-4 md:w-5 md:h-5" />
                      </div>
                    </Button>
                  </div>
                </CardContent>
                </Card>

                {/* Your Journey */}
                <Card className="bg-dark-card border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center">
                      <Sparkles className="w-5 h-5 mr-2 text-purple-500" />
                      Your Journey
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                      Recent storytelling milestones
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {stories && stories.length > 0 ? (
                        <>
                          <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700">
                            <p className="text-xs text-gray-400">Latest</p>
                            <p className="text-sm font-medium text-white truncate">{stories[0]?.title}</p>
                            <p className="text-xs text-gray-500">
                              {formatDistanceToNow(new Date(stories[0]?.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                          
                          {(Array.isArray(stories) ? stories : []).filter(s => s.narratorVoice || s.narratorVoiceType).length > 0 && (
                            <div className="p-3 rounded-lg bg-purple-900/20 border border-purple-700/50">
                              <p className="text-xs text-purple-400">Narrated</p>
                              <p className="text-sm font-medium text-white truncate">
                                {(Array.isArray(stories) ? stories : []).find(s => s.narratorVoice || s.narratorVoiceType)?.title}
                              </p>
                            </div>
                          )}
                          
                          <div className="text-center pt-2">
                            <p className="text-sm font-medium text-white">{stories.length} {stories.length === 1 ? 'story' : 'stories'} created</p>
                            <div className="flex items-center justify-center gap-1 mt-2">
                              {[...Array(Math.min(5, stories.length))].map((_, i) => (
                                <div key={i} className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500" />
                              ))}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-6">
                          <Sparkles className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                          <p className="text-sm text-gray-400">Start your journey!</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Character Feed - right column on xl screens */}
              <div className="hidden xl:block">
                <CharacterFeed />
              </div>
            </div>

            {/* Character Feed - bottom on smaller screens */}
            <div className="xl:hidden">
              <CharacterFeed />
            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
}
