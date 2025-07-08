import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import StoryNarratorControls from "@/components/ui/story-narrator-controls";
import { useAuth } from "@/hooks/useAuth";

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(`/stories/${storyId}`)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Story
          </Button>
          
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {story.title}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Story Narration
          </p>
        </div>

        {/* Narration Controls - Clean UI without save text */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <StoryNarratorControls
            storyId={storyId}
            user={user}
            canNarrate={true}
            className="p-0"
          />
        </div>
      </div>
    </div>
  );
}