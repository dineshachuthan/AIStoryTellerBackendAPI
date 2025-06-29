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
      happiness: "Tom received a birthday present as a surprise and the happiness he felt is sky high! He couldn't stop smiling and laughing with pure joy.",
      sadness: "Sarah lost her beloved pet and the sadness she feels is overwhelming. Her heart is heavy with grief and tears won't stop flowing.",
      anger: "Mike discovered someone had stolen his work and the anger he feels is burning inside him. He is furious and his voice trembles with rage.",
      excitement: "Lisa just got accepted to her dream university and the excitement she feels is electric! She can barely contain her energy and enthusiasm.",
      calm: "Emma sits by the peaceful lake and the calmness she feels washes over her completely. Her mind is clear and her heart is at peace.",
      nervous: "David has a big presentation tomorrow and the nervousness he feels makes his hands shake. His heart races with worry and anxiety.",
      confident: "Rachel knows she has prepared well for the interview and the confidence she feels radiates through her voice. She believes in herself completely.",
      surprised: "Jack opened the door to find all his friends waiting and the surprise he felt left him speechless. He never expected this wonderful moment."
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
        {/* Emotion Text to Read */}
        <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Read this text aloud with {emotion} emotion:
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed italic break-words">
            "{getEmotionText(emotion)}"
          </p>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-500">
            Duration: 10-20 seconds • Hold the button while reading
          </div>
        </div>

        {/* Recording Interface */}
        <div className="flex flex-col space-y-3">
          <PressHoldRecorder
            buttonText={recording?.isNew ? "Hold to Re-record" : "Hold to Record"}
            onRecordingComplete={handleRecordingComplete}
            className="w-full py-3"
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