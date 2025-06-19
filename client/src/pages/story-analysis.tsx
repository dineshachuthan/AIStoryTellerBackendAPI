import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Users, Heart, BookOpen, Tag, Sparkles, Upload, Loader2, Play, Volume2, Mic, MicOff, Square } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { AppTopNavigation } from "@/components/app-top-navigation";
import { StoryAnalysisOutput } from "@/components/story-analysis-output";

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

interface AnalysisData {
  analysis: StoryAnalysis;
  content: string;
  title: string;
}

export default function StoryAnalysis() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const params = useParams();
  const storyId = params.storyId;
  
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Fetch story data if storyId is provided
  const { data: storyData, isLoading: storyLoading } = useQuery({
    queryKey: ["/api/stories", storyId],
    enabled: !!storyId && !!user?.id,
  });

  useEffect(() => {
    if (storyId && storyData) {
      // Convert story data to analysis format
      const analysis: AnalysisData = {
        analysis: {
          characters: storyData.extractedCharacters || [],
          emotions: storyData.extractedEmotions || [],
          summary: storyData.summary || "",
          category: storyData.category || "General",
          themes: [],
          suggestedTags: storyData.tags || [],
          isAdultContent: storyData.isAdultContent || false
        },
        content: storyData.content,
        title: storyData.title
      };
      setAnalysisData(analysis);
    } else if (!storyId) {
      // Fall back to localStorage for upload flow
      const stored = localStorage.getItem('storyAnalysis');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setAnalysisData(parsed);
        } catch (error) {
          console.error('Failed to parse stored analysis:', error);
          setLocation('/upload-story');
        }
      } else {
        setLocation('/upload-story');
      }
    }
  }, [storyId, storyData, setLocation]);

  // Create character-emotion associations for display
  const getCharacterEmotionGroups = () => {
    return charactersWithImages.map(character => {
      const characterEmotions = emotionsWithSounds.filter(emotion => {
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
          storyContext: analysisData?.analysis.summary || analysisData?.content.substring(0, 500)
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

    try {
      setPlayingEmotions(prev => ({ ...prev, [emotionKey]: true }));
      
      // First try to play user's custom recording if it exists
      if (!user?.id) return;
      const expectedFileName = `${user.id}-${emotion.emotion}-${emotion.intensity}.wav`;
      const userRecordingUrl = `/api/emotions/user-voice-sample/${expectedFileName}`;
      
      let audioUrl = userRecordingUrl;
      let hasUserRecording = false;
      
      // Check if user recording exists
      try {
        const checkResponse = await fetch(userRecordingUrl, { method: 'HEAD' });
        hasUserRecording = checkResponse.ok;
      } catch (error) {
        hasUserRecording = false;
      }
      
      // If no user recording, use AI-generated sample
      if (!hasUserRecording) {
        audioUrl = `/api/emotions/sample?emotion=${emotion.emotion}&intensity=${emotion.intensity}`;
      }
      
      const audio = new Audio(audioUrl);
      audio.onended = () => {
        setPlayingEmotions(prev => ({ ...prev, [emotionKey]: false }));
      };
      audio.onerror = () => {
        setPlayingEmotions(prev => ({ ...prev, [emotionKey]: false }));
      };
      
      await audio.play();
    } catch (error) {
      console.error("Audio playback error:", error);
      setPlayingEmotions(prev => ({ ...prev, [emotionKey]: false }));
    }
  };

  const startHoldTimer = (emotionKey: string, emotion: EmotionWithSound) => {
    const timer = setTimeout(() => {
      startEmotionRecording(emotionKey, emotion);
    }, 200); // 200ms hold delay
    
    setHoldTimers(prev => ({ ...prev, [emotionKey]: timer }));
    setIsHolding(prev => ({ ...prev, [emotionKey]: true }));
  };

  const cancelHoldTimer = (emotionKey: string) => {
    const timer = holdTimers[emotionKey];
    if (timer) {
      clearTimeout(timer);
      setHoldTimers(prev => {
        const newTimers = { ...prev };
        delete newTimers[emotionKey];
        return newTimers;
      });
    }
    setIsHolding(prev => ({ ...prev, [emotionKey]: false }));
  };

  const startEmotionRecording = async (emotionKey: string, emotion: EmotionWithSound) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      const startTime = Date.now();

      setRecordingStartTimes(prev => ({ ...prev, [emotionKey]: startTime }));

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const recordingDuration = Date.now() - startTime;
        
        if (recordingDuration >= 500) {
          const audioBlob = new Blob(chunks, { type: 'audio/webm' });
          await saveEmotionVoiceRecording(emotionKey, emotion, audioBlob);
        } else {
          toast({
            title: "Recording Too Short",
            description: "Please hold the button for at least half a second to record.",
            variant: "destructive",
          });
        }
        
        stream.getTracks().forEach(track => track.stop());
        setEmotionRecorders(prev => {
          const newRecorders = { ...prev };
          delete newRecorders[emotionKey];
          return newRecorders;
        });
        setRecordingStartTimes(prev => {
          const newTimes = { ...prev };
          delete newTimes[emotionKey];
          return newTimes;
        });
      };

      recorder.start();
      
      setEmotionRecorders(prev => ({ ...prev, [emotionKey]: recorder }));
      setRecordingEmotions(prev => ({ ...prev, [emotionKey]: true }));

      toast({
        title: "Recording Started",
        description: `Recording voice for ${emotion.emotion} emotion. Release to stop.`,
      });

    } catch (error) {
      console.error("Failed to start recording:", error);
      toast({
        title: "Recording Failed",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopEmotionRecording = (emotionKey: string) => {
    // If we're still in holding phase, cancel the timer
    if (isHolding[emotionKey] && !recordingEmotions[emotionKey]) {
      cancelHoldTimer(emotionKey);
      return;
    }

    // If we're actually recording, stop the recording
    const recorder = emotionRecorders[emotionKey];
    const startTime = recordingStartTimes[emotionKey];
    
    if (recorder && recorder.state === 'recording') {
      if (startTime && (Date.now() - startTime) < 500) {
        setTimeout(() => {
          if (recorder.state === 'recording') {
            recorder.stop();
            setRecordingEmotions(prev => ({ ...prev, [emotionKey]: false }));
          }
        }, 500 - (Date.now() - startTime));
      } else {
        recorder.stop();
        setRecordingEmotions(prev => ({ ...prev, [emotionKey]: false }));
      }
    }
  };

  const saveEmotionVoiceRecording = async (emotionKey: string, emotion: EmotionWithSound, audioBlob: Blob) => {
    try {
      if (!user?.id) {
        throw new Error("User authentication required");
      }
      
      const formData = new FormData();
      formData.append('audio', audioBlob, `${user.id}-${emotion.emotion}-${emotion.intensity}.wav`);
      formData.append('emotion', emotion.emotion);
      formData.append('intensity', emotion.intensity.toString());
      formData.append('userId', user.id);

      await apiRequest('/api/emotions/upload-voice-sample', {
        method: 'POST',
        body: formData,
      });

      toast({
        title: "Voice Sample Saved",
        description: `Your voice recording for ${emotion.emotion} has been saved successfully.`,
      });

    } catch (error) {
      console.error("Failed to save voice recording:", error);
      toast({
        title: "Save Failed",
        description: "Could not save voice recording.",
        variant: "destructive",
      });
    }
  };

  // Auto-generate title from story content and analysis
  const generateTitleFromContent = (content: string, analysis: StoryAnalysis): string => {
    // Try to use the first character name + action/theme
    if (analysis.characters.length > 0) {
      const mainCharacter = analysis.characters.find(c => c.role === 'protagonist') || analysis.characters[0];
      const themes = analysis.themes || [];
      
      if (themes.length > 0) {
        return `${mainCharacter.name} and the ${themes[0]}`;
      }
      
      // Use character name + category
      return `The ${analysis.category} of ${mainCharacter.name}`;
    }
    
    // Fall back to first sentence or summary
    if (analysis.summary) {
      const words = analysis.summary.split(' ').slice(0, 6);
      return words.join(' ') + (words.length >= 6 ? '...' : '');
    }
    
    // Last resort: first few words of content
    const firstSentence = content.split('.')[0] || content.substring(0, 50);
    const words = firstSentence.trim().split(' ').slice(0, 5);
    return words.join(' ') + (words.length >= 5 ? '...' : '');
  };

  const createStoryFromAnalysis = async (analysisData: StoryAnalysis, content: string, title: string) => {
    if (!user?.id) {
      throw new Error("User authentication required");
    }

    try {
      const finalTitle = title.trim() || generateTitleFromContent(content, analysisData) || "Untitled Story";
      const storyData = {
        title: finalTitle,
        content: content,
        category: analysisData.category || 'General',
        summary: analysisData.summary || null,
        isAdultContent: analysisData.isAdultContent || false,
        authorId: user.id,
        uploadType: 'manual',
      };

      const story = await apiRequest('/api/stories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(storyData),
      });

      // Create characters with their images
      for (const character of charactersWithImages) {
        await apiRequest(`/api/stories/${story.id}/characters`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: character.name,
            description: character.description,
            personality: character.personality,
            role: character.role,
            appearance: character.appearance,
            traits: character.traits,
            imageUrl: character.imageUrl,
          }),
        });
      }

      // Create emotions
      for (const emotion of emotionsWithSounds) {
        await apiRequest(`/api/stories/${story.id}/emotions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            emotion: emotion.emotion,
            intensity: emotion.intensity,
            context: emotion.context,
          }),
        });
      }

      return story;

    } catch (error) {
      throw error;
    }
  };

  const handleCreateStory = async () => {
    if (!analysisData) return;

    setIsCreating(true);
    try {
      const story = await createStoryFromAnalysis(analysisData.analysis, analysisData.content, analysisData.title);
      
      localStorage.removeItem('storyAnalysis');
      
      toast({
        title: "Story Created",
        description: "Your story has been saved successfully!",
      });
      
      setLocation(`/story/${story.id}/play`);
    } catch (error) {
      console.error("Story creation failed:", error);
      toast({
        title: "Creation Failed",
        description: "Could not create story. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  if (!analysisData) {
    return <div>Loading...</div>;
  }

  const { analysis } = analysisData;
  const characterEmotionGroups = getCharacterEmotionGroups();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <AppTopNavigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Button
              onClick={() => {
                localStorage.removeItem('storyAnalysis');
                setLocation('/upload-story');
              }}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Editor
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">{analysisData.title}</h1>
              <p className="text-white/70">Character & Emotion Analysis</p>
            </div>
          </div>

          {/* Character-Emotion Groups */}
          <div className="space-y-8 mb-8">
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
                          {group.character.traits.map((trait, index) => (
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
                          <div key={emotionIndex} className="bg-white/5 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-semibold text-white capitalize">{emotion.emotion}</h5>
                              <div className="flex items-center gap-2">
                                <Badge className="bg-gradient-to-r from-yellow-500 to-red-500">
                                  {emotion.intensity}/10
                                </Badge>
                                <Button
                                  onClick={() => playEmotionSample(emotion, emotionKey)}
                                  disabled={playingEmotions[emotionKey]}
                                  size="sm"
                                  variant="ghost"
                                  className="p-1 h-8 w-8"
                                >
                                  {playingEmotions[emotionKey] ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Volume2 className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                            <p className="text-white/80 text-sm mb-2">{emotion.context}</p>
                            {emotion.quote && (
                              <blockquote className="text-white/70 text-sm italic border-l-2 border-white/30 pl-3 mb-3">
                                "{emotion.quote}"
                              </blockquote>
                            )}
                            
                            {/* Big Hold to Record Button */}
                            <Button
                              onMouseDown={(e) => {
                                e.preventDefault();
                                const isHoldingButton = isHolding[emotionKey];
                                const isRecordingButton = recordingEmotions[emotionKey];
                                const isPlayingButton = playingEmotions[emotionKey];
                                
                                if (!isHoldingButton && !isRecordingButton && !isPlayingButton) {
                                  startHoldTimer(emotionKey, emotion);
                                }
                              }}
                              onMouseUp={(e) => {
                                e.preventDefault();
                                stopEmotionRecording(emotionKey);
                              }}
                              onMouseLeave={(e) => {
                                e.preventDefault();
                                stopEmotionRecording(emotionKey);
                              }}
                              onContextMenu={(e) => e.preventDefault()}
                              onTouchStart={(e) => {
                                e.preventDefault();
                                const isHoldingButton = isHolding[emotionKey];
                                const isRecordingButton = recordingEmotions[emotionKey];
                                const isPlayingButton = playingEmotions[emotionKey];
                                
                                if (!isHoldingButton && !isRecordingButton && !isPlayingButton) {
                                  startHoldTimer(emotionKey, emotion);
                                }
                              }}
                              onTouchEnd={(e) => {
                                e.preventDefault();
                                stopEmotionRecording(emotionKey);
                              }}
                              onTouchCancel={(e) => {
                                e.preventDefault();
                                stopEmotionRecording(emotionKey);
                              }}
                              onDragStart={(e) => e.preventDefault()}
                              className={`w-full ${
                                recordingEmotions[emotionKey] 
                                  ? 'bg-red-600 hover:bg-red-700 animate-pulse shadow-lg shadow-red-500/50' 
                                  : isHolding[emotionKey]
                                  ? 'bg-orange-500 hover:bg-orange-600 animate-pulse shadow-lg shadow-orange-500/50'
                                  : 'bg-purple-600 hover:bg-purple-700'
                              } text-white font-medium py-3 select-none transition-all duration-200 cursor-pointer`}
                              disabled={playingEmotions[emotionKey]}
                              style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
                            >
                              {recordingEmotions[emotionKey] ? (
                                <>
                                  <Square className="w-5 h-5 mr-2" />
                                  Recording... (Release to Stop)
                                </>
                              ) : isHolding[emotionKey] ? (
                                <>
                                  <Mic className="w-5 h-5 mr-2 animate-bounce" />
                                  Hold for Recording...
                                </>
                              ) : (
                                <>
                                  <Mic className="w-5 h-5 mr-2" />
                                  Hold to Record Voice
                                </>
                              )}
                            </Button>
                            
                            {recordingEmotions[emotionKey] && (
                              <div className="mt-2 text-xs text-red-400 flex items-center justify-center">
                                <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></div>
                                Recording... Release button to save
                              </div>
                            )}
                            
                            {isHolding[emotionKey] && !recordingEmotions[emotionKey] && (
                              <div className="mt-2 text-xs text-orange-400 flex items-center justify-center">
                                <div className="w-2 h-2 bg-orange-500 rounded-full mr-2 animate-pulse"></div>
                                Keep holding... Recording will start in 1 second
                              </div>
                            )}
                            
                            {!recordingEmotions[emotionKey] && !isHolding[emotionKey] && (
                              <div className="mt-2 text-xs text-gray-400 text-center">
                                Hold for 1 second to start recording - will auto-play when done
                              </div>
                            )}
                            <p className="text-white/80 text-sm mb-2">{emotion.context}</p>
                            {emotion.quote && (
                              <blockquote className="text-white/70 text-sm italic border-l-2 border-white/30 pl-3">
                                "{emotion.quote}"
                              </blockquote>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Story Summary & Tags */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-white">
              <CardHeader>
                <CardTitle className="flex items-center text-xl">
                  <BookOpen className="w-5 h-5 mr-2 text-green-400" />
                  Story Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white/90 leading-relaxed">{analysis.summary}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge className="bg-purple-600">{analysis.category}</Badge>
                  {analysis.themes.map((theme, index) => (
                    <Badge key={index} variant="outline" className="border-white/30 text-white/70">
                      {theme}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-white">
              <CardHeader>
                <CardTitle className="flex items-center text-xl">
                  <Tag className="w-5 h-5 mr-2 text-yellow-400" />
                  Suggested Tags
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {analysis.suggestedTags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="bg-white/10 text-white/80">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center">
            <Button
              onClick={handleCreateStory}
              disabled={isCreating}
              className="bg-green-600 hover:bg-green-700 px-8 py-3 text-lg"
            >
              {isCreating ? (
                <>
                  <Sparkles className="w-5 h-5 mr-2 animate-spin" />
                  Creating Story...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Create Story & Start Playing
                </>
              )}
            </Button>
            <Button
              onClick={() => setLocation('/stories')}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10 px-8 py-3 text-lg"
            >
              View All Stories
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}