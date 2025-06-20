import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Mic, Play, Square, Volume2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const sampleCharacters = [
  {
    name: "Fluffy the Cat",
    description: "A graceful and mysterious feline with emerald eyes",
    traits: ["curious", "elegant", "independent"]
  },
  {
    name: "Rex the Dog",
    description: "A loyal golden retriever who loves adventures",
    traits: ["energetic", "friendly", "brave"]
  },
  {
    name: "Old Man Thompson",
    description: "A wise elderly gentleman with decades of experience",
    traits: ["wise", "patient", "thoughtful"]
  },
  {
    name: "Little Emma",
    description: "A cheerful 8-year-old girl who loves fairy tales",
    traits: ["innocent", "curious", "imaginative"]
  },
  {
    name: "King Leo the Lion",
    description: "A majestic lion ruler of the animal kingdom",
    traits: ["commanding", "powerful", "noble"]
  }
];

const emotions = [
  'joy', 'sadness', 'anger', 'fear', 'surprise', 'excitement',
  'melancholy', 'wisdom', 'curiosity', 'love', 'grief', 'hope'
];

export default function VoiceModulationTest() {
  const [isRecording, setIsRecording] = useState(false);
  const [selectedEmotion, setSelectedEmotion] = useState<string>('');
  const [selectedCharacter, setSelectedCharacter] = useState<any>(null);
  const [intensity, setIntensity] = useState([5]);
  const [testText, setTestText] = useState("Hello! This is a test of character-aware voice modulation.");
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await saveVoiceEmotion(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast({
        title: "Recording Started",
        description: `Recording your voice for ${selectedEmotion} emotion`,
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Recording Error",
        description: "Could not access microphone",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const saveVoiceEmotion = async (audioBlob: Blob) => {
    if (!selectedEmotion) {
      toast({
        title: "Error",
        description: "Please select an emotion first",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append('audio', audioBlob, `emotion-${selectedEmotion}.mp3`);
    formData.append('emotion', selectedEmotion);
    formData.append('intensity', intensity[0].toString());

    try {
      const response = await fetch('/api/user-voice-emotions', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Voice Saved",
          description: `Your ${selectedEmotion} voice has been saved to your emotion repository`,
        });
      } else {
        throw new Error('Failed to save voice emotion');
      }
    } catch (error) {
      console.error('Error saving voice emotion:', error);
      toast({
        title: "Save Error",
        description: "Failed to save voice emotion",
        variant: "destructive",
      });
    }
  };

  const generateModulatedAudio = async () => {
    if (!testText || !selectedEmotion || !selectedCharacter) {
      toast({
        title: "Missing Information",
        description: "Please select character, emotion, and enter text",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/emotions/generate-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: testText,
          emotion: selectedEmotion,
          intensity: intensity[0],
          characters: [selectedCharacter]
        }),
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Generated audio result:', result);
        setAudioUrl(result.audioUrl);
        toast({
          title: "Audio Generated",
          description: `Generated ${selectedCharacter.name}'s voice with ${selectedEmotion} emotion (${result.voice})`,
        });
      } else {
        const errorText = await response.text();
        console.error('Audio generation failed:', errorText);
        throw new Error('Failed to generate audio');
      }
    } catch (error) {
      console.error('Error generating audio:', error);
      toast({
        title: "Generation Error",
        description: "Failed to generate modulated audio",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const playAudio = async () => {
    if (audioUrl && audioRef.current) {
      try {
        audioRef.current.src = audioUrl;
        setIsPlaying(true);
        await audioRef.current.play();
        audioRef.current.onended = () => setIsPlaying(false);
        audioRef.current.onerror = () => {
          setIsPlaying(false);
          toast({
            title: "Playback Error",
            description: "Failed to play audio file",
            variant: "destructive",
          });
        };
      } catch (error) {
        setIsPlaying(false);
        console.error('Audio playback error:', error);
        toast({
          title: "Playback Error", 
          description: "Could not play audio - try again",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Character-Aware Voice Modulation Test</h1>
        <p className="text-muted-foreground">
          Test how your voice adapts to different characters and emotions
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Voice Recording Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5" />
              Record Voice Emotions
            </CardTitle>
            <CardDescription>
              Build your emotion repository by recording different emotions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="emotion-select">Select Emotion</Label>
              <Select value={selectedEmotion} onValueChange={setSelectedEmotion}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an emotion" />
                </SelectTrigger>
                <SelectContent>
                  {emotions.map((emotion) => (
                    <SelectItem key={emotion} value={emotion}>
                      {emotion.charAt(0).toUpperCase() + emotion.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Intensity: {intensity[0]}</Label>
              <Slider
                value={intensity}
                onValueChange={setIntensity}
                max={10}
                min={1}
                step={1}
                className="w-full"
              />
            </div>

            <Button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={!selectedEmotion}
              className="w-full"
              variant={isRecording ? "destructive" : "default"}
            >
              {isRecording ? (
                <>
                  <Square className="h-4 w-4 mr-2" />
                  Stop Recording
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 mr-2" />
                  Start Recording
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Character Modulation Test */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="h-5 w-5" />
              Test Character Modulation
            </CardTitle>
            <CardDescription>
              Generate audio with character-specific voice modulation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="character-select">Select Character</Label>
              <Select
                value={selectedCharacter?.name || ""}
                onValueChange={(value) => {
                  const character = sampleCharacters.find(c => c.name === value);
                  setSelectedCharacter(character || null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a character" />
                </SelectTrigger>
                <SelectContent>
                  {sampleCharacters.map((character) => (
                    <SelectItem key={character.name} value={character.name}>
                      {character.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCharacter && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm font-medium">{selectedCharacter.name}</p>
                <p className="text-xs text-muted-foreground">{selectedCharacter.description}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Traits: {selectedCharacter.traits.join(', ')}
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="test-text">Test Text</Label>
              <Textarea
                id="test-text"
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                placeholder="Enter text to generate audio..."
                className="min-h-[80px]"
              />
            </div>

            <Button
              onClick={generateModulatedAudio}
              disabled={!testText || !selectedEmotion || !selectedCharacter || isGenerating}
              className="w-full"
            >
              {isGenerating ? "Generating..." : "Generate Modulated Audio"}
            </Button>

            {audioUrl && (
              <div className="space-y-2">
                <Button
                  onClick={playAudio}
                  disabled={isPlaying}
                  variant="outline"
                  className="w-full"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {isPlaying ? "Playing..." : "Play Generated Audio"}
                </Button>
                
                {/* HTML5 Audio Player as fallback */}
                <div className="w-full">
                  <audio 
                    controls 
                    className="w-full"
                    preload="none"
                  >
                    <source src={audioUrl} type="audio/webm" />
                    <source src={audioUrl} type="audio/mpeg" />
                    Your browser does not support the audio element.
                  </audio>
                </div>
                
                <p className="text-xs text-muted-foreground">
                  Audio URL: {audioUrl}
                </p>
                <Button
                  onClick={() => window.open(audioUrl, '_blank')}
                  variant="ghost"
                  size="sm"
                  className="w-full"
                >
                  Open Audio in New Tab
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <audio ref={audioRef} style={{ display: 'none' }} />
    </div>
  );
}