import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Save, Volume2, RotateCcw, Check, Shield } from 'lucide-react';
import { PressHoldRecorder } from '@/components/ui/press-hold-recorder';

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
  intensity = 7,
  onSave,
  onDelete,
  existingRecording,
  className = ""
}: EmotionVoiceRecorderProps) {
  const [recording, setRecording] = useState<EmotionVoiceRecording | null>(existingRecording || null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const getEmotionColor = (emotion: string) => {
    const colorMap: Record<string, string> = {
      happy: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30",
      sad: "bg-blue-500/20 text-blue-600 border-blue-500/30",
      angry: "bg-red-500/20 text-red-600 border-red-500/30",
      excited: "bg-orange-500/20 text-orange-600 border-orange-500/30",
      calm: "bg-green-500/20 text-green-600 border-green-500/30",
      nervous: "bg-purple-500/20 text-purple-600 border-purple-500/30",
      confident: "bg-teal-500/20 text-teal-600 border-teal-500/30",
      surprised: "bg-pink-500/20 text-pink-600 border-pink-500/30",
      loving: "bg-rose-500/20 text-rose-600 border-rose-500/30",
      afraid: "bg-slate-500/20 text-slate-600 border-slate-500/30"
    };
    return colorMap[emotion.toLowerCase()] || "bg-gray-500/20 text-gray-600 border-gray-500/30";
  };

  const getEmotionText = (emotion: string) => {
    const emotionTexts: Record<string, string> = {
      happy: "Tom received a birthday present as a surprise and the happiness he felt is sky high! He couldn't stop smiling and laughing with pure joy.",
      sad: "Sarah lost her beloved pet and the sadness she feels is overwhelming. Her heart is heavy with grief and tears won't stop flowing.",
      angry: "Mike discovered someone had stolen his work and the anger he feels is burning inside him. He is furious and his voice trembles with rage.",
      excited: "Lisa just got accepted to her dream university and the excitement she feels is electric! She can barely contain her energy and enthusiasm.",
      calm: "Emma sits by the peaceful lake and the calmness she feels washes over her completely. Her mind is clear and her heart is at peace.",
      nervous: "David has a big presentation tomorrow and the nervousness he feels makes his hands shake. His heart races with worry and anxiety.",
      confident: "Rachel knows she has prepared well for the interview and the confidence she feels radiates through her voice. She believes in herself completely.",
      surprised: "Jack opened the door to find all his friends waiting and the surprise he felt left him speechless. He never expected this wonderful moment.",
      loving: "Maria holds her newborn baby and the love she feels fills her entire being. Her voice is warm and tender with overwhelming affection.",
      afraid: "Kevin hears strange noises in the dark and the fear he feels makes his voice shake. His heart pounds with terror and uncertainty."
    };
    return emotionTexts[emotion.toLowerCase()] || "Please read this text with the appropriate emotional tone to capture your voice for this emotion.";
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleRecordingComplete = (audioBlob: Blob, audioUrl: string) => {
    const newRecording: EmotionVoiceRecording = {
      emotion,
      intensity,
      audioBlob,
      audioUrl,
      isNew: true,
      createdAt: new Date()
    };
    setRecording(newRecording);
  };

  const togglePlayback = () => {
    if (!recording?.audioUrl) return;

    if (isPlaying) {
      // Stop current playback
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
      setIsPlaying(false);
    } else {
      // Start new playback
      const audio = new Audio(recording.audioUrl);
      audioPlayerRef.current = audio;
      setIsPlaying(true);

      audio.play().catch(error => {
        console.error('Error playing audio:', error);
        setIsPlaying(false);
      });

      audio.onended = () => {
        setIsPlaying(false);
        audioPlayerRef.current = null;
      };

      audio.onerror = () => {
        setIsPlaying(false);
        audioPlayerRef.current = null;
      };
    }
  };

  const resetRecording = () => {
    if (recording?.audioUrl) {
      URL.revokeObjectURL(recording.audioUrl);
    }
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    setRecording(null);
    setIsPlaying(false);
  };

  const handleSave = async () => {
    if (!recording || !recording.isNew) return;

    setIsSaving(true);
    try {
      const savedRecording: EmotionVoiceRecording = {
        ...recording,
        id: Date.now(), // Temporary ID
        isNew: false
      };
      
      setRecording(savedRecording);
      onSave?.(savedRecording);
    } catch (error) {
      console.error('Error saving recording:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className={`${className} border border-gray-200 dark:border-gray-700 w-full max-w-none`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            <Badge 
              variant="outline" 
              className={`px-2 py-1 text-xs font-medium border flex-shrink-0 ${getEmotionColor(emotion)}`}
            >
              {emotion.charAt(0).toUpperCase() + emotion.slice(1)}
            </Badge>
            <span className="text-xs text-gray-500 flex-shrink-0">Intensity: {intensity}</span>
          </div>
          {recording && !recording.isNew && (
            <div className="flex items-center space-x-1 text-xs text-green-600 dark:text-green-400 flex-shrink-0">
              <Check className="w-3 h-3" />
              <span>Saved</span>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3 px-4 pb-4">
        {/* Emotion Text to Read */}
        <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Read this text aloud with {emotion} emotion:
          </h4>
          <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed italic break-words whitespace-normal overflow-hidden">
            "{getEmotionText(emotion)}"
          </div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-500">
            Duration: 10-20 seconds • Hold the button while reading
          </div>
        </div>

        {/* Recording Section */}
        {!recording && (
          <div className="w-full">
            <PressHoldRecorder
              onRecordingComplete={handleRecordingComplete}
              maxRecordingTime={20}
              buttonText={{
                hold: "Hold to Record",
                recording: "Recording... (release when done)",
                instructions: "Press and hold while reading the text above"
              }}
              className="w-full"
            />
          </div>
        )}

        {recording && (
          <div className="space-y-4">
            {/* Audio File Info */}
            <div className="bg-gray-800/10 dark:bg-gray-800/50 rounded-lg p-4">
              <h4 className="text-sm font-medium mb-2 text-center">
                {recording.isNew ? "Recording Complete" : "Recorded Voice Sample"}
              </h4>
              <div className="flex justify-center items-center space-x-4 text-sm text-gray-600 dark:text-gray-300">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${recording.isNew ? 'bg-orange-500' : 'bg-green-500'}`}></div>
                  <span>Size: {recording.audioBlob ? formatFileSize(recording.audioBlob.size) : 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Audio Preview Section */}
            <div className="bg-gray-800/10 dark:bg-gray-800/30 rounded-lg p-4">
              <h4 className="text-sm font-medium mb-3 text-center">Audio Preview</h4>
              <div className="flex justify-center space-x-4 mb-3">
                <Button 
                  onClick={togglePlayback}
                  variant="outline"
                  className="border-blue-500 text-blue-500 hover:bg-blue-500/20"
                  size="sm"
                >
                  {isPlaying ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                  {isPlaying ? 'Pause Preview' : 'Play Preview'}
                </Button>
              </div>
              
              {/* Audio quality indicator */}
              <div className="text-center">
                {recording.audioBlob && recording.audioBlob.size < 10000 && (
                  <div className="text-yellow-600 dark:text-yellow-400 text-xs bg-yellow-400/10 rounded px-2 py-1 inline-block mb-2">
                    ⚠️ Recording seems very short - ensure it contains clear speech
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <Button 
                onClick={resetRecording}
                variant="outline"
                className="border-gray-500 text-gray-500 hover:bg-gray-500/20 flex-1"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Record Again
              </Button>
              
              {recording.isNew && (
                <Button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-green-600 hover:bg-green-700 flex-1"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              )}

              {!recording.isNew && (
                <div className="flex items-center justify-center space-x-2 text-sm text-green-600 dark:text-green-400 flex-1 border border-green-500/30 rounded bg-green-500/10 py-2">
                  <Volume2 className="w-4 h-4" />
                  <span>Voice Sample Saved</span>
                </div>
              )}
            </div>

            {/* Instructions */}
            {recording.isNew && (
              <div className="text-xs text-gray-500 text-center bg-blue-500/10 rounded p-3 border border-blue-500/20">
                <strong>Before saving:</strong> Please play the preview to ensure your recording contains clear speech. 
                If it sounds unclear or silent, record again for better results.
              </div>
            )}
          </div>
        )}

        {/* Privacy Notice for new recordings */}
        {recording?.isNew && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-xs">
            <div className="flex items-start space-x-2">
              <Shield className="w-3 h-3 text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-blue-600 dark:text-blue-200">
                <strong>Voice Privacy:</strong> Your emotion voice samples are stored securely for your personal voice cloning. 
                They are never shared and are used only to generate your personalized AI voice.
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}