import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Upload, FileAudio, Play, Pause, RotateCcw, ArrowRight, Shield } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function UploadAudioPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const SUPPORTED_FORMATS = ['audio/mp3', 'audio/wav', 'audio/m4a', 'audio/ogg', 'audio/webm'];
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

  const transcribeMutation = useMutation({
    mutationFn: async (audioFile: File) => {
      const formData = new FormData();
      formData.append('audio', audioFile);
      
      const response = await apiRequest("POST", "/api/audio/transcribe", formData);
      return await response.json();
    },
    onSuccess: (data) => {
      // Navigate to upload-story with the transcribed content
      const storyId = sessionStorage.getItem('currentStoryId');
      if (storyId && data.text) {
        sessionStorage.setItem('extractedContent', data.text);
        setLocation(`/upload-story?id=${storyId}&source=upload`);
      } else {
        toast({
          title: "Error",
          description: "Failed to process the audio file. Please try again.",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      console.error('Transcription error:', error);
      toast({
        title: "Error",
        description: "Failed to transcribe audio. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (file: File) => {
    // Validate file type
    if (!SUPPORTED_FORMATS.includes(file.type)) {
      toast({
        title: "Unsupported Format",
        description: "Please upload an MP3, WAV, M4A, OGG, or WebM audio file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "File Too Large",
        description: "Please upload an audio file smaller than 50MB.",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    
    // Create audio URL for preview
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    setIsPlaying(false);

    // Clean up previous audio player
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const togglePlayback = () => {
    if (!audioUrl) return;

    if (isPlaying) {
      audioPlayerRef.current?.pause();
      setIsPlaying(false);
    } else {
      if (!audioPlayerRef.current) {
        audioPlayerRef.current = new Audio(audioUrl);
        audioPlayerRef.current.onended = () => setIsPlaying(false);
      }
      audioPlayerRef.current.play();
      setIsPlaying(true);
    }
  };

  const resetFile = () => {
    setSelectedFile(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setIsPlaying(false);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const processAudio = () => {
    if (selectedFile) {
      transcribeMutation.mutate(selectedFile);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-dark-bg text-white p-4">
      <div className="max-w-2xl mx-auto">
        <Card className="bg-dark-card border-gray-800">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Upload Audio</CardTitle>
            <CardDescription className="text-center text-gray-400">
              Upload an audio file and we'll convert it to text automatically
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Privacy Notice */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Shield className="w-5 h-5 text-blue-400 mt-0.5" />
                <div>
                  <h4 className="text-blue-400 font-medium">Privacy Notice</h4>
                  <p className="text-sm text-gray-300 mt-1">
                    Your audio file is processed for text extraction only and is not stored on our servers. 
                    The audio data is discarded immediately after conversion.
                  </p>
                </div>
              </div>
            </div>

            {/* File Upload Area */}
            {!selectedFile ? (
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragOver 
                    ? 'border-tiktok-red bg-tiktok-red/10' 
                    : 'border-gray-600 hover:border-gray-500'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Upload Audio File</h3>
                <p className="text-gray-400 mb-4">
                  Drag and drop your audio file here, or click to browse
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  Supported formats: MP3, WAV, M4A, OGG, WebM (Max 50MB)
                </p>
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="border-tiktok-red text-tiktok-red hover:bg-tiktok-red/20"
                >
                  Browse Files
                </Button>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".mp3,.wav,.m4a,.ogg,.webm,audio/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            ) : (
              /* File Preview */
              <div className="space-y-4">
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <FileAudio className="w-8 h-8 text-tiktok-red" />
                    <div className="flex-1">
                      <h4 className="font-medium truncate">{selectedFile.name}</h4>
                      <p className="text-sm text-gray-400">
                        {formatFileSize(selectedFile.size)} • {selectedFile.type}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Audio Preview Section */}
                <div className="bg-gray-800/30 rounded-lg p-4">
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
                    {selectedFile.size < 10000 && (
                      <div className="text-yellow-400 text-xs bg-yellow-400/10 rounded px-2 py-1 inline-block mb-2">
                        ⚠️ File seems very small - ensure it contains clear speech
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <Button 
                    onClick={resetFile}
                    variant="outline"
                    className="border-gray-500 text-gray-500 hover:bg-gray-500/20 flex-1"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Change File
                  </Button>
                  <Button 
                    onClick={processAudio}
                    disabled={transcribeMutation.isPending}
                    className="bg-tiktok-red hover:bg-tiktok-red/80 flex-1"
                  >
                    {transcribeMutation.isPending ? (
                      <>Processing...</>
                    ) : (
                      <>
                        Convert to Text
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>

                {/* Instructions */}
                <div className="text-xs text-gray-500 text-center bg-blue-500/10 rounded p-3">
                  <strong>Before converting:</strong> Please play the preview to ensure your audio file contains clear speech. 
                  If it sounds unclear or silent, try a different file for better results.
                </div>
              </div>
            )}

            {/* Supported Formats Info */}
            <div className="text-xs text-gray-500 text-center">
              <p>Best results with clear speech recordings</p>
              <p>Processing time depends on file length (typically 1-2 minutes)</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}