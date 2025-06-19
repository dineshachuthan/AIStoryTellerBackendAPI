import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  Eye,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";

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

interface StorySearchPanelProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  showToggle?: boolean;
  className?: string;
}

export function StorySearchPanel({ 
  isCollapsed = false, 
  onToggleCollapse, 
  showToggle = false,
  className = ""
}: StorySearchPanelProps) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  
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

  if (!user) {
    return null;
  }

  return (
    <div className={`bg-gray-900/50 border-r border-gray-800 transition-all duration-300 ${
      isCollapsed ? 'w-12' : 'w-80'
    } ${className}`}>
      <div className="h-full flex flex-col">
        {/* Toggle Button */}
        {showToggle && (
          <div className="p-2 border-b border-gray-800">
            <Button
              onClick={onToggleCollapse}
              variant="ghost"
              size="sm"
              className="w-full justify-center hover:bg-gray-800"
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </Button>
          </div>
        )}

        {!isCollapsed && (
          <div className="flex-1 p-4 space-y-4 overflow-y-auto">
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
              onClick={() => setLocation("/upload-story")}
              className="w-full bg-tiktok-red hover:bg-tiktok-red/80"
            >
              Create New Story
            </Button>

            {/* Story Results */}
            <div className="space-y-4">
              {isLoading ? (
                <div className="text-gray-400 text-sm">Loading stories...</div>
              ) : filteredStories.length === 0 ? (
                <div className="text-center py-6">
                  <Book className="w-12 h-12 mx-auto text-gray-600 mb-2" />
                  <p className="text-sm text-gray-400">
                    {searchQuery ? 'No stories found' : 'No stories yet'}
                  </p>
                </div>
              ) : (
                Object.entries(storiesByGenre).map(([genre, genreStories]) => (
                  <div key={genre} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-white">{genre}</h3>
                      <span className="text-xs text-gray-400">
                        {genreStories.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {genreStories.slice(0, 3).map((story: Story) => (
                        <Card key={story.id} className="bg-gray-800/50 border-gray-700 hover:border-gray-600 transition-colors cursor-pointer">
                          <CardContent className="p-3">
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium text-white line-clamp-1">
                                {story.title}
                              </h4>
                              {story.category && (
                                <Badge variant="secondary" className="bg-gray-700 text-gray-300 text-xs">
                                  {story.category}
                                </Badge>
                              )}
                              <div className="flex items-center justify-between text-xs text-gray-500">
                                <div className="flex items-center space-x-2">
                                  {story.readingTimeMinutes && (
                                    <div className="flex items-center">
                                      <Clock className="w-3 h-3 mr-1" />
                                      {story.readingTimeMinutes}m
                                    </div>
                                  )}
                                  {story.isPublic ? (
                                    <Globe className="w-3 h-3 text-green-400" />
                                  ) : (
                                    <Lock className="w-3 h-3 text-gray-400" />
                                  )}
                                </div>
                              </div>
                              <div className="flex space-x-1">
                                <Button
                                  size="sm"
                                  onClick={() => setLocation(`/story/${story.id}`)}
                                  className="flex-1 bg-tiktok-red hover:bg-tiktok-red/80 text-white text-xs h-6"
                                >
                                  <Play className="w-3 h-3 mr-1" />
                                  Play
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setLocation(`/analysis/${story.id}`)}
                                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700 text-xs h-6"
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  View
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      {genreStories.length > 3 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setLocation("/stories")}
                          className="w-full text-xs text-gray-400 hover:text-white"
                        >
                          View {genreStories.length - 3} more...
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}