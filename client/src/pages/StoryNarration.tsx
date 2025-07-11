import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download, AudioLines, Play, Settings, Trash2 } from "lucide-react";
import StoryNarratorControls from "@/components/ui/story-narrator-controls";
import { SimpleAudioPlayer } from "@/components/ui/simple-audio-player";
import { useAuth } from "@/hooks/useAuth";
import { AppTopNavigation } from "@/components/app-top-navigation";
import { apiClient } from "@/lib/api-client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast, toastMessages } from "@/lib/toast-utils";
import { useState } from "react";

const CONVERSATION_STYLES = [
  "respectful",
  "business", 
  "jovial",
  "playful",
  "close_friends",
  "parent_to_child",
  "child_to_parent",
  "siblings"
];

// Emotion is set to "neutral" by default for now (future feature)

const NARRATOR_PROFILES = [
  { id: "neutral", name: "Neutral", description: "Your cloned voice" },
  { id: "grandma", name: "Grandma", description: "Warm, slow, caring" },
  { id: "kid", name: "Kid", description: "Energetic, fast, playful" },
  { id: "business", name: "Business", description: "Professional, clear" },
  { id: "storyteller", name: "Storyteller", description: "Dramatic, engaging" }
];

export default function StoryNarration() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const storyId = parseInt(id || "0");
  const queryClient = useQueryClient();
  
  // State for test generation controls
  const [conversationStyle, setConversationStyle] = useState("respectful");
  const [narratorProfile, setNarratorProfile] = useState("neutral");
  
  // Emotion is hardcoded to "neutral" for now (future feature)
  const emotion = "neutral";

  // Fetch story details
  const { data: story, isLoading } = useQuery({
    queryKey: [`/api/stories/${storyId}`],
    queryFn: () => apiClient.stories.get(storyId),
    enabled: !!storyId && !!user
  });



  // Fetch all narrations for this story
  const { data: allNarrations = [], isLoading: allNarrationsLoading, refetch: refetchNarrations } = useQuery({
    queryKey: [`/api/stories/${storyId}/narrations/all`],
    queryFn: () => apiClient.stories.getAllNarrations(storyId),
    enabled: !!storyId && !!user
  });

  // Narration generation mutation
  const generateNarrationMutation = useMutation({
    mutationFn: () => {
      console.log(`[GenerateNarration] Generating narration for storyId: ${storyId}, style: ${conversationStyle}, profile: ${narratorProfile}`);
      return apiClient.stories.generateNarration(storyId, conversationStyle, narratorProfile);
    },
    onSuccess: (data) => {
      console.log('[GenerateNarration] Success:', data);
      toast.success("Narration generated successfully");
      refetchNarrations();
    },
    onError: (error) => {
      console.error('[GenerateNarration] Error:', error);
      toast.error(`Failed to generate narration: ${error.message}`);
    }
  });

  // Delete narration mutation
  const deleteNarrationMutation = useMutation({
    mutationFn: (narrationId: number) => {
      console.log(`[DeleteNarration] Deleting narration ${narrationId} for story ${storyId}`);
      return apiClient.stories.deleteNarration(storyId, narrationId);
    },
    onSuccess: (data, narrationId) => {
      console.log('[DeleteNarration] Success:', data);
      toast.success("Narration deleted successfully - removed from database, cache, and audio files");
      
      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({
        queryKey: [`/api/stories/${storyId}/narrations/all`]
      });
      refetchNarrations();
    },
    onError: (error) => {
      console.error('[DeleteNarration] Error:', error);
      toast.error(`Failed to delete narration: ${error.message}`);
    }
  });

  if (isLoading || allNarrationsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading story...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-2">Please log in to view story narration</p>
          <Button
            variant="outline"
            onClick={() => navigate("/login")}
            className="mt-4"
          >
            Log In
          </Button>
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
          {/* Story Title */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">
              {story?.title || "Loading..."}
            </h1>
            <p className="text-white/70">
              Story Narration
            </p>
          </div>

          {/* Narration Generation Controls - For generating different cache keys */}
          <Card className="mt-6 bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Narration Generation Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="conversation-style" className="text-white/90">
                    Conversation Style
                  </Label>
                  <Select 
                    value={conversationStyle} 
                    onValueChange={setConversationStyle}
                  >
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONVERSATION_STYLES.map((style) => (
                        <SelectItem key={style} value={style}>
                          {style.replace('_', ' ').charAt(0).toUpperCase() + style.replace('_', ' ').slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="narrator-profile" className="text-white/90">
                    Narrator Profile
                  </Label>
                  <Select value={narratorProfile} onValueChange={setNarratorProfile}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NARRATOR_PROFILES.map((profile) => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.name} - {profile.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="pt-4">
                <Button 
                  onClick={() => generateNarrationMutation.mutate()}
                  disabled={generateNarrationMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {generateNarrationMutation.isPending ? "Generating..." : "Generate Narration"}
                </Button>
                <p className="text-sm text-white/60 mt-2">
                  This will generate a narration with the selected conversation style and narrator profile.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* All Available Narrations Section */}
          {allNarrations && allNarrations.length > 0 && (
            <div className="mt-8">
              <h2 className="text-2xl font-bold text-white mb-4">
                All Available Narrations ({allNarrations.length})
              </h2>
              <div className="grid gap-4">
                {allNarrations.map((narration) => (
                  <div
                    key={narration.id}
                    className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-medium text-white/90">
                          Conversation Style: {narration.conversationStyle.replace('_', ' ').charAt(0).toUpperCase() + narration.conversationStyle.replace('_', ' ').slice(1)}
                        </div>
                        <div className="text-sm text-white/60">
                          Narrator Profile: {(() => {
                            const profile = NARRATOR_PROFILES.find(p => p.id === narration.narratorProfile);
                            return profile ? `${profile.name} - ${profile.description}` : narration.narratorProfile;
                          })()}
                        </div>
                        <div className="text-sm text-white/60">
                          Voice: {narration.narratorVoiceType}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-sm text-white/50">
                          {new Date(narration.timestamp).toLocaleString()}
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            const narrationId = parseInt(narration.id.replace('narration-', ''));
                            deleteNarrationMutation.mutate(narrationId);
                          }}
                          disabled={deleteNarrationMutation.isPending}
                          className="h-8 w-8 p-0 bg-red-600 hover:bg-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {narration.audioUrl && (
                      <div className="mt-3">
                        <SimpleAudioPlayer
                          audioUrl={narration.audioUrl}
                          segments={narration.segments}
                          title={`${narration.conversationStyle.replace('_', ' ').charAt(0).toUpperCase() + narration.conversationStyle.replace('_', ' ').slice(1)} Style`}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}