import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AudioLines, Play, Pause, RotateCcw, Settings } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useMutation } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { getMessage } from "@shared/i18n-hierarchical";

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
  const [text, setText] = useState("Once upon a time, in a kingdom far away, there lived a wise old king who loved to tell stories to his grandchildren.");
  const [conversationStyle, setConversationStyle] = useState("respectful");
  const [emotion, setEmotion] = useState("neutral");
  const [narratorProfile, setNarratorProfile] = useState("neutral");
  const [voiceId, setVoiceId] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [voiceParameters, setVoiceParameters] = useState<any>(null);

  // Check admin access
  useEffect(() => {
    if (user && !user.isAdmin) {
      window.location.href = "/";
    }
  }, [user]);

  const generateNarrationMutation = useMutation({
    mutationFn: async (params: {
      text: string;
      conversationStyle: string;
      emotion: string;
      narratorProfile: string;
      voiceId?: string;
      forceRegenerate: boolean;
    }) => {
      const response = await apiClient.post("/api/admin/narration/generate", params);
      return response.data;
    },
    onSuccess: (data) => {
      setAudioUrl(data.audioUrl);
      setVoiceParameters(data.voiceParameters);
      toast({
        title: "Narration Generated",
        description: "Audio has been generated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate narration",
        variant: "destructive",
      });
    },
  });

  const handleGenerate = (forceRegenerate = false) => {
    if (!text.trim()) {
      toast({
        title: "Missing Text",
        description: "Please enter some text to narrate",
        variant: "destructive",
      });
      return;
    }

    generateNarrationMutation.mutate({
      text,
      conversationStyle,
      emotion,
      narratorProfile,
      voiceId: voiceId || undefined,
      forceRegenerate,
    });
  };

  const handlePlayPause = () => {
    if (!audioUrl) return;

    if (!audio) {
      const newAudio = new Audio(audioUrl);
      newAudio.addEventListener("ended", () => setIsPlaying(false));
      setAudio(newAudio);
      newAudio.play();
      setIsPlaying(true);
    } else {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        audio.play();
        setIsPlaying(true);
      }
    }
  };

  if (!user?.isAdmin) {
    return <div className="p-8">Admin access required</div>;
  }

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
              <Label htmlFor="text">Text to Narrate</Label>
              <Textarea
                id="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={6}
                placeholder="Enter text to narrate..."
                className="mt-2"
              />
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
                  <Button
                    onClick={handlePlayPause}
                    size="lg"
                    className="w-full"
                    variant={isPlaying ? "secondary" : "default"}
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="w-5 h-5 mr-2" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5 mr-2" />
                        Play
                      </>
                    )}
                  </Button>
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