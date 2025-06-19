import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Heart, Sparkles, Upload, Loader2, Play, Volume2, Mic, MicOff, Square } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";

interface StoryAnalysis {
  characters: Array<{
    name: string;
    description: string;
    personality: string;
    role: string;
    appearance?: string;
    traits: string[];
    assignedVoice?: string;
    voiceSampleId?: number;
  }>;
  emotions: Array<{
    emotion: string;
    intensity: number;
    context: string;
    quote?: string;
  }>;
  summary: string;
  category: string;
  themes: string[];
  suggestedTags: string[];
  isAdultContent: boolean;
}

interface CharacterWithImage {
  name: string;
  description: string;
  personality: string;
  role: string;
  appearance?: string;
  traits: string[];
  imageUrl?: string;
  assignedVoice?: string;
  voiceSampleId?: number;
}

interface EmotionWithSound {
  emotion: string;
  intensity: number;
  context: string;
  quote?: string;
  soundUrl?: string;
}

interface StoryAnalysisOutputProps {
  analysis: StoryAnalysis;
  content: string;
  title: string;
  onCreateStory?: (analysis: StoryAnalysis, content: string, title: string) => Promise<void>;
  showCreateButton?: boolean;
  isCreating?: boolean;
  className?: string;
  storyId?: number;
  onUpdateStory?: (storyId: number) => Promise<void>;
  isUpdating?: boolean;
  isPrivateStory?: boolean;
}

export function StoryAnalysisOutput({
  analysis,
  content,
  title,
  onCreateStory,
  showCreateButton = true,
  isCreating = false,
  className = "",
  storyId,
  onUpdateStory,
  isUpdating = false,
  isPrivateStory = false
}: StoryAnalysisOutputProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [charactersWithImages, setCharactersWithImages] = useState<CharacterWithImage[]>([]);
  const [emotionsWithSounds, setEmotionsWithSounds] = useState<EmotionWithSound[]>([]);
  const [generatingImages, setGeneratingImages] = useState<number[]>([]);
  const [playingEmotions, setPlayingEmotions] = useState<{[key: string]: boolean}>({});
  const [recordingEmotions, setRecordingEmotions] = useState<{[key: string]: boolean}>({});
  const [emotionRecorders, setEmotionRecorders] = useState<{[key: string]: MediaRecorder}>({});
  const [recordingStartTimes, setRecordingStartTimes] = useState<{[key: string]: number}>({});
  const [isHolding, setIsHolding] = useState<{[key: string]: boolean}>({});
  const [holdTimers, setHoldTimers] = useState<{[key: string]: NodeJS.Timeout}>({});

  useEffect(() => {
    // Initialize characters with default images
    const charactersWithDefaults = (analysis.characters || []).map((char: any) => ({
      ...char,
      imageUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(char.name)}&backgroundColor=b6e3f4,c0aede,d1d4f9`,
    }));

    // Initialize emotions with default sounds
    const emotionsWithDefaults = (analysis.emotions || []).map((emotion: any) => ({
      ...emotion,
      soundUrl: `/api/emotions/default-sound?emotion=${emotion.emotion}&intensity=${emotion.intensity}`
    }));

    setCharactersWithImages(charactersWithDefaults);
    setEmotionsWithSounds(emotionsWithDefaults);
  }, [analysis]);

  // Create character-emotion associations for display
  const getCharacterEmotionGroups = () => {
    return (charactersWithImages || []).map(character => {
      const characterEmotions = (emotionsWithSounds || []).filter(emotion => {
        const context = emotion.context.toLowerCase();
        const quote = (emotion.quote || '').toLowerCase();
        const characterName = character.name.toLowerCase();
        const firstName = characterName.split(' ')[0];
        
        // Check if emotion context explicitly mentions this character
        if (context.includes(characterName) || context.includes(firstName)) {
          return true;
        }
        
        // Check if the quote mentions this character
        if (emotion.quote && (quote.includes(characterName) || quote.includes(firstName))) {
          return true;
        }
        
        // For protagonist role, associate most emotions
        if (character.role === 'protagonist') {
          return true;
        }
        
        // For supporting characters, associate relevant emotions
        if (character.role === 'supporting') {
          if (emotion.emotion === 'shock' || emotion.emotion === 'surprise' || 
              emotion.emotion === 'confusion' || emotion.emotion === 'concern') {
            return true;
          }
        }
        
        return false;
      });
      
      return {
        character,
        emotions: characterEmotions
      };
    });
  };

  const generateCharacterImage = async (characterIndex: number) => {
    const character = charactersWithImages[characterIndex];
    if (!character) return;

    // Prevent multiple simultaneous requests
    if (generatingImages.includes(characterIndex)) return;

    // Skip if already has a generated AI image
    if (character.imageUrl && 
        !character.imageUrl.includes('dicebear.com') && 
        !character.imageUrl.includes('/api/characters/default-image')) {
      return;
    }

    setGeneratingImages(prev => [...prev, characterIndex]);

    try {
      const imageUrl = await apiRequest('/api/characters/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          character,
          storyContext: analysis.summary || content.substring(0, 500)
        }),
      });

      const updatedCharacters = [...charactersWithImages];
      updatedCharacters[characterIndex] = { ...character, imageUrl: imageUrl.url };
      setCharactersWithImages(updatedCharacters);
      
      toast({
        title: "Image Generated",
        description: `AI image created for ${character.name}`,
      });
    } catch (error) {
      console.error("Image generation error:", error);
      toast({
        title: "Image Generation Failed",
        description: error instanceof Error ? error.message : "Could not generate character image.",
        variant: "destructive",
      });
    } finally {
      setGeneratingImages(prev => prev.filter(index => index !== characterIndex));
    }
  };

  const playEmotionSample = async (emotion: EmotionWithSound, emotionKey: string) => {
    if (playingEmotions[emotionKey]) return;

    setPlayingEmotions(prev => ({ ...prev, [emotionKey]: true }));

    try {
      const response = await apiRequest('/api/emotions/generate-sample', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emotion: emotion.emotion,
          intensity: emotion.intensity,
          context: emotion.context,
          quote: emotion.quote
        }),
      });

      if (response.audioUrl) {
        const audio = new Audio(response.audioUrl);
        await audio.play();
        audio.onended = () => {
          setPlayingEmotions(prev => ({ ...prev, [emotionKey]: false }));
        };
      }
    } catch (error) {
      console.error("Failed to play emotion sample:", error);
      toast({
        title: "Playback Failed",
        description: "Could not play emotion sample",
        variant: "destructive",
      });
      setPlayingEmotions(prev => ({ ...prev, [emotionKey]: false }));
    }
  };

  const startVoiceRecording = async (emotionKey: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        // Here you would upload the recorded audio
        console.log('Recording completed for emotion:', emotionKey, blob);
        
        // Clean up
        stream.getTracks().forEach(track => track.stop());
        setEmotionRecorders(prev => {
          const updated = { ...prev };
          delete updated[emotionKey];
          return updated;
        });
      };

      setEmotionRecorders(prev => ({ ...prev, [emotionKey]: mediaRecorder }));
      setRecordingStartTimes(prev => ({ ...prev, [emotionKey]: Date.now() }));
      mediaRecorder.start();
      
      toast({
        title: "Recording Started",
        description: "Hold the button to record your voice",
      });
    } catch (error) {
      console.error("Failed to start recording:", error);
      toast({
        title: "Recording Failed",
        description: "Could not access microphone",
        variant: "destructive",
      });
    }
  };

  const stopVoiceRecording = (emotionKey: string) => {
    const recorder = emotionRecorders[emotionKey];
    if (recorder && recorder.state === 'recording') {
      recorder.stop();
      setRecordingEmotions(prev => ({ ...prev, [emotionKey]: false }));
    }
  };

  const handleMouseDown = async (emotionKey: string) => {
    setIsHolding(prev => ({ ...prev, [emotionKey]: true }));
    
    const timer = setTimeout(async () => {
      if (isHolding[emotionKey]) {
        setRecordingEmotions(prev => ({ ...prev, [emotionKey]: true }));
        await startVoiceRecording(emotionKey);
      }
    }, 200);
    
    setHoldTimers(prev => ({ ...prev, [emotionKey]: timer }));
  };

  const handleMouseUp = (emotionKey: string) => {
    setIsHolding(prev => ({ ...prev, [emotionKey]: false }));
    
    const timer = holdTimers[emotionKey];
    if (timer) {
      clearTimeout(timer);
      setHoldTimers(prev => {
        const updated = { ...prev };
        delete updated[emotionKey];
        return updated;
      });
    }
    
    if (recordingEmotions[emotionKey]) {
      stopVoiceRecording(emotionKey);
    }
  };

  // Early return if no data to prevent errors
  if (!analysis || !analysis.characters || !analysis.emotions) {
    return (
      <div className={`space-y-8 ${className}`}>
        <div className="text-white text-center">
          <p>Loading story analysis...</p>
        </div>
      </div>
    );
  }

  const characterEmotionGroups = getCharacterEmotionGroups();

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Character-Emotion Groups */}
      {characterEmotionGroups.map((group, groupIndex) => (
        <Card key={groupIndex} className="bg-white/10 backdrop-blur-lg border-white/20 text-white">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={group.character.imageUrl} alt={group.character.name} />
                  <AvatarFallback className="bg-purple-600 text-white">
                    {group.character.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-bold text-white">{group.character.name}</h3>
                  <Badge variant="outline" className="border-white/30 text-white/70 mb-2">
                    {group.character.role}
                  </Badge>
                  <p className="text-white/80 text-sm">{group.character.description}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(group.character.traits || []).map((trait, index) => (
                      <Badge key={index} variant="secondary" className="text-xs bg-white/10 text-white/80">
                        {trait}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => generateCharacterImage(groupIndex)}
                  disabled={generatingImages.includes(groupIndex)}
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {generatingImages.includes(groupIndex) ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      {group.character.imageUrl?.includes('dicebear.com') ? 'Generate AI Image' : 'Generate New'}
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Character's Emotions */}
            <div>
              <h4 className="text-lg font-semibold mb-4 flex items-center">
                <Heart className="w-5 h-5 mr-2 text-red-400" />
                Character Emotions ({group.emotions.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {group.emotions.map((emotion, emotionIndex) => {
                  const emotionKey = `${groupIndex}-${emotionIndex}`;
                  return (
                    <div key={emotionIndex} className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-gradient-to-r from-pink-500 to-violet-500 text-white border-0">
                            {emotion.emotion}
                          </Badge>
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <div
                                key={i}
                                className={`w-2 h-2 rounded-full mr-1 ${
                                  i < Math.round(emotion.intensity / 2) ? 'bg-yellow-400' : 'bg-gray-600'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <p className="text-white/70 text-sm mb-3">{emotion.context}</p>
                      {emotion.quote && (
                        <blockquote className="border-l-2 border-purple-400 pl-3 mb-3">
                          <p className="text-white/80 italic text-sm">"{emotion.quote}"</p>
                        </blockquote>
                      )}
                      <div className="flex gap-2">
                        <Button
                          onClick={() => playEmotionSample(emotion, emotionKey)}
                          disabled={playingEmotions[emotionKey]}
                          size="sm"
                          variant="outline"
                          className="border-white/20 text-white hover:bg-white/10 flex-1"
                        >
                          {playingEmotions[emotionKey] ? (
                            <>
                              <Volume2 className="w-3 h-3 mr-1 animate-pulse" />
                              Playing...
                            </>
                          ) : (
                            <>
                              <Play className="w-3 h-3 mr-1" />
                              Play Sample
                            </>
                          )}
                        </Button>
                        <Button
                          onMouseDown={() => handleMouseDown(emotionKey)}
                          onMouseUp={() => handleMouseUp(emotionKey)}
                          onMouseLeave={() => handleMouseUp(emotionKey)}
                          size="sm"
                          className={`flex-1 text-white border-0 ${
                            recordingEmotions[emotionKey]
                              ? 'bg-red-600 hover:bg-red-700'
                              : 'bg-green-600 hover:bg-green-700'
                          }`}
                        >
                          {recordingEmotions[emotionKey] ? (
                            <>
                              <Square className="w-3 h-3 mr-1" />
                              Recording...
                            </>
                          ) : isHolding[emotionKey] ? (
                            <>
                              <MicOff className="w-3 h-3 mr-1" />
                              Hold to Record
                            </>
                          ) : (
                            <>
                              <Mic className="w-3 h-3 mr-1" />
                              Hold to Record Voice
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Action Buttons */}
      <div className="flex justify-center pt-6">
        {/* For new stories (from upload flow) */}
        {showCreateButton && onCreateStory && (
          <Button
            onClick={() => onCreateStory(analysis, content, title)}
            disabled={isCreating}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-3 text-lg"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Creating Story...
              </>
            ) : (
              'Create Interactive Story'
            )}
          </Button>
        )}

        {/* For existing private stories */}
        {isPrivateStory && storyId && onUpdateStory && (
          <Button
            onClick={() => onUpdateStory(storyId)}
            disabled={isUpdating}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3"
          >
            {isUpdating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Story'
            )}
          </Button>
        )}
      </div>
    </div>
  );
}