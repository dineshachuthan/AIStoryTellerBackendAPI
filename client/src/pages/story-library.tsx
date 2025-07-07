import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Book, 
  Search, 
  Users, 
  Clock, 
  Globe, 
  EyeOff,
  Star,
  MessageSquare,
  Eye,
  Loader2,
  Trash2,
  AlertTriangle,
  Mic
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { BottomNavigation } from "@/components/bottom-navigation";
import { apiRequest } from "@/lib/queryClient";
import { UIMessages } from "@shared/i18n-config";

interface Story {
  id: number;
  title: string;
  content: string;
  category?: string;
  genre?: string;
  userId: string;
  publishedAt?: string;
  isPublic: boolean;
  readingTimeMinutes?: number;
  summary?: string;
  collaborators?: number;
  createdAt?: string;
  narratorVoice?: string;
  narratorVoiceType?: string;
}

export default function StoryLibrary() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreatingStory, setIsCreatingStory] = useState(false);
  const [convertingStories, setConvertingStories] = useState<Set<number>>(new Set());
  const [deletingStories, setDeletingStories] = useState<Set<number>>(new Set());

  // Create story and navigate to upload page
  const createStoryAndNavigate = async (storyType: string, targetPath: string) => {
    if (!user) {
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
      
      // Navigate to upload page with story ID
      setLocation(`/${story.id}${targetPath}`);
    } catch (error: any) {
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

  // Convert story to collaborative template
  const convertToCollaborative = async (storyId: number) => {
    setConvertingStories(prev => new Set(prev).add(storyId));
    
    try {
      const response = await apiRequest(`/api/stories/${storyId}/convert-to-template`, {
        method: "POST",
        body: JSON.stringify({ makePublic: true }),
        headers: { "Content-Type": "application/json" }
      });
      
      toast({
        title: "Success",
        description: "Story converted to collaborative template! Generating invitation links...",
      });
      
      // Navigate to collaborative roleplay page to view the template
      setLocation("/collaborative-roleplay");
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to convert story to collaborative template",
        variant: "destructive",
      });
    } finally {
      setConvertingStories(prev => {
        const next = new Set(prev);
        next.delete(storyId);
        return next;
      });
    }
  };

  const deleteStory = async (storyId: number) => {
    setDeletingStories(prev => new Set(prev).add(storyId));
    
    try {
      await apiRequest(`/api/stories/${storyId}/archive`, {
        method: "PUT"
      });
      
      toast({
        title: "Story Deleted",
        description: "Your story has been moved to the archive.",
      });
      
      // Refresh the stories list
      queryClient.invalidateQueries({ queryKey: ["/api/stories"] });
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete story",
        variant: "destructive",
      });
    } finally {
      setDeletingStories(prev => {
        const next = new Set(prev);
        next.delete(storyId);
        return next;
      });
    }
  };
  
  const { data: stories = [], isLoading } = useQuery<Story[]>({
    queryKey: ["/api/stories", user?.id],
    enabled: !!user?.id,
  });

  // Filter for narration-complete stories (have narratorVoice or narratorVoiceType)
  const narrationCompleteStories = stories.filter(story => 
    story.narratorVoice || story.narratorVoiceType
  );

  // Filter stories based on search query and get most recent 10
  const filteredStories = narrationCompleteStories.filter(story => 
    story.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    story.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    story.category?.toLowerCase().includes(searchQuery.toLowerCase())
  )
  // Sort by ID (most recent first) and limit to 10
  .sort((a, b) => b.id - a.id)
  .slice(0, 10);

  // Group recent stories under single heading
  const storiesByGenre = {
    'Your recent stories': filteredStories
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-bg via-gray-900 to-black flex items-center justify-center">
        <div className="text-white">Loading stories...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-bg via-gray-900 to-black flex items-center justify-center">
        <div className="text-white">Please log in to view your stories.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-bg via-gray-900 to-black">
      {/* Mobile Layout */}
      <div className="block lg:hidden">
        <div className="p-4 pb-24 space-y-4">
          <div className="flex items-center space-x-2">
            <Book className="w-5 h-5 text-tiktok-red" />
            <h1 className="text-lg font-bold text-white">Narrated Stories</h1>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search stories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-tiktok-red"
            />
          </div>

          <div className="text-sm text-gray-400">
            {filteredStories.length} stories
          </div>

          <Button
            onClick={() => createStoryAndNavigate("text", "/upload-story")}
            disabled={isCreatingStory}
            className="w-full bg-tiktok-red hover:bg-tiktok-red/80"
          >
            {isCreatingStory ? (
              <>
                <div className="w-4 h-4 animate-spin border-2 border-white border-t-transparent rounded-full mr-2" />
                Creating...
              </>
            ) : (
              "Create New Story"
            )}
          </Button>

          {/* Mobile Story Grid */}
          {filteredStories.length === 0 ? (
            <div className="text-center py-12">
              <Book className="w-16 h-16 mx-auto text-gray-600 mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">
                {searchQuery ? 'No Narrated Stories Found' : 'No Narrated Stories Yet'}
              </h2>
              <p className="text-gray-400 mb-6">
                {searchQuery 
                  ? 'Try adjusting your search terms to find more narrated stories'
                  : 'Complete narration for your stories to see them here'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(storiesByGenre).map(([genre, genreStories]) => (
                <div key={genre} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white">{genre}</h2>
                    <span className="text-sm text-gray-400">
                      {genreStories.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {genreStories.map((story: Story) => (
                      <Card key={story.id} className="bg-dark-card border-gray-800 hover:border-gray-700 transition-colors">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-white text-base leading-tight line-clamp-2">
                            {story.title}
                          </CardTitle>
                          {story.category && (
                            <Badge variant="secondary" className="bg-gray-700 text-gray-300 text-xs w-fit">
                              {story.category}
                            </Badge>
                          )}
                        </CardHeader>
                        <CardContent className="pt-0 space-y-3">
                          {story.summary && (
                            <p className="text-gray-400 text-sm line-clamp-2">
                              {story.summary}
                            </p>
                          )}
                          
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <div className="flex items-center space-x-3">
                              {story.readingTimeMinutes && (
                                <div className="flex items-center">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {story.readingTimeMinutes}m
                                </div>
                              )}
                              {story.collaborators && story.collaborators > 0 && (
                                <div className="flex items-center">
                                  <Users className="w-3 h-3 mr-1" />
                                  {story.collaborators}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                onClick={() => setLocation(`/analysis/${story.id}`)}
                                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white text-xs"
                              >
                                <Mic className="w-3 h-3 mr-1" />
                                Record Voice Samples
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setLocation(`/${story.id}/upload-story`)}
                                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800 text-xs"
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                Edit
                              </Button>
                            </div>
                            
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => convertToCollaborative(story.id)}
                                disabled={convertingStories.has(story.id)}
                                className="flex-1 border-purple-600 text-purple-400 hover:bg-purple-900/20 text-xs"
                              >
                                {convertingStories.has(story.id) ? (
                                  <>
                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                    Converting...
                                  </>
                                ) : (
                                  <>
                                    <Users className="w-3 h-3 mr-1" />
                                    Collaborate
                                  </>
                                )}
                              </Button>
                              
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={deletingStories.has(story.id)}
                                    className="border-red-600 text-red-400 hover:bg-red-900/20 px-3"
                                  >
                                    {deletingStories.has(story.id) ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-3 h-3" />
                                    )}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="bg-dark-card border-gray-800">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="text-white flex items-center">
                                      <AlertTriangle className="w-5 h-5 mr-2 text-red-400" />
                                      Delete Story
                                    </AlertDialogTitle>
                                    <AlertDialogDescription className="text-gray-400">
                                      Are you sure you want to delete "{story.title}"? This will move the story to your archive.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel className="bg-gray-700 text-gray-300 hover:bg-gray-600">
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteStory(story.id)}
                                      className="bg-red-600 text-white hover:bg-red-700"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>

                          {story.isPublic ? (
                            <div className="text-center py-2">
                              <div className="text-sm text-green-400 flex items-center justify-center">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex items-center">
                                        <Globe className="w-4 h-4 mr-1" />
                                        Published
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{UIMessages.getTooltip('STORY_PUBLIC_TOOLTIP')}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-2">
                              <div className="text-sm text-gray-400 flex items-center justify-center">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex items-center">
                                        <EyeOff className="w-4 h-4 mr-1" />
                                        Private
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{UIMessages.getTooltip('STORY_PRIVATE_TOOLTIP')}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:flex h-screen">
        {/* Left Sidebar - Search */}
        <div className="w-80 bg-gray-900/50 border-r border-gray-800 p-4">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Book className="w-6 h-6 text-tiktok-red" />
              <h1 className="text-xl font-bold text-white">Narrated Stories</h1>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search stories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-tiktok-red"
              />
            </div>

            <div className="text-sm text-gray-400">
              {filteredStories.length} of {narrationCompleteStories.length} narrated stories
            </div>

            <Button
              onClick={() => createStoryAndNavigate("text", "/upload-story")}
              disabled={isCreatingStory}
              className="w-full bg-tiktok-red hover:bg-tiktok-red/80"
            >
              {isCreatingStory ? (
                <>
                  <div className="w-4 h-4 animate-spin border-2 border-white border-t-transparent rounded-full mr-2" />
                  Creating...
                </>
              ) : (
                "Create New Story"
              )}
            </Button>
          </div>
        </div>

        {/* Desktop Content Area */}
        <div className="flex-1 p-4 pb-24 overflow-y-auto">
          {filteredStories.length === 0 ? (
            <div className="text-center py-12">
              <Book className="w-16 h-16 mx-auto text-gray-600 mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">
                {searchQuery ? 'No Narrated Stories Found' : 'No Narrated Stories Yet'}
              </h2>
              <p className="text-gray-400 mb-6">
                {searchQuery 
                  ? 'Try adjusting your search terms to find more narrated stories'
                  : 'Complete narration for your stories to see them here'
                }
              </p>
              {!searchQuery && (
                <Button
                  onClick={() => createStoryAndNavigate("text", "/upload-story")}
                  disabled={isCreatingStory}
                  className="bg-tiktok-red hover:bg-tiktok-red/80"
                >
                  {isCreatingStory ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Creating...
                    </>
                  ) : (
                    "Create Your First Story"
                  )}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(storiesByGenre).map(([genre, genreStories]) => (
                <div key={genre} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-white">{genre}</h2>
                    <span className="text-sm text-gray-400">
                      {genreStories.length} {genreStories.length === 1 ? 'story' : 'stories'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {genreStories.map((story: Story) => (
                      <Card key={story.id} className="bg-dark-card border-gray-800 hover:border-gray-700 transition-colors">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-white text-lg leading-tight mb-2 line-clamp-2">
                                {story.title}
                              </CardTitle>
                              {story.category && (
                                <Badge variant="secondary" className="bg-gray-700 text-gray-300 text-xs">
                                  {story.category}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-3">
                          {story.summary && (
                            <p className="text-gray-400 text-sm line-clamp-3">
                              {story.summary}
                            </p>
                          )}
                          
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <div className="flex items-center space-x-3">
                              {story.readingTimeMinutes && (
                                <div className="flex items-center">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {story.readingTimeMinutes}m
                                </div>
                              )}
                              {story.collaborators && story.collaborators > 0 && (
                                <div className="flex items-center">
                                  <Users className="w-3 h-3 mr-1" />
                                  {story.collaborators}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                onClick={() => setLocation(`/analysis/${story.id}`)}
                                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                              >
                                <Mic className="w-4 h-4 mr-1" />
                                Record Voice Samples
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setLocation(`/${story.id}/upload-story`)}
                                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Edit
                              </Button>
                            </div>
                            
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => convertToCollaborative(story.id)}
                                disabled={convertingStories.has(story.id)}
                                className="flex-1 border-purple-600 text-purple-400 hover:bg-purple-900/20 text-xs"
                              >
                                {convertingStories.has(story.id) ? (
                                  <>
                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                    Converting...
                                  </>
                                ) : (
                                  <>
                                    <Users className="w-3 h-3 mr-1" />
                                    Collaborate
                                  </>
                                )}
                              </Button>
                              
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={deletingStories.has(story.id)}
                                    className="border-red-600 text-red-400 hover:bg-red-900/20"
                                  >
                                    {deletingStories.has(story.id) ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-4 h-4" />
                                    )}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="bg-dark-card border-gray-800">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="text-white flex items-center">
                                      <AlertTriangle className="w-5 h-5 mr-2 text-red-400" />
                                      Delete Story
                                    </AlertDialogTitle>
                                    <AlertDialogDescription className="text-gray-400">
                                      Are you sure you want to delete "{story.title}"? This will move the story to your archive. This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel className="bg-gray-700 text-gray-300 hover:bg-gray-600">
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteStory(story.id)}
                                      className="bg-red-600 text-white hover:bg-red-700"
                                    >
                                      Delete Story
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>

                          {story.isPublic ? (
                            <div className="text-center py-2">
                              <div className="text-sm text-green-400 flex items-center justify-center">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex items-center">
                                        <Globe className="w-4 h-4 mr-1" />
                                        Published {story.publishedAt && formatDistanceToNow(new Date(story.publishedAt), { addSuffix: true })}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{UIMessages.getTooltip('STORY_PUBLIC_TOOLTIP')}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">Available to all users</p>
                            </div>
                          ) : (
                            <div className="text-center py-2">
                              <div className="text-sm text-gray-400 flex items-center justify-center">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex items-center">
                                        <EyeOff className="w-4 h-4 mr-1" />
                                        Private Story
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{UIMessages.getTooltip('STORY_PRIVATE_TOOLTIP')}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">Only visible to you</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
}