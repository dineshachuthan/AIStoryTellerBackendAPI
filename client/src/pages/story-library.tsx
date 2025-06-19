import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { Play, Users, Clock, Book, Edit, Trash2, Share, Globe, Lock, AlertTriangle, Search } from "lucide-react";
import { BottomNavigation } from "@/components/bottom-navigation";
import { AppTopNavigation } from "@/components/app-top-navigation";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
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
import type { Story } from "@shared/schema";

export default function StoryLibrary() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: stories = [], isLoading } = useQuery<Story[]>({
    queryKey: ["/api/stories", user?.id],
    enabled: !!user?.id,
  });

  const publishStoryMutation = useMutation({
    mutationFn: async (storyId: number) => {
      return await apiRequest(`/api/stories/${user?.id}/${storyId}/publish`, {
        method: "PATCH",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stories", user?.id] });
      toast({
        title: "Story Published",
        description: "Your story is now public and available to all users. This action cannot be undone.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Publishing Failed",
        description: error.message || "Failed to publish story",
        variant: "destructive",
      });
    },
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

  const handlePublishStory = (storyId: number) => {
    publishStoryMutation.mutate(storyId);
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
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-8rem)]">
        {/* Left Sidebar - Search */}
        <div className="w-80 border-r border-gray-800 p-4">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search stories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
              />
            </div>
          </div>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 p-4 pb-20 overflow-y-auto">
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
                        {story.isPublished ? (
                          <Badge className="bg-green-600/20 text-green-400 border-green-600/30">
                            <Globe className="w-3 h-3 mr-1" />
                            Public
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-gray-600 text-gray-400">
                            <Lock className="w-3 h-3 mr-1" />
                            Private
                          </Badge>
                        )}
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
                    {story.createdAt ? formatDistanceToNow(new Date(story.createdAt), { addSuffix: true }) : 'Recently'}
                  </div>
                  
                  {story.tags && story.tags.length > 0 && (
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
                  
                  <div className="flex space-x-2 mb-3">
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

                  {/* Publishing Controls */}
                  {!story.isPublished ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full border-green-600 text-green-400 hover:bg-green-600/20"
                          size="sm"
                        >
                          <Globe className="w-4 h-4 mr-2" />
                          Make Public
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-dark-card border-gray-800">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-white flex items-center">
                            <AlertTriangle className="w-5 h-5 mr-2 text-yellow-500" />
                            Publish Story
                          </AlertDialogTitle>
                          <AlertDialogDescription className="text-gray-400">
                            Once you make this story public, it will be available to all users and they can create their own customized versions with personal voices and character images. 
                            <br /><br />
                            <strong className="text-yellow-400">This action cannot be undone.</strong> You will not be able to make it private again.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-gray-800 border-gray-700 text-gray-300">
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handlePublishStory(story.id)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                            disabled={publishStoryMutation.isPending}
                          >
                            {publishStoryMutation.isPending ? "Publishing..." : "Publish Story"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : (
                    <div className="text-center py-2">
                      <div className="text-sm text-green-400 flex items-center justify-center">
                        <Globe className="w-4 h-4 mr-1" />
                        Published {story.publishedAt && formatDistanceToNow(new Date(story.publishedAt), { addSuffix: true })}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Available to all users</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          )}
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
}