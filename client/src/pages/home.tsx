import { useState, useEffect } from "react";
import { CharacterFeed } from "@/components/character-feed";
import { StorySearchPanel } from "@/components/story-search-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Upload, Mic, Users, FileText, AudioLines, PenTool, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BottomNavigation } from "@/components/bottom-navigation";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { defaultStoryConfig } from "@shared/storyConfig";

export default function Home() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSearchPanelCollapsed, setIsSearchPanelCollapsed] = useState(false);
  const [isCreatingStory, setIsCreatingStory] = useState(false);
  const [windowDimensions, setWindowDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768
  });

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
      } else if (window.innerWidth >= 1024) {
        setIsSearchPanelCollapsed(false);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Call on initial load

    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
        title: "Authentication Required",
        description: "Please log in to create stories.",
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
      
      const story = await apiRequest('/api/stories/draft', {
        method: 'POST',
        body: JSON.stringify({
          title: "Untitled Story",
          storyType
        }),
      });

      console.log('Empty story created:', story);
      
      // Store story ID in sessionStorage and navigate to the correct path
      sessionStorage.setItem('currentStoryId', story.id.toString());
      setLocation(targetPath);
    } catch (error) {
      console.error("Story creation error:", error);
      console.error("Error details:", error.message);
      toast({
        title: "Creation Failed",
        description: `Could not create story: ${error.message}`,
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
      cardTopOffset: width < 640 ? 'top-14' : width < 1024 ? 'top-16' : 'top-20'
    };
  };

  const styles = getResponsiveStyles();

  return (
    <div className="relative w-full min-h-screen bg-dark-bg text-dark-text overflow-hidden" 
         style={{ minHeight: windowDimensions.height }}>
      <div className="flex min-h-screen">
        {/* Collapsible Search Panel */}
        <StorySearchPanel
          isCollapsed={isSearchPanelCollapsed}
          onToggleCollapse={() => setIsSearchPanelCollapsed(!isSearchPanelCollapsed)}
          showToggle={true}
          className="z-30"
        />

        {/* Main Content Area */}
        <div className="flex-1 relative overflow-hidden pb-16 sm:pb-20">
          {/* Header */}
          <div className={`absolute top-0 left-0 right-0 z-50 bg-dark-bg/80 backdrop-blur-lg border-b border-gray-800 ${styles.containerPadding}`}>
            <div className="flex items-center justify-between">
              <h1 className={`${windowDimensions.width < 640 ? 'text-lg' : windowDimensions.width < 1024 ? 'text-xl' : 'text-2xl'} font-bold text-white`}>DeeVee</h1>
              <div className="flex items-center space-x-2 sm:space-x-3">
                <Button
                  onClick={() => setLocation("/voice-samples")}
                  variant="outline"
                  size="sm"
                  className="border-tiktok-cyan text-tiktok-cyan hover:bg-tiktok-cyan/20 hidden sm:flex"
                >
                  <AudioLines className="w-4 h-4 mr-2" />
                  Voice Samples
                </Button>
                <Button
                  onClick={() => setLocation("/voice-samples")}
                  variant="outline"
                  size="sm"
                  className="border-tiktok-cyan text-tiktok-cyan hover:bg-tiktok-cyan/20 sm:hidden p-2"
                >
                  <AudioLines className="w-4 h-4" />
                </Button>
                
                <Button
                  onClick={() => setLocation("/profile")}
                  variant="ghost"
                  size="sm"
                  className="relative h-8 w-8 rounded-full p-0"
                >
                  <Avatar className="h-6 w-6 sm:h-8 sm:w-8">
                    <AvatarImage 
                      src={user?.profileImageUrl || undefined} 
                      alt={user?.displayName || user?.email || 'User'} 
                    />
                    <AvatarFallback className="bg-tiktok-red text-white text-xs">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Actions Overlay */}
          <div className={`absolute ${styles.cardTopOffset} left-0 right-0 z-40 ${styles.containerPadding}`}>
            <Card className="bg-dark-card/90 backdrop-blur-lg border-gray-800">
              <CardHeader className={`pb-2 ${styles.containerPadding}`}>
                <CardTitle className={`text-white flex items-center ${windowDimensions.width < 640 ? 'text-sm' : windowDimensions.width < 1024 ? 'text-base' : 'text-lg'}`}>
                  <Users className={`${windowDimensions.width < 640 ? 'w-3 h-3' : windowDimensions.width < 1024 ? 'w-4 h-4' : 'w-5 h-5'} mr-2 text-tiktok-pink`} />
                  Collaborative Storytelling
                </CardTitle>
                <CardDescription className={`text-gray-text ${windowDimensions.width < 640 ? 'text-xs' : 'text-sm'}`}>
                  Create stories with friends where each person voices a unique character
                </CardDescription>
              </CardHeader>
              <CardContent className={`pt-0 ${styles.containerPadding}`}>
                <div className={`grid ${styles.gridCols} gap-2 ${windowDimensions.width >= 768 ? 'sm:gap-3' : ''}`}>
                  <Button
                    onClick={() => createStoryAndNavigate("text", "/upload-story")}
                    disabled={isCreatingStory}
                    variant="outline"
                    className={`border-blue-500 text-blue-500 hover:bg-blue-500/20 ${styles.buttonSize} p-2 flex flex-col items-center justify-center space-y-1`}
                    size="sm"
                  >
                    {isCreatingStory ? 
                      <Loader2 className={`${windowDimensions.width < 640 ? 'w-3 h-3' : windowDimensions.width < 1024 ? 'w-4 h-4' : 'w-5 h-5'} animate-spin`} /> : 
                      <PenTool className={`${windowDimensions.width < 640 ? 'w-3 h-3' : windowDimensions.width < 1024 ? 'w-4 h-4' : 'w-5 h-5'}`} />
                    }
                    <span className={`${styles.textSize} text-center leading-tight break-words`}>Write Story</span>
                  </Button>
                  <Button
                    onClick={() => createStoryAndNavigate("voice", "/voice-record")}
                    disabled={isCreatingStory}
                    variant="outline"
                    className={`border-green-500 text-green-500 hover:bg-green-500/20 ${styles.buttonSize} p-2 flex flex-col items-center justify-center space-y-1`}
                    size="sm"
                  >
                    {isCreatingStory ? 
                      <Loader2 className={`${windowDimensions.width < 640 ? 'w-3 h-3' : windowDimensions.width < 1024 ? 'w-4 h-4' : 'w-5 h-5'} animate-spin`} /> : 
                      <Mic className={`${windowDimensions.width < 640 ? 'w-3 h-3' : windowDimensions.width < 1024 ? 'w-4 h-4' : 'w-5 h-5'}`} />
                    }
                    <span className={`${styles.textSize} text-center leading-tight break-words`}>Voice Record</span>
                    {windowDimensions.width >= 640 && <span className="text-xs opacity-70 leading-tight">(5 min)</span>}
                  </Button>

                  <Button
                    onClick={() => createStoryAndNavigate("audio", "/upload-audio")}
                    disabled={isCreatingStory}
                    className={`bg-tiktok-red hover:bg-tiktok-red/80 ${styles.buttonSize} p-2 flex flex-col items-center justify-center space-y-1`}
                    size="sm"
                  >
                    {isCreatingStory ? 
                      <Loader2 className={`${windowDimensions.width < 640 ? 'w-3 h-3' : windowDimensions.width < 1024 ? 'w-4 h-4' : 'w-5 h-5'} animate-spin`} /> : 
                      <AudioLines className={`${windowDimensions.width < 640 ? 'w-3 h-3' : windowDimensions.width < 1024 ? 'w-4 h-4' : 'w-5 h-5'}`} />
                    }
                    <span className={`${styles.textSize} text-center leading-tight break-words`}>Upload Audio</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <CharacterFeed />
        </div>
      </div>
      
      <BottomNavigation />
    </div>
  );
}
