import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import StoryNarratorControls from "@/components/ui/story-narrator-controls";
import { useAuth } from "@/hooks/useAuth";
import { AppTopNavigation } from "@/components/app-top-navigation";

export default function StoryNarration() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const storyId = parseInt(id || "0");

  // Fetch story details
  const { data: story, isLoading } = useQuery({
    queryKey: [`/api/stories/${storyId}`],
    enabled: !!storyId && !!user
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading story...</p>
        </div>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Story not found</p>
          <Button
            variant="outline"
            onClick={() => navigate("/")}
            className="mt-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <AppTopNavigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate(`/stories/${storyId}`)}
              className="mb-4 text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Story
            </Button>
            
            <h1 className="text-4xl font-bold text-white mb-2">
              {story.title}
            </h1>
            <p className="text-white/70">
              Story Narration
            </p>
          </div>

          {/* Test message */}
          <div className="bg-white/10 p-4 rounded-lg mb-4">
            <p className="text-white">Story loaded successfully! User: {user?.email}</p>
          </div>

          {/* Narration Controls - Clean UI without save text */}
          <StoryNarratorControls
            storyId={storyId}
            user={user}
            canNarrate={true}
            className=""
          />
        </div>
      </div>
    </div>
  );
}