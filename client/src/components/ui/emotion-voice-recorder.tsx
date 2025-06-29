import React, { useState, useEffect } from 'react';
import { PressHoldRecorder } from './press-hold-recorder';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { Play, Pause, Save, Trash2, Volume2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export interface EmotionVoiceRecording {
  id?: number;
  emotion: string;
  intensity: number;
  audioUrl?: string;
  audioBlob?: Blob;
  createdAt?: Date;
  isNew?: boolean;
}

interface EmotionVoiceRecorderProps {
  emotion: string;
  intensity?: number;
  onSave?: (recording: EmotionVoiceRecording) => void;
  onDelete?: (recordingId: number) => void;
  existingRecording?: EmotionVoiceRecording;
  className?: string;
}

export function EmotionVoiceRecorder({
  emotion,
  intensity = 5,
  onSave,
  onDelete,
  existingRecording,
  className = ""
}: EmotionVoiceRecorderProps) {
  const [recording, setRecording] = useState<EmotionVoiceRecording | null>(existingRecording || null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      if (audio) {
        audio.pause();
        audio.src = '';
      }
    };
  }, [audio]);

  const handleRecordingComplete = (audioBlob: Blob, audioUrl: string) => {
    const newRecording: EmotionVoiceRecording = {
      emotion,
      intensity,
      audioBlob,
      audioUrl,
      isNew: true
    };
    setRecording(newRecording);
    
    toast({
      title: "Recording Complete",
      description: `${emotion} voice sample recorded successfully. Click Save to store it.`
    });
  };

  const handlePlayback = async () => {
    if (!recording) return;

    if (isPlaying && audio) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    try {
      let audioUrl = recording.audioUrl;
      
      // If it's a new recording with blob, use the blob URL
      if (recording.isNew && recording.audioBlob) {
        audioUrl = URL.createObjectURL(recording.audioBlob);
      } else if (recording.id) {
        // Fetch the audio URL for saved recordings
        const response = await apiRequest(`/api/user/voice-emotions/${recording.id}/audio`);
        audioUrl = response.audioUrl;
      }

      if (!audioUrl) {
        toast({
          title: "Playback Error",
          description: "Audio not available for playback",
          variant: "destructive"
        });
        return;
      }

      const newAudio = new Audio(audioUrl);
      
      newAudio.onloadeddata = () => {
        newAudio.play();
        setIsPlaying(true);
        setAudio(newAudio);
      };

      newAudio.onended = () => {
        setIsPlaying(false);
        setAudio(null);
      };

      newAudio.onerror = () => {
        setIsPlaying(false);
        setAudio(null);
        toast({
          title: "Playback Error",
          description: "Failed to play audio",
          variant: "destructive"
        });
      };

    } catch (error) {
      console.error('Playback error:', error);
      toast({
        title: "Playback Error",
        description: "Failed to load audio for playback",
        variant: "destructive"
      });
    }
  };

  const handleSave = async () => {
    if (!recording || !recording.audioBlob) {
      toast({
        title: "Save Error",
        description: "No recording to save",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    
    try {
      const formData = new FormData();
      formData.append('audio', recording.audioBlob, `${emotion}.mp4`);
      formData.append('emotion', emotion);
      formData.append('intensity', intensity.toString());

      const response = await fetch('/api/user/voice-emotions', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to save recording');
      }

      const result = await response.json();
      
      const savedRecording: EmotionVoiceRecording = {
        ...recording,
        id: result.voiceEmotion.id,
        isNew: false
      };
      
      setRecording(savedRecording);
      
      toast({
        title: "Success",
        description: result.message || `${emotion} voice sample saved successfully`
      });

      if (onSave) {
        onSave(savedRecording);
      }

    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Save Error",
        description: "Failed to save voice recording",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!recording || !recording.id) return;

    try {
      await apiRequest(`/api/user/voice-emotions/${recording.id}`, {
        method: 'DELETE'
      });

      setRecording(null);
      
      toast({
        title: "Deleted",
        description: `${emotion} voice sample deleted successfully`
      });

      if (onDelete) {
        onDelete(recording.id);
      }

    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete Error",
        description: "Failed to delete voice recording",
        variant: "destructive"
      });
    }
  };

  const getEmotionColor = (emotion: string) => {
    const colorMap: Record<string, string> = {
      happy: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30",
      sad: "bg-blue-500/20 text-blue-600 border-blue-500/30",
      angry: "bg-red-500/20 text-red-600 border-red-500/30",
      excited: "bg-orange-500/20 text-orange-600 border-orange-500/30",
      calm: "bg-green-500/20 text-green-600 border-green-500/30",
      nervous: "bg-purple-500/20 text-purple-600 border-purple-500/30",
      confident: "bg-indigo-500/20 text-indigo-600 border-indigo-500/30",
      surprised: "bg-pink-500/20 text-pink-600 border-pink-500/30"
    };
    return colorMap[emotion.toLowerCase()] || "bg-gray-500/20 text-gray-600 border-gray-500/30";
  };

  const getEmotionText = (emotion: string) => {
    const emotionTexts: Record<string, string> = {
      happy: "I'm absolutely thrilled about this amazing opportunity! This brings me so much joy and excitement. Everything is working out perfectly, and I couldn't be happier right now!",
      sad: "I feel deeply disappointed and heartbroken about what happened. This loss weighs heavily on my heart, and I can't help but feel overwhelmed by sadness.",
      angry: "I am furious and completely fed up with this situation! This is absolutely unacceptable, and I demand that something be done about it immediately!",
      excited: "Oh my goodness, I can barely contain my excitement! This is incredible news, and I'm practically bouncing with anticipation and energy!",
      calm: "I feel completely at peace and relaxed. Everything is flowing smoothly, and I'm in a state of perfect tranquility and balance.",
      nervous: "I'm feeling really anxious and uncertain about what's going to happen. My heart is racing, and I can't shake this feeling of worry.",
      confident: "I am absolutely certain that I can handle anything that comes my way. I have complete faith in my abilities and know I will succeed.",
      surprised: "Wow, I never saw that coming! This is completely unexpected and has caught me totally off guard. I can hardly believe what just happened!"
    };
    return emotionTexts[emotion.toLowerCase()] || "Please read this text with the appropriate emotional tone to capture your voice for this emotion.";
  };

  return (
    <Card className={`${className} bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className={getEmotionColor(emotion)}>
              {emotion}
            </Badge>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Intensity: {intensity}/10
            </span>
          </div>
          {recording && recording.id && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Recording Interface */}
        <div className="flex flex-col space-y-3">
          <PressHoldRecorder
            buttonText={recording?.isNew ? "Re-record" : "Hold to Record"}
            maxDuration={20000} // 20 seconds max
            minDuration={10000} // 10 seconds minimum
            onRecordingComplete={handleRecordingComplete}
            className="w-full"
            variant={recording?.isNew ? "secondary" : "default"}
          />
          
          {recording && (
            <div className="text-xs text-center text-gray-500 dark:text-gray-400">
              {recording.isNew ? "New recording ready" : "Recorded voice sample"}
            </div>
          )}
        </div>

        {/* Playback and Actions */}
        {recording && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePlayback}
              className="flex items-center space-x-2"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              <span>{isPlaying ? "Stop" : "Play"}</span>
            </Button>

            {recording.isNew && (
              <Button
                onClick={handleSave}
                disabled={isSaving}
                size="sm"
                className="flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? "Saving..." : "Save"}</span>
              </Button>
            )}

            {!recording.isNew && recording.id && (
              <div className="flex items-center space-x-1 text-xs text-green-600 dark:text-green-400">
                <Volume2 className="w-3 h-3" />
                <span>Saved</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}