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
  Edit2,
  Loader2,
  Trash2,
  AlertTriangle,
  Mic
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { AppTopNavigation } from "@/components/app-top-navigation";
import { apiRequest } from "@/lib/queryClient";
import { UIMessages, getDynamicMessage } from "@shared/i18n-config";

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
  emotions?: string[];
  emotionalTags?: string[];
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

  // Show all user stories - no filtering needed
  const narrationCompleteStories = stories;

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
      <AppTopNavigation />
      
      {/* Mobile Layout */}
      <div className="block lg:hidden">
        <div className="p-4 pt-20 pb-8 space-y-4">
          <div className="flex items-center space-x-2">
            <Book className="w-5 h-5 text-tiktok-red" />
            <h1 className="text-lg font-bold text-white">My Stories</h1>
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



          {/* Mobile Story Grid */}
          {filteredStories.length === 0 ? (
            <div className="text-center py-12">
              <Book className="w-16 h-16 mx-auto text-gray-600 mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">
                {searchQuery ? 'No Stories Found' : 'No Stories Yet'}
              </h2>
              <p className="text-gray-400 mb-6">
                {searchQuery 
                  ? 'Try adjusting your search terms to find more stories'
                  : 'Complete story to see them here'
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
                          <div className="space-y-1">
                            <CardTitle className="text-white text-base leading-tight flex items-center justify-between">
                              <div className="flex-1 mr-2">
                                <div className="line-clamp-2">
                                  {story.title}
                                </div>
                                {!story.isPublic && (
                                  <div className="text-gray-400 text-sm mt-1">({UIMessages.getLabel('STORY_PRIVATE_LABEL')})</div>
                                )}
                              </div>
                              <div className="flex items-center space-x-1 flex-shrink-0">
                                <button
                                  onClick={() => setLocation(`/${story.id}/upload-story`)}
                                  className="p-1 hover:bg-gray-700 rounded transition-colors"
                                  title="Edit"
                                >
                                  <Edit2 className="w-4 h-4 text-gray-400 hover:text-white" />
                                </button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <button
                                      className="p-1 hover:bg-gray-700 rounded transition-colors"
                                      disabled={deletingStories.has(story.id)}
                                      title="Delete"
                                    >
                                      {deletingStories.has(story.id) ? (
                                        <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                                      ) : (
                                        <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-400" />
                                      )}
                                    </button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent className="bg-dark-card border-gray-800">
                                    <AlertDialogHeader>
                                      <AlertDialogTitle className="text-white flex items-center">
                                        <AlertTriangle className="w-5 h-5 text-yellow-500 mr-2" />
                                        Delete Story
                                      </AlertDialogTitle>
                                      <AlertDialogDescription className="text-gray-400">
                                        Are you sure you want to delete "{story.title}"? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel className="bg-gray-800 text-white hover:bg-gray-700">Cancel</AlertDialogCancel>
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
                            </CardTitle>
                            {story.category && (
                              <Badge variant="secondary" className="bg-gray-700 text-gray-300 text-xs w-fit">
                                {story.category}
                              </Badge>
                            )}
                          </div>
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
                                  <Clock className="w-4 h-4 mr-1" />
                                  {story.readingTimeMinutes}m
                                </div>
                              )}
                              {story.collaborators && story.collaborators > 0 && (
                                <div className="flex items-center">
                                  <Users className="w-4 h-4 mr-1" />
                                  {story.collaborators}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2">
                            {/* Display emotion tags if available */}
                            {(story.emotions || story.emotionalTags || []).length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {(story.emotions || story.emotionalTags || []).slice(0, 4).map((emotion, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs bg-gray-800/80 text-gray-300">
                                    {emotion}
                                  </Badge>
                                ))}
                                {(story.emotions || story.emotionalTags || []).length > 4 && (
                                  <Badge variant="secondary" className="text-xs bg-gray-800/80 text-gray-400">
                                    +{(story.emotions || story.emotionalTags || []).length - 4}
                                  </Badge>
                                )}
                              </div>
                            )}
                            

                            
                            <Button
                              size="sm"
                              onClick={() => convertToCollaborative(story.id)}
                              disabled={convertingStories.has(story.id)}
                              className="w-full border-purple-600 text-purple-400 hover:bg-purple-900/20 text-xs"
                            >
                              {convertingStories.has(story.id) ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                  Converting...
                                </>
                              ) : (
                                <>
                                  <Users className="w-4 h-4 mr-1" />
                                  Collaborate
                                </>
                              )}
                            </Button>
                          </div>


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

      {/* Desktop Layout - Single Column */}
      <div className="hidden lg:block min-h-screen">
        <div className="max-w-7xl mx-auto p-6 pt-20 pb-24 space-y-6">
          {/* Header Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Book className="w-8 h-8 text-tiktok-red" />
              <h1 className="text-3xl font-bold text-white">My Stories</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Search stories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-tiktok-red h-12 text-lg"
                />
              </div>
              
              <div className="text-gray-400">
                {filteredStories.length} of {narrationCompleteStories.length} stories
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div>
          {filteredStories.length === 0 ? (
            <div className="text-center py-12">
              <Book className="w-16 h-16 mx-auto text-gray-600 mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">
                {searchQuery ? 'No Stories Found' : 'No Stories Yet'}
              </h2>
              <p className="text-gray-400 mb-6">
                {searchQuery 
                  ? 'Try adjusting your search terms to find more stories'
                  : 'Complete story to see them here'
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
                      <Card key={story.id} className="bg-dark-card border-gray-800 hover:border-gray-700 transition-colors h-full flex flex-col">
                        <CardHeader className="pb-3 flex-shrink-0">
                          <div className="space-y-1">
                            <CardTitle className="text-white text-lg leading-tight flex items-center justify-between">
                              <div className="flex-1 mr-2">
                                <div className="line-clamp-2">
                                  {story.title}
                                </div>
                                {!story.isPublic && (
                                  <div className="text-gray-400 text-sm mt-1">({UIMessages.getLabel('STORY_PRIVATE_LABEL')})</div>
                                )}
                              </div>
                              <div className="flex items-center space-x-1 flex-shrink-0">
                                <button
                                  onClick={() => setLocation(`/${story.id}/upload-story`)}
                                  className="p-1 hover:bg-gray-700 rounded transition-colors"
                                  title="Edit"
                                >
                                  <Edit2 className="w-4 h-4 text-gray-400 hover:text-white" />
                                </button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <button
                                      className="p-1 hover:bg-gray-700 rounded transition-colors"
                                      disabled={deletingStories.has(story.id)}
                                      title="Delete"
                                    >
                                      {deletingStories.has(story.id) ? (
                                        <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                                      ) : (
                                        <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-400" />
                                      )}
                                    </button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent className="bg-dark-card border-gray-800">
                                    <AlertDialogHeader>
                                      <AlertDialogTitle className="text-white flex items-center">
                                        <AlertTriangle className="w-5 h-5 text-yellow-500 mr-2" />
                                        Delete Story
                                      </AlertDialogTitle>
                                      <AlertDialogDescription className="text-gray-400">
                                        Are you sure you want to delete "{story.title}"? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel className="bg-gray-800 text-white hover:bg-gray-700">Cancel</AlertDialogCancel>
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
                            </CardTitle>
                            {story.category && (
                              <Badge variant="secondary" className="bg-gray-700 text-gray-300 text-xs w-fit">
                                {story.category}
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-3 flex-1 flex flex-col">
                          {story.summary && (
                            <p className="text-gray-400 text-sm line-clamp-3">
                              {story.summary}
                            </p>
                          )}
                          
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <div className="flex items-center space-x-3">
                              {story.readingTimeMinutes && (
                                <div className="flex items-center">
                                  <Clock className="w-4 h-4 mr-1" />
                                  {story.readingTimeMinutes}m
                                </div>
                              )}
                              {story.collaborators && story.collaborators > 0 && (
                                <div className="flex items-center">
                                  <Users className="w-4 h-4 mr-1" />
                                  {story.collaborators}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex-1 space-y-2">
                            {/* Display emotion tags if available */}
                            {(story.emotions || story.emotionalTags || []).length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {(story.emotions || story.emotionalTags || []).slice(0, 5).map((emotion, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs bg-gray-800/80 text-gray-300">
                                    {emotion}
                                  </Badge>
                                ))}
                                {(story.emotions || story.emotionalTags || []).length > 5 && (
                                  <Badge variant="secondary" className="text-xs bg-gray-800/80 text-gray-400">
                                    +{(story.emotions || story.emotionalTags || []).length - 5}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                          
                          <div className="mt-auto">
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
                                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                    Converting...
                                  </>
                                ) : (
                                  <>
                                    <Users className="w-4 h-4 mr-1" />
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
      </div>

    </div>
  );
}