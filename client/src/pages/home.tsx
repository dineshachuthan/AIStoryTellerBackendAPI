import { useState, useEffect } from "react";
import { CharacterFeed } from "@/components/character-feed";
import { StorySearchPanel } from "@/components/story-search-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Upload, Mic, Users, FileText, AudioLines, PenTool, Loader2, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AppTopNavigation } from "@/components/app-top-navigation";

import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { defaultStoryConfig } from "@shared/storyConfig";

export default function Home() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
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
      cardTopOffset: width < 640 ? 'top-2' : width < 1024 ? 'top-4' : 'top-6'
    };
  };

  const styles = getResponsiveStyles();

  return (
    <div className="relative w-full min-h-screen bg-dark-bg text-dark-text overflow-hidden" 
         style={{ minHeight: windowDimensions.height }}>
      <AppTopNavigation />
      
      <div className="flex pt-16">
        {/* Collapsible Search Panel */}
        <StorySearchPanel
          isCollapsed={isSearchPanelCollapsed}
          onToggleCollapse={() => setIsSearchPanelCollapsed(!isSearchPanelCollapsed)}
          showToggle={true}
          className="z-30"
        />

        {/* Main Content Area */}
        <div className="flex-1 relative overflow-hidden">

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
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => createStoryAndNavigate("text", "/upload-story")}
                    disabled={isCreatingStory}
                    variant="outline"
                    className="border-blue-500 text-blue-500 hover:bg-blue-500/20 w-full h-16 flex items-center justify-start px-4 gap-3"
                    size="sm"
                  >
                    {isCreatingStory ? 
                      <Loader2 className={`${windowDimensions.width < 640 ? 'w-3 h-3' : windowDimensions.width < 1024 ? 'w-4 h-4' : 'w-5 h-5'} animate-spin`} /> : 
                      <PenTool className={`${windowDimensions.width < 640 ? 'w-3 h-3' : windowDimensions.width < 1024 ? 'w-4 h-4' : 'w-5 h-5'}`} />
                    }
                    <span className={`${styles.textSize}`}>Write Story</span>
                  </Button>
                  <Button
                    onClick={() => createStoryAndNavigate("voice", "/voice-record")}
                    disabled={isCreatingStory}
                    variant="outline"
                    className="border-green-500 text-green-500 hover:bg-green-500/20 w-full h-16 flex items-center justify-start px-4 gap-3"
                    size="sm"
                  >
                    {isCreatingStory ? 
                      <Loader2 className={`${windowDimensions.width < 640 ? 'w-3 h-3' : windowDimensions.width < 1024 ? 'w-4 h-4' : 'w-5 h-5'} animate-spin`} /> : 
                      <Mic className={`${windowDimensions.width < 640 ? 'w-3 h-3' : windowDimensions.width < 1024 ? 'w-4 h-4' : 'w-5 h-5'}`} />
                    }
                    <span className={`${styles.textSize}`}>Voice Record</span>
                    {windowDimensions.width >= 640 && <span className="text-xs opacity-70 leading-tight">(5 min)</span>}
                  </Button>

                  <Button
                    onClick={() => createStoryAndNavigate("audio", "/upload-audio")}
                    disabled={isCreatingStory}
                    className="bg-tiktok-red hover:bg-tiktok-red/80 w-full h-16 flex items-center justify-start px-4 gap-3"
                    size="sm"
                  >
                    {isCreatingStory ? 
                      <Loader2 className={`${windowDimensions.width < 640 ? 'w-3 h-3' : windowDimensions.width < 1024 ? 'w-4 h-4' : 'w-5 h-5'} animate-spin`} /> : 
                      <AudioLines className={`${windowDimensions.width < 640 ? 'w-3 h-3' : windowDimensions.width < 1024 ? 'w-4 h-4' : 'w-5 h-5'}`} />
                    }
                    <span className={`${styles.textSize}`}>Upload Audio</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <CharacterFeed />
        </div>
      </div>
      
    </div>
  );
}
