import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertStorySchema } from "@shared/schema";
import { ArrowLeft, Upload, Mic, Type, FileText } from "lucide-react";
import { z } from "zod";

const uploadStorySchema = insertStorySchema.extend({
  uploadType: z.enum(['text', 'voice', 'manual']),
});

export default function UploadStory() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadType, setUploadType] = useState<'text' | 'voice' | 'manual'>('manual');
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<File | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  const form = useForm({
    resolver: zodResolver(uploadStorySchema),
    defaultValues: {
      title: "",
      content: "",
      category: "Drama",
      uploadType: 'manual',
      authorId: 'user_123', // TODO: Get from auth context
    },
  });

  const uploadStoryMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch("/api/stories", {
        method: "POST",
        body: data,
      });
      if (!response.ok) {
        throw new Error("Failed to upload story");
      }
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Story Uploaded!",
        description: "Your story is being analyzed and processed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/stories"] });
      setLocation(`/story/${data.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload story",
        variant: "destructive",
      });
    },
  });

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        const file = new File([blob], 'story-audio.wav', { type: 'audio/wav' });
        setRecordedAudio(file);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      toast({
        title: "Recording Error",
        description: "Could not access microphone",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  const onSubmit = (data: any) => {
    const formData = new FormData();
    
    Object.keys(data).forEach(key => {
      if (data[key] !== null && data[key] !== undefined) {
        formData.append(key, data[key]);
      }
    });

    formData.set('uploadType', uploadType);

    if (uploadType === 'voice' && recordedAudio) {
      formData.append('audio', recordedAudio);
    }

    uploadStoryMutation.mutate(formData);
  };

  const categories = [
    "Drama", "Comedy", "Romance", "Adventure", "Mystery", 
    "Fantasy", "Sci-Fi", "Horror", "Thriller", "Biography"
  ];

  return (
    <div className="bg-dark-bg text-dark-text min-h-screen">
      <div className="flex flex-col h-screen">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-dark-card border-b border-gray-800">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setLocation("/")}
            className="text-dark-text hover:bg-gray-800"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h2 className="text-lg font-semibold">Upload Your Story</h2>
          <Button 
            onClick={form.handleSubmit(onSubmit)}
            disabled={uploadStoryMutation.isPending}
            className="bg-tiktok-red hover:bg-tiktok-red/80 text-white font-semibold"
          >
            {uploadStoryMutation.isPending ? "Uploading..." : "Upload"}
          </Button>
        </div>

        {/* Upload Type Selection */}
        <div className="p-4 bg-dark-card border-b border-gray-800">
          <h3 className="text-sm font-medium text-dark-text mb-3">How would you like to add your story?</h3>
          <div className="grid grid-cols-3 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setUploadType('manual')}
              className={`flex flex-col items-center p-4 h-auto ${
                uploadType === 'manual'
                  ? "bg-tiktok-red/20 border-tiktok-red text-tiktok-red"
                  : "bg-gray-800 hover:bg-gray-700 text-dark-text border-gray-700"
              }`}
            >
              <Type className="w-6 h-6 mb-2" />
              <span className="text-xs">Type Story</span>
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={() => setUploadType('voice')}
              className={`flex flex-col items-center p-4 h-auto ${
                uploadType === 'voice'
                  ? "bg-tiktok-cyan/20 border-tiktok-cyan text-tiktok-cyan"
                  : "bg-gray-800 hover:bg-gray-700 text-dark-text border-gray-700"
              }`}
            >
              <Mic className="w-6 h-6 mb-2" />
              <span className="text-xs">Record Voice</span>
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={() => setUploadType('text')}
              className={`flex flex-col items-center p-4 h-auto ${
                uploadType === 'text'
                  ? "bg-tiktok-pink/20 border-tiktok-pink text-tiktok-pink"
                  : "bg-gray-800 hover:bg-gray-700 text-dark-text border-gray-700"
              }`}
            >
              <FileText className="w-6 h-6 mb-2" />
              <span className="text-xs">Upload File</span>
            </Button>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Title */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-dark-text">Story Title</FormLabel>
                    <FormControl>
                      <Input 
                        {...field}
                        placeholder="Enter your story title..."
                        className="bg-gray-800 text-dark-text border-gray-700 focus:border-tiktok-cyan"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Category */}
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-dark-text">Category</FormLabel>
                    <div className="grid grid-cols-2 gap-2">
                      {categories.map((category) => (
                        <Button
                          key={category}
                          type="button"
                          variant="outline"
                          onClick={() => field.onChange(category)}
                          className={`text-sm transition-colors ${
                            field.value === category
                              ? "bg-tiktok-red/20 border-tiktok-red text-tiktok-red"
                              : "bg-gray-800 hover:bg-tiktok-red/20 hover:border-tiktok-red text-dark-text border-gray-700"
                          }`}
                        >
                          {category}
                        </Button>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Content based on upload type */}
              {uploadType === 'manual' && (
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-dark-text">Story Content</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field}
                          placeholder="Write your story here..."
                          className="bg-gray-800 text-dark-text border-gray-700 focus:border-tiktok-cyan h-64 resize-none"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {uploadType === 'voice' && (
                <div className="space-y-4">
                  <FormLabel className="text-dark-text">Record Your Story</FormLabel>
                  <div className="flex flex-col items-center space-y-4 p-6 bg-gray-800 rounded-lg border border-gray-700">
                    {!isRecording && !recordedAudio && (
                      <Button
                        type="button"
                        onClick={startRecording}
                        className="bg-tiktok-red hover:bg-tiktok-red/80 rounded-full w-20 h-20 flex items-center justify-center"
                      >
                        <Mic className="w-8 h-8" />
                      </Button>
                    )}
                    
                    {isRecording && (
                      <div className="flex flex-col items-center space-y-4">
                        <div className="w-20 h-20 bg-tiktok-red rounded-full flex items-center justify-center animate-pulse">
                          <Mic className="w-8 h-8" />
                        </div>
                        <Button
                          type="button"
                          onClick={stopRecording}
                          className="bg-gray-600 hover:bg-gray-500"
                        >
                          Stop Recording
                        </Button>
                      </div>
                    )}
                    
                    {recordedAudio && !isRecording && (
                      <div className="flex flex-col items-center space-y-4">
                        <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center">
                          <Mic className="w-8 h-8" />
                        </div>
                        <p className="text-green-400">Recording completed!</p>
                        <Button
                          type="button"
                          onClick={() => {
                            setRecordedAudio(null);
                          }}
                          variant="outline"
                          className="border-gray-600 text-gray-300"
                        >
                          Record Again
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {uploadType === 'text' && (
                <div className="space-y-4">
                  <FormLabel className="text-dark-text">Upload Text File</FormLabel>
                  <div className="flex items-center justify-center p-6 bg-gray-800 rounded-lg border border-gray-700 border-dashed">
                    <div className="text-center">
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-400">Drag and drop a text file here</p>
                      <p className="text-sm text-gray-500">or click to browse</p>
                    </div>
                  </div>
                </div>
              )}
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}