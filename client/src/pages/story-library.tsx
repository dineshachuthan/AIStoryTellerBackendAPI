import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { Play, Users, Clock, Book, Edit, Trash2, Share } from "lucide-react";
import { BottomNavigation } from "@/components/bottom-navigation";
import { AppTopNavigation } from "@/components/app-top-navigation";
import { formatDistanceToNow } from "date-fns";

interface Story {
  id: number;
  title: string;
  content: string;
  summary: string;
  category: string;
  tags: string[];
  authorId: string;
  uploadType: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function StoryLibrary() {
  const [, setLocation] = useLocation();
  
  const { data: stories = [], isLoading } = useQuery({
    queryKey: ["/api/stories"],
  });

  const handlePlayStory = (storyId: number) => {
    setLocation(`/story/${storyId}/play`);
  };

  const handleEditStory = (storyId: number) => {
    setLocation(`/story/${storyId}/edit`);
  };

  const handleCollaborateStory = (storyId: number) => {
    setLocation(`/story/${storyId}/collaborate`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-white">Loading your stories...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg text-dark-text">
      <AppTopNavigation />
      
      {/* Page Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center space-x-3">
          <Book className="w-6 h-6 text-tiktok-pink" />
          <h1 className="text-2xl font-bold text-white">My Stories</h1>
        </div>
          <Button
            onClick={() => setLocation("/upload-story")}
            className="bg-tiktok-red hover:bg-tiktok-red/80"
            size="sm"
          >
            Create New Story
          </Button>
        </div>
      </div>

      {/* Stories Grid */}
      <div className="p-4 pb-20">
        {stories.length === 0 ? (
          <div className="text-center py-12">
            <Book className="w-16 h-16 mx-auto text-gray-600 mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">No Stories Yet</h2>
            <p className="text-gray-400 mb-6">
              Create your first interactive story and bring it to life with voices
            </p>
            <Button
              onClick={() => setLocation("/upload-story")}
              className="bg-tiktok-red hover:bg-tiktok-red/80"
            >
              Create Your First Story
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stories.map((story: Story) => (
              <Card key={story.id} className="bg-dark-card border-gray-800 hover:border-gray-700 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-white text-lg truncate mb-1">
                        {story.title}
                      </CardTitle>
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge 
                          variant="secondary" 
                          className="bg-tiktok-pink/20 text-tiktok-pink border-tiktok-pink/30"
                        >
                          {story.category}
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className="border-gray-600 text-gray-300"
                        >
                          {story.uploadType}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <CardDescription className="text-gray-400 text-sm line-clamp-2">
                    {story.summary || story.content.substring(0, 100) + '...'}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="flex items-center text-xs text-gray-500 mb-4">
                    <Clock className="w-3 h-3 mr-1" />
                    {formatDistanceToNow(new Date(story.createdAt), { addSuffix: true })}
                  </div>
                  
                  {story.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {story.tags.slice(0, 3).map((tag, index) => (
                        <Badge 
                          key={index}
                          variant="outline" 
                          className="text-xs border-gray-700 text-gray-400"
                        >
                          {tag}
                        </Badge>
                      ))}
                      {story.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs border-gray-700 text-gray-400">
                          +{story.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => handlePlayStory(story.id)}
                      className="bg-tiktok-cyan hover:bg-tiktok-cyan/80 flex-1"
                      size="sm"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Play
                    </Button>
                    <Button
                      onClick={() => handleCollaborateStory(story.id)}
                      variant="outline"
                      className="border-tiktok-pink text-tiktok-pink hover:bg-tiktok-pink/20"
                      size="sm"
                    >
                      <Users className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => handleEditStory(story.id)}
                      variant="outline"
                      className="border-gray-600 text-gray-300 hover:bg-gray-800"
                      size="sm"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
}