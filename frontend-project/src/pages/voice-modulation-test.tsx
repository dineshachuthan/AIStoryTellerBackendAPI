import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Mic, Play, Square, Volume2 } from 'lucide-react';
import { toast, toastMessages } from '@/lib/toast-utils';

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
  const [audioLevel, setAudioLevel] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 1
        } 
      });
      
      // Check what audio formats are supported
      const options = [];
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options.push({ mimeType: 'audio/webm;codecs=opus' });
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        options.push({ mimeType: 'audio/webm' });
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options.push({ mimeType: 'audio/mp4' });
      }
      
      const mediaRecorder = new MediaRecorder(stream, options[0] || {});
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Add audio level monitoring
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const monitorLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        setAudioLevel(Math.round(average));
        if (isRecording) {
          requestAnimationFrame(monitorLevel);
        }
      };
      monitorLevel();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          console.log('Audio chunk received:', event.data.size, 'bytes');
        }
      };

      mediaRecorder.onstop = async () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        console.log('Recording finished. Blob size:', audioBlob.size, 'bytes, type:', mimeType);
        
        if (audioBlob.size > 0) {
          await saveVoiceEmotion(audioBlob);
        } else {
          toast.error("No audio data recorded. Please try again.");
        }
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(100); // Record in 100ms chunks
      setIsRecording(true);
      toast.success(`Recording your voice for ${selectedEmotion} emotion`);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error("Could not access microphone");
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
      toast.error("Please select an emotion first");
      return;
    }

    const formData = new FormData();
    formData.append('audio', audioBlob, `emotion-${selectedEmotion}.mp3`);
    formData.append('emotion', selectedEmotion);
    formData.append('intensity', intensity[0].toString());

    try {
      const { apiClient } = await import('@/lib/api-client');
      await apiClient.voice.uploadRecording(formData);
      
      toast.success(`Your ${selectedEmotion} voice has been saved to your emotion repository`);
    } catch (error) {
      console.error('Error saving voice emotion:', error);
      toast.error("Failed to save voice emotion");
    }
  };

  const generateModulatedAudio = async () => {
    if (!testText || !selectedEmotion || !selectedCharacter) {
      toast.error("Please select character, emotion, and enter text");
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
        toast.success(`Generated ${selectedCharacter.name}'s voice with ${selectedEmotion} emotion (${result.voice})`);
      } else {
        const errorText = await response.text();
        console.error('Audio generation failed:', errorText);
        throw new Error('Failed to generate audio');
      }
    } catch (error) {
      console.error('Error generating audio:', error);
      toast.error("Failed to generate modulated audio");
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
          toast.error("Failed to play audio file");
        };
      } catch (error) {
        setIsPlaying(false);
        console.error('Audio playback error:', error);
        toast.error("Could not play audio - try again");
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

            {isRecording && (
              <div className="space-y-2">
                <Label>Audio Level: {audioLevel}</Label>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-100"
                    style={{ width: `${Math.min(100, (audioLevel / 128) * 100)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {audioLevel > 10 ? "Good audio level detected" : "Speak louder - audio level too low"}
                </p>
              </div>
            )}

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
                
                {/* HTML5 Audio Player with volume control */}
                <div className="w-full space-y-2">
                  <audio 
                    controls 
                    className="w-full"
                    preload="metadata"

                    onLoadStart={() => console.log('Audio loading started')}
                    onCanPlay={() => console.log('Audio can play')}
                    onError={(e) => console.error('Audio error:', e)}
                    onVolumeChange={(e) => console.log('Volume:', (e.target as HTMLAudioElement).volume)}
                    onPlay={() => console.log('Audio started playing')}
                    onTimeUpdate={(e) => console.log('Audio time:', (e.target as HTMLAudioElement).currentTime)}
                  >
                    <source src={audioUrl} type="audio/webm" />
                    <source src={audioUrl} type="audio/mpeg" />
                    Your browser does not support the audio element.
                  </audio>
                  <div className="text-xs text-center text-muted-foreground space-y-1">
                    <p>Make sure your system volume is up and not muted</p>
                    <p>Audio will be amplified 20x during conversion for audible playback</p>
                  </div>
                </div>
                
                {/* Simple Audio Test */}
                <Button
                  onClick={() => {
                    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                    const oscillator = audioContext.createOscillator();
                    const gainNode = audioContext.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(audioContext.destination);
                    
                    oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
                    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                    
                    oscillator.start();
                    oscillator.stop(audioContext.currentTime + 0.5);
                    
                    toast.info("Playing test tone");
                  }}
                  variant="ghost"
                  size="sm"
                  className="w-full"
                >
                  Test Audio System
                </Button>
                
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