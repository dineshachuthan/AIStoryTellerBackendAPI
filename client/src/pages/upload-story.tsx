import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  ArrowLeft, 
  Upload, 
  Mic, 
  MicOff,
  Type, 
  FileText, 
  Eye, 
  Edit3, 
  Play, 
  Users, 
  Heart, 
  Smile, 
  Frown, 
  Angry, 
  Sparkles,
  Volume2,
  Loader2,
  Check,
  X
} from "lucide-react";

interface StoryAnalysis {
  characters: Array<{
    name: string;
    description: string;
    personality: string;
    role: string;
    appearance?: string;
    traits: string[];
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
}

interface EmotionWithSound {
  emotion: string;
  intensity: number;
  context: string;
  quote?: string;
  soundUrl?: string;
}

export default function UploadStory() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  const [storyContent, setStoryContent] = useState("");
  const [storyTitle, setStoryTitle] = useState("");
  const [uploadType, setUploadType] = useState<'text' | 'voice' | 'file'>('text');
  
  // Step 2: AI Analysis
  const [analysis, setAnalysis] = useState<StoryAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCreatingStory, setIsCreatingStory] = useState(false);
  
  // Step 3: Character & Emotion Assignment
  const [charactersWithImages, setCharactersWithImages] = useState<CharacterWithImage[]>([]);
  const [emotionsWithSounds, setEmotionsWithSounds] = useState<EmotionWithSound[]>([]);
  const [generatingImages, setGeneratingImages] = useState<Set<number>>(new Set());
  
  // Audio recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<File | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLInputElement>(null);

  // Step 1: Upload Content
  const handleTextUpload = () => {
    if (!storyContent.trim() || !storyTitle.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both a title and story content.",
        variant: "destructive",
      });
      return;
    }
    analyzeStory();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        const file = new File([blob], 'story.wav', { type: 'audio/wav' });
        setRecordedAudio(file);
        setIsRecording(false);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      toast({
        title: "Recording Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleVoiceUpload = async () => {
    if (!recordedAudio || !storyTitle.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide a title and record your story.",
        variant: "destructive",
      });
      return;
    }

    // Convert audio to text using transcription
    const formData = new FormData();
    formData.append('audio', recordedAudio);
    
    try {
      setIsAnalyzing(true);
      const transcription = await apiRequest('/api/transcribe', {
        method: 'POST',
        body: formData,
      });
      setStoryContent(transcription.text);
      analyzeStory(transcription.text);
    } catch (error) {
      toast({
        title: "Transcription Failed",
        description: "Could not convert voice to text. Please try again.",
        variant: "destructive",
      });
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setStoryContent(content);
      if (storyTitle.trim()) {
        analyzeStory(content);
      }
    };
    reader.readAsText(file);
  };

  // Step 2: AI Analysis
  const analyzeStory = async (content?: string) => {
    const textToAnalyze = content || storyContent;
    setIsAnalyzing(true);
    
    console.log("Analyzing story with content:", textToAnalyze);
    
    if (!textToAnalyze || !textToAnalyze.trim()) {
      toast({
        title: "No Content",
        description: "Please provide story content to analyze.",
        variant: "destructive",
      });
      setIsAnalyzing(false);
      return;
    }
    
    try {
      const result = await apiRequest('/api/stories/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: textToAnalyze.trim() }),
      });
      
      setAnalysis(result);
      setCurrentStep(2);
      
      // Automatically proceed to assignments and story creation
      setTimeout(() => {
        proceedToAssignments(result);
      }, 1000);
    } catch (error) {
      console.error("Analysis error:", error);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Could not analyze story. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Step 3: Assign Images and Sounds
  const proceedToAssignments = async (analysisData?: StoryAnalysis) => {
    const currentAnalysis = analysisData || analysis;
    if (!currentAnalysis) return;

    // Initialize characters with default images
    const charactersWithDefaults = currentAnalysis.characters.map(char => ({
      ...char,
      imageUrl: `/api/characters/default-image?name=${encodeURIComponent(char.name)}&role=${char.role}`
    }));

    // Initialize emotions with default sounds
    const emotionsWithDefaults = currentAnalysis.emotions.map(emotion => ({
      ...emotion,
      soundUrl: `/api/emotions/default-sound?emotion=${emotion.emotion}&intensity=${emotion.intensity}`
    }));

    setCharactersWithImages(charactersWithDefaults);
    setEmotionsWithSounds(emotionsWithDefaults);
    setCurrentStep(3);

    // Automatically proceed to story creation when called from analysis
    if (analysisData) {
      setTimeout(() => {
        createStoryAutomatically(currentAnalysis, charactersWithDefaults, emotionsWithDefaults);
      }, 1000);
    }
  };

  // Wrapper for manual button clicks
  const handleProceedToAssignments = () => {
    proceedToAssignments();
  };

  // Automated story creation function
  const createStoryAutomatically = async (
    currentAnalysis: StoryAnalysis, 
    charactersWithDefaults: CharacterWithImage[], 
    emotionsWithDefaults: EmotionWithSound[]
  ) => {
    setCurrentStep(4);
    setTimeout(() => {
      createStory();
    }, 1000);
  };

  const generateCharacterImage = async (characterIndex: number) => {
    const character = charactersWithImages[characterIndex];
    if (!character) return;

    // Prevent multiple simultaneous requests for the same character
    if (generatingImages.has(characterIndex)) return;

    console.log("Generating image for character:", character);

    // Add to generating set
    setGeneratingImages(prev => new Set(prev).add(characterIndex));

    try {
      const imageUrl = await apiRequest('/api/characters/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          character,
          storyContext: analysis?.summary || storyContent.substring(0, 500)
        }),
      });

      const updatedCharacters = [...charactersWithImages];
      updatedCharacters[characterIndex] = { ...character, imageUrl: imageUrl.url };
      setCharactersWithImages(updatedCharacters);
    } catch (error) {
      console.error("Image generation error:", error);
      toast({
        title: "Image Generation Failed",
        description: error instanceof Error ? error.message : "Could not generate character image.",
        variant: "destructive",
      });
    } finally {
      // Remove from generating set
      setGeneratingImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(characterIndex);
        return newSet;
      });
    }
  };

  // Step 4: Create and Test Story
  const createStory = async () => {
    if (!analysis || !storyTitle || !storyContent) {
      toast({
        title: "Missing Information",
        description: "Please ensure you have entered a title and content for your story.",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingStory(true);

    try {
      // Generate AI images for all characters before creating the story
      const charactersWithAIImages = [...charactersWithImages];
      
      // Generate images for all characters in parallel
      const imagePromises = charactersWithAIImages.map(async (character, index) => {
        if (character.imageUrl?.includes('dicebear.com')) {
          // Only generate AI image if it's still using default avatar
          try {
            const imageResponse = await apiRequest('/api/characters/generate-image', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ 
                character,
                storyContext: analysis.summary || storyContent.substring(0, 500)
              }),
            });
            return { ...character, imageUrl: imageResponse.url };
          } catch (error) {
            console.error(`Failed to generate image for ${character.name}:`, error);
            return character; // Keep default image on error
          }
        }
        return character;
      });

      // Wait for all images to be generated
      const finalCharacters = await Promise.all(imagePromises);

      const storyData = {
        title: storyTitle || 'Untitled Story',
        content: storyContent || 'No content provided',
        category: analysis.category || 'General',
        summary: analysis.summary || null,
        isAdultContent: analysis.isAdultContent || false,
        authorId: 'test_user_123', // TODO: Replace with actual user ID from authentication
        uploadType: 'manual',
      };



      const story = await apiRequest('/api/stories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(storyData),
      });

      // Create characters with AI-generated images
      for (const character of finalCharacters) {
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
            quote: emotion.quote,
            soundUrl: emotion.soundUrl,
          }),
        });
      }

      toast({
        title: "Story Created!",
        description: "Your story has been created successfully with AI-generated character images.",
      });

      // Move to completion step
      setCurrentStep(5);

      // Auto-navigate after showing success
      setTimeout(() => {
        setLocation(`/story/${story.id}/play`);
      }, 3000);
    } catch (error) {
      console.error("Story creation error:", error);
      toast({
        title: "Creation Failed",
        description: error instanceof Error ? error.message : "Could not create story. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingStory(false);
    }
  };

  const testStoryPlayback = () => {
    // This would generate a preview of the narration
    toast({
      title: "Preview Generated",
      description: "Story preview with character voices and emotions is ready!",
    });
  };

  return (
    <div className="min-h-screen bg-dark-bg text-white">
      {/* Header */}
      <div className="border-b border-gray-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/")}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-xl font-bold">Create Story</h1>
          </div>
          <div className="flex items-center space-x-2">
            <div className="text-sm text-gray-400">
              Step {currentStep} of 4
            </div>
            <Progress value={(currentStep / 4) * 100} className="w-24" />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        {/* Step 1: Upload Content */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Upload Your Story</h2>
              <p className="text-gray-400">Choose how you'd like to share your story</p>
            </div>

            {/* Upload Type Selection */}
            <div className="grid grid-cols-3 gap-4">
              <Card 
                className={`cursor-pointer transition-all ${uploadType === 'text' ? 'ring-2 ring-tiktok-cyan bg-tiktok-cyan/10' : 'bg-dark-card border-gray-700 hover:bg-gray-800'}`}
                onClick={() => setUploadType('text')}
              >
                <CardContent className="p-6 text-center">
                  <Type className="w-8 h-8 mx-auto mb-3 text-tiktok-cyan" />
                  <h3 className="font-semibold mb-2">Type Story</h3>
                  <p className="text-sm text-gray-400">Write your story manually</p>
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer transition-all ${uploadType === 'voice' ? 'ring-2 ring-tiktok-red bg-tiktok-red/10' : 'bg-dark-card border-gray-700 hover:bg-gray-800'}`}
                onClick={() => setUploadType('voice')}
              >
                <CardContent className="p-6 text-center">
                  <Mic className="w-8 h-8 mx-auto mb-3 text-tiktok-red" />
                  <h3 className="font-semibold mb-2">Record Story</h3>
                  <p className="text-sm text-gray-400">Tell your story aloud</p>
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer transition-all ${uploadType === 'file' ? 'ring-2 ring-tiktok-pink bg-tiktok-pink/10' : 'bg-dark-card border-gray-700 hover:bg-gray-800'}`}
                onClick={() => setUploadType('file')}
              >
                <CardContent className="p-6 text-center">
                  <FileText className="w-8 h-8 mx-auto mb-3 text-tiktok-pink" />
                  <h3 className="font-semibold mb-2">Upload File</h3>
                  <p className="text-sm text-gray-400">Import from text file</p>
                </CardContent>
              </Card>
            </div>

            {/* Story Title */}
            <div>
              <label className="block text-sm font-medium mb-2">Story Title</label>
              <Input
                value={storyTitle}
                onChange={(e) => setStoryTitle(e.target.value)}
                placeholder="Enter your story title..."
                className="bg-dark-card border-gray-700 text-white"
              />
            </div>

            {/* Content Input Based on Type */}
            {uploadType === 'text' && (
              <div>
                <label className="block text-sm font-medium mb-2">Story Content</label>
                <Textarea
                  value={storyContent}
                  onChange={(e) => setStoryContent(e.target.value)}
                  placeholder="Write your story here..."
                  className="bg-dark-card border-gray-700 text-white min-h-48"
                />
                <Button
                  onClick={handleTextUpload}
                  disabled={isAnalyzing}
                  className="mt-4 bg-tiktok-cyan hover:bg-tiktok-cyan/80"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 mr-2" />
                      Analyze Story
                    </>
                  )}
                </Button>
              </div>
            )}

            {uploadType === 'voice' && (
              <div className="text-center">
                <div className="bg-dark-card border border-gray-700 rounded-lg p-8">
                  {!isRecording && !recordedAudio && (
                    <div>
                      <Mic className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-400 mb-4">Ready to record your story</p>
                      <Button
                        onClick={startRecording}
                        className="bg-tiktok-red hover:bg-tiktok-red/80"
                      >
                        <Mic className="w-4 h-4 mr-2" />
                        Start Recording
                      </Button>
                    </div>
                  )}

                  {isRecording && (
                    <div>
                      <div className="w-16 h-16 mx-auto mb-4 bg-tiktok-red rounded-full flex items-center justify-center animate-pulse">
                        <Mic className="w-8 h-8 text-white" />
                      </div>
                      <p className="text-tiktok-red mb-4">Recording your story...</p>
                      <Button
                        onClick={stopRecording}
                        variant="outline"
                        className="border-tiktok-red text-tiktok-red hover:bg-tiktok-red/20"
                      >
                        <MicOff className="w-4 h-4 mr-2" />
                        Stop Recording
                      </Button>
                    </div>
                  )}

                  {recordedAudio && !isRecording && (
                    <div>
                      <div className="w-16 h-16 mx-auto mb-4 bg-green-500 rounded-full flex items-center justify-center">
                        <Check className="w-8 h-8 text-white" />
                      </div>
                      <p className="text-green-400 mb-4">Recording complete!</p>
                      <div className="flex justify-center space-x-4">
                        <Button
                          onClick={() => setRecordedAudio(null)}
                          variant="outline"
                          className="border-gray-600 text-gray-400 hover:bg-gray-800"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Re-record
                        </Button>
                        <Button
                          onClick={handleVoiceUpload}
                          disabled={isAnalyzing}
                          className="bg-tiktok-cyan hover:bg-tiktok-cyan/80"
                        >
                          {isAnalyzing ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <Eye className="w-4 h-4 mr-2" />
                              Analyze Story
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {uploadType === 'file' && (
              <div>
                <label className="block text-sm font-medium mb-2">Upload Text File</label>
                <input
                  ref={audioRef}
                  type="file"
                  accept=".txt,.md"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div
                  onClick={() => audioRef.current?.click()}
                  className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-tiktok-pink transition-colors"
                >
                  <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-400 mb-2">Click to upload a text file</p>
                  <p className="text-sm text-gray-500">Supports .txt and .md files</p>
                </div>
                {storyContent && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-400 mb-2">File loaded: {storyContent.length} characters</p>
                    <Button
                      onClick={handleTextUpload}
                      disabled={isAnalyzing}
                      className="bg-tiktok-cyan hover:bg-tiktok-cyan/80"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4 mr-2" />
                          Analyze Story
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 2: AI Analysis Preview */}
        {currentStep === 2 && analysis && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Story Analysis</h2>
              <p className="text-gray-400">Review and modify the AI-identified elements</p>
            </div>

            {/* Category */}
            <Card className="bg-dark-card border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Sparkles className="w-5 h-5 mr-2 text-tiktok-pink" />
                  Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4">
                  <Badge variant="secondary" className="bg-tiktok-pink/20 text-tiktok-pink text-lg px-4 py-2">
                    {analysis.category}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-gray-600 text-gray-400 hover:bg-gray-800"
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-gray-400">Summary:</p>
                  <p className="text-gray-200 mt-1">{analysis.summary}</p>
                </div>
              </CardContent>
            </Card>

            {/* Characters */}
            <Card className="bg-dark-card border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2 text-tiktok-cyan" />
                  Characters ({analysis.characters.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analysis.characters.map((character, index) => (
                    <div key={index} className="bg-gray-800 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-white">{character.name}</h4>
                          <Badge variant="outline" className="text-xs mt-1">
                            {character.role}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-400 hover:text-white"
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-gray-300 mb-2">{character.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {character.traits.map((trait, traitIndex) => (
                          <Badge key={traitIndex} variant="secondary" className="text-xs">
                            {trait}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Emotions */}
            <Card className="bg-dark-card border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Heart className="w-5 h-5 mr-2 text-tiktok-red" />
                  Emotions ({analysis.emotions.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analysis.emotions.map((emotion, index) => {
                    const EmotionIcon = emotion.emotion === 'happy' ? Smile : 
                                       emotion.emotion === 'sad' ? Frown : 
                                       emotion.emotion === 'angry' ? Angry : Heart;
                    
                    return (
                      <div key={index} className="bg-gray-800 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <EmotionIcon className="w-5 h-5 text-tiktok-red" />
                            <div>
                              <h4 className="font-semibold text-white capitalize">{emotion.emotion}</h4>
                              <div className="flex items-center space-x-2 mt-1">
                                <Progress value={emotion.intensity * 10} className="w-16 h-2" />
                                <span className="text-xs text-gray-400">{emotion.intensity}/10</span>
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-400 hover:text-white"
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>
                        </div>
                        <p className="text-sm text-gray-300 mb-2">{emotion.context}</p>
                        {emotion.quote && (
                          <p className="text-xs text-gray-400 italic">"{emotion.quote}"</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-center">
              <Button
                onClick={proceedToAssignments}
                className="bg-tiktok-cyan hover:bg-tiktok-cyan/80 px-8"
              >
                Proceed to Assignments
                <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Character Images & Emotion Sounds */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Character & Emotion Setup</h2>
              <p className="text-gray-400">Assign images and sounds to bring your story to life</p>
            </div>

            {/* Character Images */}
            <Card className="bg-dark-card border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2 text-tiktok-cyan" />
                  Character Images
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {charactersWithImages.map((character, index) => (
                    <div key={index} className="bg-gray-800 rounded-lg p-4">
                      <div className="flex items-center space-x-4 mb-4">
                        <div className="relative">
                          <Avatar className="w-16 h-16">
                            <AvatarImage src={character.imageUrl} alt={character.name} />
                            <AvatarFallback className="bg-tiktok-cyan text-white text-lg">
                              {character.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          {generatingImages.has(index) && (
                            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                              <Loader2 className="w-6 h-6 text-white animate-spin" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-white">{character.name}</h4>
                          <p className="text-sm text-gray-400">{character.role}</p>
                          <p className="text-xs text-gray-500 mt-1">{character.description}</p>
                          {generatingImages.has(index) && (
                            <p className="text-xs text-tiktok-cyan mt-1 animate-pulse">
                              Creating AI image...
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => generateCharacterImage(index)}
                          variant="outline"
                          size="sm"
                          className="border-tiktok-cyan text-tiktok-cyan hover:bg-tiktok-cyan/20"
                          disabled={generatingImages.has(index)}
                        >
                          {generatingImages.has(index) ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 mr-2" />
                              Generate New
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-gray-600 text-gray-400 hover:bg-gray-800"
                          disabled={generatingImages.has(index)}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Upload
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Emotion Sounds */}
            <Card className="bg-dark-card border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Volume2 className="w-5 h-5 mr-2 text-tiktok-red" />
                  Emotion Sounds
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {emotionsWithSounds.map((emotion, index) => {
                    const EmotionIcon = emotion.emotion === 'happy' ? Smile : 
                                       emotion.emotion === 'sad' ? Frown : 
                                       emotion.emotion === 'angry' ? Angry : Heart;
                    
                    return (
                      <div key={index} className="bg-gray-800 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <EmotionIcon className="w-6 h-6 text-tiktok-red" />
                            <div>
                              <h4 className="font-semibold text-white capitalize">{emotion.emotion}</h4>
                              <Progress value={emotion.intensity * 10} className="w-20 h-2 mt-1" />
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-400 hover:text-white"
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                        </div>
                        <p className="text-sm text-gray-300 mb-3">{emotion.context}</p>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-tiktok-red text-tiktok-red hover:bg-tiktok-red/20"
                          >
                            <Volume2 className="w-4 h-4 mr-2" />
                            Default
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-gray-600 text-gray-400 hover:bg-gray-800"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Custom
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-center">
              <Button
                onClick={() => {
                  setCurrentStep(4);
                  createStory();
                }}
                className="bg-tiktok-pink hover:bg-tiktok-pink/80 px-8"
              >
                Create Story
                <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Creating Story */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Creating Your Story</h2>
              <p className="text-gray-400">Generating AI character images and setting up your story...</p>
            </div>

            <Card className="bg-dark-card border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center justify-center">
                  <Loader2 className="w-6 h-6 mr-3 animate-spin text-tiktok-cyan" />
                  Processing Story
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-center space-x-2">
                    <Check className="w-5 h-5 text-green-500" />
                    <span className="text-gray-300">Story analyzed and characters extracted</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    {isCreatingStory ? (
                      <Loader2 className="w-5 h-5 animate-spin text-tiktok-cyan" />
                    ) : (
                      <Check className="w-5 h-5 text-green-500" />
                    )}
                    <span className="text-gray-300">Generating AI character images</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    {isCreatingStory ? (
                      <Loader2 className="w-5 h-5 animate-spin text-tiktok-cyan" />
                    ) : (
                      <Check className="w-5 h-5 text-green-500" />
                    )}
                    <span className="text-gray-300">Creating story database entries</span>
                  </div>
                </div>
                <Progress value={isCreatingStory ? 50 : 100} className="w-full max-w-md mx-auto" />
                <p className="text-sm text-gray-500">This may take a few moments...</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 5: Story Complete */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2 text-green-400">Story Created Successfully!</h2>
              <p className="text-gray-400">Your story has been created with AI-generated character images</p>
            </div>

            <Card className="bg-dark-card border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center justify-center text-green-400">
                  <Check className="w-6 h-6 mr-3" />
                  Ready to Experience
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-center space-x-2">
                    <Check className="w-5 h-5 text-green-500" />
                    <span className="text-gray-300">Characters created with AI images</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <Check className="w-5 h-5 text-green-500" />
                    <span className="text-gray-300">Emotions and themes mapped</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <Check className="w-5 h-5 text-green-500" />
                    <span className="text-gray-300">Story ready for playback</span>
                  </div>
                </div>
                <div className="pt-4">
                  <p className="text-sm text-gray-400 mb-4">Redirecting to story player in a few seconds...</p>
                  <div className="flex justify-center">
                    <Button 
                      onClick={() => setLocation('/')}
                      variant="outline"
                      className="border-gray-600 text-gray-400 hover:bg-gray-800"
                    >
                      Return to Home
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Legacy Step 4: Test Story Playback (hidden) */}
        {false && currentStep === 99 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Test Your Story</h2>
              <p className="text-gray-400">Preview how your story will sound with character voices and emotions</p>
            </div>

            <Card className="bg-dark-card border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Play className="w-5 h-5 mr-2 text-tiktok-green" />
                  Story Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center py-12">
                <div className="mb-6">
                  <h3 className="text-xl font-semibold mb-2">{storyTitle}</h3>
                  <Badge variant="secondary" className="bg-tiktok-pink/20 text-tiktok-pink">
                    {analysis?.category}
                  </Badge>
                </div>

                <div className="flex justify-center space-x-4 mb-8">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-tiktok-cyan/20 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Users className="w-6 h-6 text-tiktok-cyan" />
                    </div>
                    <p className="text-sm text-gray-400">{charactersWithImages.length} Characters</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-tiktok-red/20 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Heart className="w-6 h-6 text-tiktok-red" />
                    </div>
                    <p className="text-sm text-gray-400">{emotionsWithSounds.length} Emotions</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-tiktok-green/20 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Volume2 className="w-6 h-6 text-tiktok-green" />
                    </div>
                    <p className="text-sm text-gray-400">Voice Ready</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <Button
                    onClick={testStoryPlayback}
                    className="bg-tiktok-green hover:bg-tiktok-green/80 px-8"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Test Playback
                  </Button>
                  
                  <div className="flex justify-center space-x-4">
                    <Button
                      onClick={() => setCurrentStep(3)}
                      variant="outline"
                      className="border-gray-600 text-gray-400 hover:bg-gray-800"
                    >
                      Back to Edit
                    </Button>
                    <Button
                      onClick={createStory}
                      className="bg-tiktok-red hover:bg-tiktok-red/80 px-8"
                    >
                      Create & Share Story
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}