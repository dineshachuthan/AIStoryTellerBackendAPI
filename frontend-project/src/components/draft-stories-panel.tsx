import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Book, 
  Search, 
  Users, 
  Mic, 
  Clock, 
  Globe, 
  EyeOff,
  Eye,
  ChevronLeft,
  ChevronRight,
  Trash2
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Edit2, Calendar } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { UIMessages, getDynamicMessage } from '@/config/i18n-config';
import { MAX_DRAFT_STORIES } from '@/config/draft-config';
import { toast, toastMessages } from "@/lib/toast-utils";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useStories } from "@/hooks/use-api";

interface Story {
  id: number;
  title: string;
  content: string;
  category: string;
  genre?: string;
  authorId: string;
  publishedAt?: string;
  isPublished: boolean;
  readingTime?: number;
  summary?: string;
  viewCount?: number;
  likes?: number;
  narratorVoice?: string;
  narratorVoiceType?: string;
  emotions?: string[];
  emotionalTags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

interface DraftStoriesPanelProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  showToggle?: boolean;
  className?: string;
}

export function DraftStoriesPanel({ 
  isCollapsed = false, 
  onToggleCollapse, 
  showToggle = false,
  className = ""
}: DraftStoriesPanelProps) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  // Delete story mutation
  const deleteStoryMutation = useMutation({
    mutationFn: async (storyId: number) => {
      return apiRequest(`/api/stories/${storyId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      toast({
        title: "Story deleted",
        description: "Draft story has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/stories"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete story. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  const { data: stories = [], isLoading } = useStories({
    userId: user?.id,
    enabled: !!user?.id,
  });

  // Filter stories based on search query AND draft status (no narrator voice)
  const draftStories = (Array.isArray(stories) ? stories : []).filter(story => {
    // Only show draft stories (stories without narrator voice)
    return !story.narratorVoice && !story.narratorVoiceType;
  });

  // Show all draft stories (no filtering needed since limit is 5)
  const filteredStories = draftStories;

  // Constants for draft story limits
  const draftCount = draftStories.length;
  const canCreateMore = draftCount < MAX_DRAFT_STORIES;

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
    <div className={`bg-dark-bg transition-all duration-300 ${
      isCollapsed ? 'w-12 sm:w-16' : 'w-64 sm:w-72 md:w-80 lg:w-96'
    } ${className} hidden sm:block h-full`}>
      <div className="h-full flex flex-col">
        {/* Toggle Button */}
        {showToggle && (
          <div className="p-1 sm:p-2">
            <Button
              onClick={onToggleCollapse}
              variant="ghost"
              size="sm"
              className="w-full justify-center hover:bg-gray-800 h-8 sm:h-10"
            >
              {isCollapsed ? <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" /> : <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />}
            </Button>
          </div>
        )}

        {!isCollapsed && (
          <div className="flex-1 p-2 sm:p-4 space-y-3 sm:space-y-4 overflow-y-auto pb-20 sm:pb-24">
            <div className="flex items-center space-x-2">
              <Book className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-orange-500" />
              <div className="flex flex-col">
                <h1 className="text-base sm:text-lg lg:text-xl font-bold text-white">
                  {UIMessages.getTitle('DRAFT_STORIES_PANEL_TITLE')}
                </h1>
                <div className="text-xs sm:text-sm text-gray-400">
                  {getDynamicMessage('DRAFT_STORIES_COUNT', { currentCount: draftCount.toString(), maxCount: MAX_DRAFT_STORIES.toString() }).message}
                  {!canCreateMore && (
                    <span className="text-orange-400 block mt-1">
                      {getDynamicMessage('DRAFT_STORIES_LIMIT_REACHED', {}).message}
                    </span>
                  )}
                </div>
              </div>
            </div>

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
                        <Card key={story.id} className="bg-dark-card border-gray-800 hover:border-gray-700 hover:shadow-lg hover:shadow-purple-900/20 transition-all cursor-pointer">
                          <CardContent className="p-4">
                            <div className="space-y-2.5">
                              <div>
                                <div className="flex items-center justify-between">
                                  <h4 className="text-sm font-medium text-white truncate flex-1">
                                    {story.title}
                                  </h4>
                                  {story.readingTime && (
                                    <div className="flex items-center text-xs text-gray-500 ml-2">
                                      <Clock className="w-3 h-3 mr-1" />
                                      {story.readingTime}m
                                    </div>
                                  )}
                                </div>
                                {!story.isPublished && (
                                  <div className="text-gray-400 text-xs mt-0.5 flex items-center gap-2">
                                    <span>(private)</span>
                                    {story.updatedAt && (
                                      <span>• {formatDistanceToNow(new Date(story.updatedAt), { addSuffix: true })}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                              {story.category && (
                                <Badge variant="secondary" className="bg-gray-700 text-gray-300 text-xs">
                                  {story.category}
                                </Badge>
                              )}
                              
                              {story.summary && (
                                <p className="text-gray-400 text-xs line-clamp-2">
                                  {story.summary}
                                </p>
                              )}
                              
                              {/* Display emotion tags if available */}
                              {(story.emotions || story.emotionalTags || []).length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {(story.emotions || story.emotionalTags || []).slice(0, 3).map((emotion, idx) => (
                                    <Badge key={idx} variant="secondary" className="text-xs bg-gray-800/80 text-gray-300 px-1.5 py-0">
                                      {emotion}
                                    </Badge>
                                  ))}
                                  {(story.emotions || story.emotionalTags || []).length > 3 && (
                                    <Badge variant="secondary" className="text-xs bg-gray-800/80 text-gray-400 px-1.5 py-0">
                                      +{(story.emotions || story.emotionalTags || []).length - 3}
                                    </Badge>
                                  )}
                                </div>
                              )}
                              
                              
                              <div className="flex space-x-1 pt-1">
                                {story.authorId === user?.id ? (
                                  // User's own story - show analysis and play options
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => setLocation(`/${story.id}/upload-story`)}
                                      className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white text-xs h-8 px-2"
                                    >
                                      <Eye className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setLocation(`/analysis/${story.id}`)}
                                      className="flex-1 border-orange-600 text-orange-400 hover:bg-orange-900/20 text-xs h-8"
                                    >
                                      <Mic className="w-3 h-3 mr-1" />
                                      Record your sample voice
                                    </Button>
                                  </>
                                ) : (
                                  // Public story from another user - allow voice sample recording
                                  <Button
                                    size="sm"
                                    onClick={() => setLocation(`/analysis/${story.id}`)}
                                    className="w-full bg-orange-600 hover:bg-orange-700 text-white text-xs h-6"
                                  >
                                    <Mic className="w-3 h-3 mr-1" />
                                    Record Voice Samples
                                  </Button>
                                )}
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