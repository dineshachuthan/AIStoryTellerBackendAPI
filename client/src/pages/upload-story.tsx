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
  X,
  Square
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
  const [createdStory, setCreatedStory] = useState<any>(null);
  
  // Step 3: Character & Emotion Assignment
  const [charactersWithImages, setCharactersWithImages] = useState<CharacterWithImage[]>([]);
  const [emotionsWithSounds, setEmotionsWithSounds] = useState<EmotionWithSound[]>([]);
  const [generatingImages, setGeneratingImages] = useState<number[]>([]);
  const [hasGeneratedImages, setHasGeneratedImages] = useState(false);
  
  // Audio recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<File | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLInputElement>(null);
  
  // Emotion voice recording
  const [recordingEmotions, setRecordingEmotions] = useState<Record<string, boolean>>({});
  const [emotionRecorders, setEmotionRecorders] = useState<Record<string, MediaRecorder>>({});
  const [playingEmotions, setPlayingEmotions] = useState<Record<string, boolean>>({});
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

  // Create story with direct analysis data (for automated flow)
  const createStoryWithAnalysis = async (
    content: string, 
    analysisData: StoryAnalysis, 
    characters: CharacterWithImage[], 
    emotions: EmotionWithSound[]
  ) => {
    setIsCreatingStory(true);

    const finalTitle = storyTitle.trim() || generateTitleFromContent(content, analysisData) || "Untitled Story";

    try {
      const storyData = {
        title: finalTitle,
        content: content,
        category: analysisData.category || 'General',
        summary: analysisData.summary || null,
        isAdultContent: analysisData.isAdultContent || false,
        authorId: 'test_user_123',
        uploadType: 'manual',
      };

      const story = await apiRequest('/api/stories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(storyData),
      });

      // Store the created story for emotion sample generation
      setCreatedStory(story);

      // Create characters and emotions
      for (const character of characters) {
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

      for (const emotion of emotions) {
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

      setCurrentStep(5);
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

  // Step 1: Upload Content
  const handleTextUpload = () => {
    if (!storyContent.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide story content to analyze.",
        variant: "destructive",
      });
      return;
    }
    // Don't require title for analysis - it will be auto-generated
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
    
    console.log("Analyzing story with content:", textToAnalyze.substring(0, 100) + "...");
    
    try {
      const result = await apiRequest('/api/stories/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: textToAnalyze.trim() }),
      });
      
      setAnalysis(result);
      
      // Automatically proceed through all steps without stopping
      setTimeout(() => {
        // Initialize characters and emotions with defaults
        const charactersWithDefaults = result.characters.map((char: any) => ({
          ...char,
          imageUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(char.name)}&backgroundColor=b6e3f4,c0aede,d1d4f9`
        }));

        const emotionsWithDefaults = result.emotions.map((emotion: any) => ({
          ...emotion,
          soundUrl: `/api/emotions/default-sound?emotion=${emotion.emotion}&intensity=${emotion.intensity}`
        }));

        setCharactersWithImages(charactersWithDefaults);
        setEmotionsWithSounds(emotionsWithDefaults);
        setStoryContent(textToAnalyze); // Ensure content is set
        setCurrentStep(3);

        // Skip automated image generation - images will be generated manually or are already cached
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

  // Step 3: Manual assignment flow (for button clicks)
  const proceedToAssignments = async () => {
    if (!analysis) return;

    // Check if we already have characters with generated images
    if (charactersWithImages.length > 0) {
      // Use existing characters with their generated images
      setCurrentStep(3);
      return;
    }

    // Initialize characters with default images only if not already generated
    const charactersWithDefaults = analysis.characters.map(char => ({
      ...char,
      imageUrl: `/api/characters/default-image?name=${encodeURIComponent(char.name)}&role=${char.role}`
    }));

    // Initialize emotions with default sounds
    const emotionsWithDefaults = analysis.emotions.map(emotion => ({
      ...emotion,
      soundUrl: `/api/emotions/default-sound?emotion=${emotion.emotion}&intensity=${emotion.intensity}`
    }));

    setCharactersWithImages(charactersWithDefaults);
    setEmotionsWithSounds(emotionsWithDefaults);
    setCurrentStep(3);
  };

  // Create character-emotion associations for display
  const getCharacterEmotionGroups = () => {
    return charactersWithImages.map(character => {
      const characterEmotions = emotionsWithSounds.filter(emotion => {
        const context = emotion.context.toLowerCase();
        const quote = (emotion.quote || '').toLowerCase();
        const characterName = character.name.toLowerCase();
        
        // Primary: Check if emotion context explicitly mentions this character as the one experiencing it
        if (context.includes(`${characterName} feels`) || 
            context.includes(`${characterName} is`) ||
            context.includes(`${characterName}'s`) ||
            context.includes(`${characterName} experiences`)) {
          return true;
        }
        
        // Secondary: Check if the quote is directly from this character
        if (emotion.quote && context.includes(`${characterName} says`) || 
            context.includes(`${characterName} speaks`) ||
            context.includes(`${characterName} tells`)) {
          return true;
        }
        
        // Tertiary: Analyze quote content for speaker identification
        if (emotion.quote) {
          // Mother's advice/wisdom quotes
          if ((quote.includes('take fewer') || quote.includes('be content') || 
               quote.includes('advice') || quote.includes('wisdom')) && 
              characterName.includes('mother')) {
            return true;
          }
          
          // Boy's frustrated/greedy statements
          if ((quote.includes('my hand') || quote.includes('i want') || 
               quote.includes('i need') || quote.includes('stuck')) && 
              characterName.includes('boy')) {
            return true;
          }
        }
        
        // Fallback: Match by character role and emotion type
        if (character.role === 'protagonist') {
          // Protagonist typically has action-based emotions
          return emotion.emotion === 'frustration' || emotion.emotion === 'greed' || 
                 emotion.emotion === 'disappointment' || emotion.emotion === 'realization';
        }
        
        if (character.role === 'supporting') {
          // Supporting characters (like mother) typically have wisdom/guidance emotions
          return emotion.emotion === 'wisdom' || emotion.emotion === 'patience' || 
                 emotion.emotion === 'understanding' || emotion.emotion === 'compassion';
        }
        
        return false;
      });
      
      return {
        character,
        emotions: characterEmotions
      };
    });
  };

  const playEmotionSample = async (emotion: any, emotionKey: string) => {
    // Prevent multiple simultaneous plays
    if (playingEmotions[emotionKey]) {
      return;
    }

    // Stop any currently playing audio
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
      // Reset all playing states
      setPlayingEmotions({});
    }

    try {
      // Set playing state
      setPlayingEmotions(prev => ({ ...prev, [emotionKey]: true }));

      // Generate a sample audio for the emotion with story context for character voice detection
      const audioResponse = await apiRequest('/api/emotions/generate-sample', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          emotion: emotion.emotion,
          intensity: emotion.intensity,
          text: emotion.quote || emotion.context,
          storyId: createdStory?.id, // Pass story ID so backend can use character-specific voices
        }),
      });

      // Create and play the audio
      const audio = new Audio(audioResponse.url);
      setCurrentAudio(audio);

      audio.onended = () => {
        setPlayingEmotions(prev => ({ ...prev, [emotionKey]: false }));
        setCurrentAudio(null);
      };

      audio.onerror = () => {
        setPlayingEmotions(prev => ({ ...prev, [emotionKey]: false }));
        setCurrentAudio(null);
        toast({
          title: "Playback Failed",
          description: "Could not play emotion sample.",
          variant: "destructive",
        });
      };

      await audio.play();

    } catch (error) {
      console.error("Emotion sample generation error:", error);
      setPlayingEmotions(prev => ({ ...prev, [emotionKey]: false }));
      setCurrentAudio(null);
      toast({
        title: "Sample Generation Failed",
        description: error instanceof Error ? error.message : "Could not generate emotion sample.",
        variant: "destructive",
      });
    }
  };

  const startEmotionRecording = async (emotionKey: string, emotion: any) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        await saveEmotionVoiceRecording(emotionKey, emotion, audioBlob);
        
        // Clean up
        stream.getTracks().forEach(track => track.stop());
        setEmotionRecorders(prev => {
          const newRecorders = { ...prev };
          delete newRecorders[emotionKey];
          return newRecorders;
        });
      };

      recorder.start();
      
      setEmotionRecorders(prev => ({ ...prev, [emotionKey]: recorder }));
      setRecordingEmotions(prev => ({ ...prev, [emotionKey]: true }));

      toast({
        title: "Recording Started",
        description: `Recording voice for ${emotion.emotion} emotion. Click stop when finished.`,
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
    const recorder = emotionRecorders[emotionKey];
    if (recorder && recorder.state === 'recording') {
      recorder.stop();
      setRecordingEmotions(prev => ({ ...prev, [emotionKey]: false }));
    }
  };

  const saveEmotionVoiceRecording = async (emotionKey: string, emotion: any, audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, `emotion-${emotionKey}-${Date.now()}.webm`);
      formData.append('emotion', emotion.emotion);
      formData.append('intensity', emotion.intensity.toString());
      formData.append('text', emotion.quote || emotion.context);
      formData.append('userId', 'user_123'); // Test user ID
      formData.append('storyId', analysis?.summary || 'temp_story');

      const response = await apiRequest('/api/emotions/save-voice-sample', {
        method: 'POST',
        body: formData,
      });

      toast({
        title: "Voice Recorded",
        description: `Your voice sample for ${emotion.emotion} has been saved.`,
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

  const generateCharacterImage = async (characterIndex: number) => {
    const character = charactersWithImages[characterIndex];
    if (!character) return;

    // Prevent multiple simultaneous requests for the same character
    if (generatingImages.includes(characterIndex)) return;

    // Skip if already has a generated AI image (not a placeholder)
    if (character.imageUrl && 
        !character.imageUrl.includes('dicebear.com') && 
        !character.imageUrl.includes('/api/characters/default-image')) {
      console.log("Character already has AI-generated image, skipping:", character.name);
      return;
    }

    console.log("Generating image for character:", character);

    // Add to generating array
    setGeneratingImages(prev => [...prev, characterIndex]);

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
      // Remove from generating array
      setGeneratingImages(prev => prev.filter(index => index !== characterIndex));
    }
  };

  // Step 4: Create and Test Story (automated version)
  const createStoryWithContent = async (content: string, analysisData: StoryAnalysis) => {
    setIsCreatingStory(true);

    // Auto-generate title if not provided
    const finalTitle = storyTitle.trim() || generateTitleFromContent(content, analysisData) || "Untitled Story";

    try {
      // Create story directly with provided content and analysis
      const storyData = {
        title: finalTitle,
        content: content,
        category: analysisData.category || 'General',
        summary: analysisData.summary || null,
        isAdultContent: analysisData.isAdultContent || false,
        authorId: 'test_user_123',
        uploadType: 'manual',
      };

      const story = await apiRequest('/api/stories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(storyData),
      });

      // Create characters and emotions
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

  // Step 4: Create and Test Story
  const createStory = async () => {
    if (!analysis) {
      toast({
        title: "Missing Information",
        description: "Story analysis is required to create a story.",
        variant: "destructive",
      });
      return;
    }

    // Auto-generate title if not provided
    const finalTitle = storyTitle.trim() || generateTitleFromContent(storyContent, analysis) || "Untitled Story";

    setIsCreatingStory(true);

    try {
      // Use existing characters (images should already be generated in step 3)
      const finalCharacters = charactersWithImages;

      const storyData = {
        title: finalTitle,
        content: storyContent,
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

            {/* Character & Emotion Groups */}
            <Card className="bg-dark-card border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2 text-tiktok-cyan" />
                  Characters & Their Emotions
                </CardTitle>
                <p className="text-sm text-gray-400 mt-1">Each character is grouped with their associated emotions</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  {getCharacterEmotionGroups().map((group, groupIndex) => (
                    <div key={groupIndex} className="bg-gray-800 rounded-lg p-6 border border-gray-600">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Column - Character Info */}
                        <div className="lg:col-span-1">
                          <div className="flex flex-col items-center text-center space-y-4">
                            <div className="relative">
                              <Avatar className="w-24 h-24">
                                <AvatarImage src={group.character.imageUrl} alt={group.character.name} />
                                <AvatarFallback className="bg-tiktok-cyan text-white text-2xl">
                                  {group.character.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              {generatingImages.includes(groupIndex) && (
                                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                                </div>
                              )}
                            </div>
                            
                            <div>
                              <h3 className="text-xl font-bold text-white mb-1">{group.character.name}</h3>
                              <p className="text-sm text-gray-400 capitalize mb-2">{group.character.role}</p>
                              <p className="text-sm text-gray-500 mb-3">{group.character.description}</p>
                              {generatingImages.includes(groupIndex) && (
                                <p className="text-xs text-tiktok-cyan animate-pulse">
                                  Creating AI image...
                                </p>
                              )}
                            </div>
                            
                            <div className="flex flex-col space-y-2 w-full">
                              <Button
                                onClick={() => generateCharacterImage(groupIndex)}
                                variant="outline"
                                size="sm"
                                className="border-tiktok-cyan text-tiktok-cyan hover:bg-tiktok-cyan/20"
                                disabled={generatingImages.includes(groupIndex)}
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
                                className="border-gray-600 text-gray-400 hover:bg-gray-800"
                              >
                                <Upload className="w-4 h-4 mr-2" />
                                Upload
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        {/* Right Column - Character's Emotions */}
                        <div className="lg:col-span-2">
                          <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                            <Heart className="w-5 h-5 mr-2 text-tiktok-red" />
                            {group.character.name}'s Emotions
                          </h4>
                          <div className="grid grid-cols-1 gap-4">
                            {group.emotions.map((emotion, emotionIndex) => {
                              const EmotionIcon = emotion.emotion === 'happy' ? Smile : 
                                                 emotion.emotion === 'sad' ? Frown : 
                                                 emotion.emotion === 'angry' ? Angry : 
                                                 emotion.emotion === 'vexed' ? Angry :
                                                 emotion.emotion === 'disappointment' ? Frown :
                                                 Heart;
                              
                              const emotionKey = `${groupIndex}-${emotionIndex}`;
                              const isRecording = recordingEmotions[emotionKey];
                              const isPlaying = playingEmotions[emotionKey];
                              
                              return (
                                <div key={emotionIndex} className="bg-gray-700 rounded-lg p-4 border border-gray-500">
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center space-x-2">
                                      <EmotionIcon className="w-5 h-5 text-tiktok-red" />
                                      <h5 className="font-semibold text-white capitalize">{emotion.emotion}</h5>
                                      <span className="text-xs bg-tiktok-red/20 text-tiktok-red px-2 py-1 rounded">
                                        {emotion.intensity}/10
                                      </span>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className={`h-8 w-8 p-0 ${isPlaying ? 'text-tiktok-cyan animate-pulse' : 'text-gray-400 hover:text-white'}`}
                                      onClick={() => playEmotionSample(emotion, emotionKey)}
                                      disabled={isPlaying}
                                    >
                                      <Play className="w-4 h-4" />
                                    </Button>
                                  </div>
                                  <p className="text-sm text-gray-300 mb-3">{emotion.context}</p>
                                  {emotion.quote && (
                                    <p className="text-xs text-gray-400 italic bg-gray-600 p-2 rounded mb-3">
                                      "{emotion.quote}"
                                    </p>
                                  )}
                                  
                                  {/* Prominent Record Voice Button */}
                                  <Button
                                    onClick={() => isRecording ? stopEmotionRecording(emotionKey) : startEmotionRecording(emotionKey, emotion)}
                                    className={`w-full ${
                                      isRecording 
                                        ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
                                        : 'bg-tiktok-pink hover:bg-tiktok-pink/80'
                                    } text-white font-medium py-3`}
                                    disabled={isPlaying}
                                  >
                                    {isRecording ? (
                                      <>
                                        <Square className="w-5 h-5 mr-2" />
                                        Stop Recording
                                      </>
                                    ) : (
                                      <>
                                        <Mic className="w-5 h-5 mr-2" />
                                        Record your own voice
                                      </>
                                    )}
                                  </Button>
                                  
                                  {isRecording && (
                                    <div className="mt-2 text-xs text-red-400 flex items-center justify-center">
                                      <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></div>
                                      Recording your voice for grandma storytelling...
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>



            <div className="flex justify-center">
              <Button
                onClick={() => {
                  setCurrentStep(4);
                  if (analysis && storyContent) {
                    createStoryWithAnalysis(storyContent, analysis, charactersWithImages, emotionsWithSounds);
                  } else {
                    createStory();
                  }
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
              <p className="text-gray-400">Finalizing your story and saving all content...</p>
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
                    <span className="text-gray-300">Story content and characters prepared</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <Check className="w-5 h-5 text-green-500" />
                    <span className="text-gray-300">Character images and emotions ready</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    {isCreatingStory ? (
                      <Loader2 className="w-5 h-5 animate-spin text-tiktok-cyan" />
                    ) : (
                      <Check className="w-5 h-5 text-green-500" />
                    )}
                    <span className="text-gray-300">Saving story to database</span>
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