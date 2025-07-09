import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AudioLines, Play, Pause, RotateCcw, Settings, BookOpen } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { getMessage } from "@shared/i18n-hierarchical";
import { SimpleAudioPlayer } from "@/components/ui/simple-audio-player";

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

const EMOTIONS = [
  "neutral",
  "happy",
  "sad",
  "angry",
  "fear",
  "surprised",
  "thoughtful",
  "excited",
  "confident",
  "contemplative"
];

const NARRATOR_PROFILES = [
  { id: "neutral", name: "Neutral", description: "Standard narration" },
  { id: "grandma", name: "Grandma", description: "Warm, slow, caring" },
  { id: "kid", name: "Kid", description: "Energetic, fast, playful" },
  { id: "business", name: "Business", description: "Professional, clear" },
  { id: "storyteller", name: "Storyteller", description: "Dramatic, engaging" }
];

export default function AdminNarration() {
  const { user } = useAuth();
  const [selectedStoryId, setSelectedStoryId] = useState<string>("");
  const [storyIdInput, setStoryIdInput] = useState<string>("");
  const [conversationStyle, setConversationStyle] = useState("respectful");
  const [emotion, setEmotion] = useState("neutral");
  const [narratorProfile, setNarratorProfile] = useState("neutral");
  const [voiceId, setVoiceId] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [voiceParameters, setVoiceParameters] = useState<any>(null);
  const [statusMessage, setStatusMessage] = useState<string>("");
  
  // Fetch stories for dropdown
  const { data: stories = [], isLoading: storiesLoading } = useQuery({
    queryKey: ["/api/stories"],
  });
  
  // Get the selected story content
  const selectedStory = stories.find(s => s.id.toString() === selectedStoryId);
  const storyContent = selectedStory?.content || "";

  // Admin check removed - page accessible to all authenticated users for testing

  const generateNarrationMutation = useMutation({
    mutationFn: async (params: {
      text: string;
      conversationStyle: string;
      emotion: string;
      narratorProfile: string;
      voiceId?: string;
      forceRegenerate: boolean;
    }) => {
      const response = await fetch("/api/admin/narration/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(params),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to generate narration");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setAudioUrl(data.audioUrl);
      setVoiceParameters(data.voiceParameters);
      setStatusMessage("Audio generated successfully");
      setTimeout(() => setStatusMessage(""), 3000);
    },
    onError: (error: any) => {
      console.error("Generation failed:", error);
      setStatusMessage(`Error: ${error.message}`);
      setTimeout(() => setStatusMessage(""), 5000);
    },
  });

  const handleGenerate = (forceRegenerate = false) => {
    const textToNarrate = storyContent || (storyIdInput ? `Story ID ${storyIdInput} content` : "");
    
    if (!textToNarrate.trim() || !selectedStoryId) {
      console.error("Missing story - please select a story to narrate");
      return;
    }

    generateNarrationMutation.mutate({
      text: textToNarrate,
      conversationStyle,
      emotion,
      narratorProfile,
      voiceId: voiceId || undefined,
      forceRegenerate,
    });
  };

  // Audio is handled by SimpleAudioPlayer component

  // Admin check removed - page is accessible to all authenticated users for testing

  return (
    <div className="container mx-auto p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin Narration Testing</h1>
        <p className="text-muted-foreground">
          Test voice narration with different conversation styles and emotions without caching restrictions
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle>Narration Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="story">Select Story</Label>
              <Select 
                value={selectedStoryId} 
                onValueChange={(value) => {
                  setSelectedStoryId(value);
                  setStoryIdInput(value);
                }}
                disabled={storiesLoading}
              >
                <SelectTrigger id="story" className="mt-2">
                  <SelectValue placeholder={storiesLoading ? "Loading stories..." : "Select a story"} />
                </SelectTrigger>
                <SelectContent>
                  {stories.map((story) => (
                    <SelectItem key={story.id} value={story.id.toString()}>
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        <span>{story.title}</span>
                        <span className="text-xs text-muted-foreground">({story.content?.length || 0} chars)</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="mt-4">
                <Label htmlFor="storyId">Or Enter Story ID</Label>
                <Input
                  id="storyId"
                  type="number"
                  value={storyIdInput}
                  onChange={(e) => {
                    setStoryIdInput(e.target.value);
                    setSelectedStoryId(e.target.value);
                  }}
                  placeholder="Enter story ID directly"
                  className="mt-2"
                />
              </div>
              
              {selectedStory && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <div className="text-sm font-medium mb-2">Story Preview:</div>
                  <div className="text-sm text-muted-foreground line-clamp-3">
                    {selectedStory.content}
                  </div>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="conversationStyle">Conversation Style</Label>
              <Select value={conversationStyle} onValueChange={setConversationStyle}>
                <SelectTrigger id="conversationStyle" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONVERSATION_STYLES.map((style) => (
                    <SelectItem key={style} value={style}>
                      {style.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="emotion">Emotion</Label>
              <Select value={emotion} onValueChange={setEmotion}>
                <SelectTrigger id="emotion" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMOTIONS.map((emo) => (
                    <SelectItem key={emo} value={emo}>
                      {emo.charAt(0).toUpperCase() + emo.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="narratorProfile">Narrator Profile</Label>
              <Select value={narratorProfile} onValueChange={setNarratorProfile}>
                <SelectTrigger id="narratorProfile" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NARRATOR_PROFILES.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      <div>
                        <div className="font-medium">{profile.name}</div>
                        <div className="text-sm text-muted-foreground">{profile.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="voiceId">Voice ID (Optional)</Label>
              <Input
                id="voiceId"
                value={voiceId}
                onChange={(e) => setVoiceId(e.target.value)}
                placeholder="ElevenLabs Voice ID"
                className="mt-2"
              />
            </div>

            {statusMessage && (
              <div className="text-sm text-muted-foreground text-center">
                {statusMessage}
              </div>
            )}

            <div className="flex gap-4">
              <Button
                onClick={() => handleGenerate(false)}
                disabled={generateNarrationMutation.isPending}
                className="flex-1"
              >
                <AudioLines className="w-4 h-4 mr-2" />
                Generate (With Cache)
              </Button>
              <Button
                onClick={() => handleGenerate(true)}
                disabled={generateNarrationMutation.isPending}
                variant="outline"
                className="flex-1"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Force Regenerate
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Output Section */}
        <div className="space-y-6">
          {/* Audio Player */}
          <Card>
            <CardHeader>
              <CardTitle>Generated Audio</CardTitle>
            </CardHeader>
            <CardContent>
              {audioUrl ? (
                <div className="space-y-4">
                  <SimpleAudioPlayer 
                    audioUrl={audioUrl}
                    showVolumeControl={true}
                  />
                  <div className="text-sm text-muted-foreground">
                    <a
                      href={audioUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-primary"
                    >
                      Download Audio
                    </a>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No audio generated yet. Click "Generate" to create narration.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Voice Parameters */}
          {voiceParameters && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Voice Parameters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="calculated" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="calculated">Calculated</TabsTrigger>
                    <TabsTrigger value="raw">Raw JSON</TabsTrigger>
                  </TabsList>
                  <TabsContent value="calculated" className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="font-medium">Stability:</span>
                        <span className="ml-2">{voiceParameters.voiceSettings?.stability || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="font-medium">Similarity:</span>
                        <span className="ml-2">{voiceParameters.voiceSettings?.similarityBoost || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="font-medium">Style:</span>
                        <span className="ml-2">{voiceParameters.voiceSettings?.style || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="font-medium">Voice ID:</span>
                        <span className="ml-2 text-xs">{voiceParameters.voiceId || 'Default'}</span>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Pitch:</span>
                        <span className="ml-2">{voiceParameters.voiceSettings?.prosody?.pitch || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="font-medium">Rate:</span>
                        <span className="ml-2">{voiceParameters.voiceSettings?.prosody?.rate || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="font-medium">Volume:</span>
                        <span className="ml-2">{voiceParameters.voiceSettings?.prosody?.volume || 'N/A'}</span>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="raw">
                    <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-64">
                      {JSON.stringify(voiceParameters, null, 2)}
                    </pre>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}