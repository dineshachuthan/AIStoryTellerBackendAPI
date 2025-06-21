import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Book, 
  Search, 
  Users, 
  Play, 
  Clock, 
  Globe, 
  Lock,
  Star,
  MessageSquare,
  Eye,
  Loader2
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { BottomNavigation } from "@/components/bottom-navigation";
import { apiRequest } from "@/lib/queryClient";

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
}

export default function StoryLibrary() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreatingStory, setIsCreatingStory] = useState(false);
  const [convertingStories, setConvertingStories] = useState<Set<number>>(new Set());

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
      const response = await apiRequest(`/api/stories/${storyId}/convert-to-template`, "POST", {
        makePublic: true
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
  
  const { data: stories = [], isLoading } = useQuery<Story[]>({
    queryKey: ["/api/stories", user?.id],
    enabled: !!user?.id,
  });

  // Filter stories based on search query
  const filteredStories = stories.filter(story => 
    story.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    story.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    story.category?.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 100);

  // Group stories by genre/category
  const storiesByGenre = filteredStories.reduce((acc, story) => {
    const genre = story.category || 'Uncategorized';
    if (!acc[genre]) {
      acc[genre] = [];
    }
    acc[genre].push(story);
    return acc;
  }, {} as Record<string, Story[]>);

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
      <div className="flex h-screen">
        {/* Left Sidebar - Search */}
        <div className="w-80 bg-gray-900/50 border-r border-gray-800 p-4">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Book className="w-6 h-6 text-tiktok-red" />
              <h1 className="text-xl font-bold text-white">Story Library</h1>
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
              {filteredStories.length} of {stories.length} stories
              {filteredStories.length === 100 && stories.length > 100 && " (limited to 100)"}
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

        {/* Right Content Area */}
        <div className="flex-1 p-4 pb-20 overflow-y-auto">
          {filteredStories.length === 0 ? (
            <div className="text-center py-12">
              <Book className="w-16 h-16 mx-auto text-gray-600 mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">
                {searchQuery ? 'No Stories Found' : 'No Stories Yet'}
              </h2>
              <p className="text-gray-400 mb-6">
                {searchQuery 
                  ? 'Try adjusting your search terms to find more stories'
                  : 'Create your first interactive story and bring it to life with voices'
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
                                onClick={() => setLocation(`/story/${story.id}`)}
                                className="flex-1 bg-tiktok-red hover:bg-tiktok-red/80 text-white"
                              >
                                <Play className="w-4 h-4 mr-1" />
                                Play
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setLocation(`/analysis/${story.id}`)}
                                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Analyze
                              </Button>
                            </div>
                            
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => convertToCollaborative(story.id)}
                              disabled={convertingStories.has(story.id)}
                              className="w-full border-purple-600 text-purple-400 hover:bg-purple-900/20"
                            >
                              {convertingStories.has(story.id) ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                  Converting...
                                </>
                              ) : (
                                <>
                                  <Users className="w-4 h-4 mr-1" />
                                  Convert to Collaborative
                                </>
                              )}
                            </Button>
                          </div>

                          {story.isPublic ? (
                            <div className="text-center py-2">
                              <div className="text-sm text-green-400 flex items-center justify-center">
                                <Globe className="w-4 h-4 mr-1" />
                                Published {story.publishedAt && formatDistanceToNow(new Date(story.publishedAt), { addSuffix: true })}
                              </div>
                              <p className="text-xs text-gray-500 mt-1">Available to all users</p>
                            </div>
                          ) : (
                            <div className="text-center py-2">
                              <div className="text-sm text-gray-400 flex items-center justify-center">
                                <Lock className="w-4 h-4 mr-1" />
                                Private Story
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