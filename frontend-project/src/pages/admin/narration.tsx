import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
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
import { toast, toastMessages } from "@/lib/toast-utils";
import { getMessage } from '@/lib/i18n';
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
  const [statusMessage, setStatusMessage] = useState<string>("");
  
  // Store multiple generated audios for comparison
  const [generatedAudios, setGeneratedAudios] = useState<Array<{
    id: string;
    audioUrl: string;
    voiceParameters: any;
    conversationStyle: string;
    emotion: string;
    narratorProfile: string;
    storyId: string;
    storyTitle: string;
    timestamp: Date;
  }>>([]);
  
  // Fetch stories for dropdown
  const { data: stories = [], isLoading: storiesLoading } = useQuery({
    queryKey: ["/api/stories"],
  });
  
  // Get the selected story content
  const selectedStory = stories.find(s => s.id.toString() === selectedStoryId);
  const storyContent = selectedStory?.content || ";

  // Admin check removed - page accessible to all authenticated users for testing

  const generateNarrationMutation = useMutation({
    mutationFn: async (params: {
      text: string;
      conversationStyle: string;
      emotion: string;
      narratorProfile: string;
      voiceId?: string;
      forceRegenerate: boolean;
      storyId: number;
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
      const newAudio = {
        id: `${selectedStoryId}-${conversationStyle}-${emotion}-${narratorProfile}-${Date.now()}`,
        audioUrl: data.audioUrl,
        voiceParameters: data.voiceParameters,
        conversationStyle,
        emotion,
        narratorProfile,
        storyId: selectedStoryId,
        storyTitle: selectedStory?.title || `Story ${selectedStoryId}`,
        timestamp: new Date()
      };
      
      setGeneratedAudios(prev => [newAudio, ...prev]);
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
      storyId: parseInt(selectedStoryId),
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

        {/* Output Section - Multiple Audio Comparisons */}
        <Card>
          <CardHeader>
            <CardTitle>Generated Audio Comparisons</CardTitle>
            <p className="text-sm text-muted-foreground">Compare different conversation styles, emotions, and narrator profiles</p>
          </CardHeader>
          <CardContent>
            {generatedAudios.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No audio generated yet. Click "Generate" to create narration with different settings.
              </div>
            ) : (
              <div className="space-y-4">
                {generatedAudios.map((audio) => (
                  <Card key={audio.id} className="border">
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        {/* Audio info header */}
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="font-medium">{audio.storyTitle}</div>
                            <div className="text-sm text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1">
                              <div>Style: <span className="font-medium">{audio.conversationStyle}</span></div>
                              <div>Emotion: <span className="font-medium">{audio.emotion}</span></div>
                              <div>Profile: <span className="font-medium">{audio.narratorProfile}</span></div>
                              <div>Time: {audio.timestamp.toLocaleTimeString()}</div>
                            </div>
                          </div>
                          <a
                            href={audio.audioUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm underline hover:text-primary"
                          >
                            Download
                          </a>
                        </div>
                        
                        {/* Audio player */}
                        <SimpleAudioPlayer 
                          audioUrl={audio.audioUrl}
                          showVolumeControl={true}
                        />
                        
                        {/* Voice parameters */}
                        {audio.voiceParameters && (
                          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                            <div className="grid grid-cols-4 gap-2">
                              <div>Stability: {audio.voiceParameters.voiceSettings?.stability || 'N/A'}</div>
                              <div>Similarity: {audio.voiceParameters.voiceSettings?.similarityBoost || 'N/A'}</div>
                              <div>Style: {audio.voiceParameters.voiceSettings?.style || 'N/A'}</div>
                              <div>Voice: {audio.voiceParameters.voiceId?.slice(-6) || 'Default'}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}