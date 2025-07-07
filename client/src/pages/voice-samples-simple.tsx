import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Lock, Unlock, Mic, AudioLines } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

interface UserRecording {
  id: number;
  name: string;
  storyId?: number;
  storyTitle?: string;
  audioUrl: string;
  duration: number;
  isLocked: boolean;
  narratorVoiceId?: string;
  category: number;
  createdDate: string;
}

export default function SimplifiedVoiceSamples() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();

  // Get user's ESM recordings
  const { data: recordings = [], isLoading } = useQuery<UserRecording[]>({
    queryKey: ["/api/user/esm-recordings"],
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => setLocation("/")}
                variant="ghost"
                size="sm"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Stories
              </Button>
              <h1 className="text-2xl font-bold">Global Voice Samples</h1>
            </div>
            
            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="relative h-8 w-8 rounded-full p-0">
                  <Avatar>
                    <AvatarImage src={user?.avatarUrl} alt={user?.username || "User"} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {user?.username?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setLocation("/profile")}>
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout}>
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Your Voice Recordings</CardTitle>
            <CardDescription>
              This page will be enhanced after ElevenLabs integration and Narrator voice story generation is complete.
              For now, here's a simple overview of your recorded voice samples across all stories.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-8 w-20" />
                  </div>
                ))}
              </div>
            ) : recordings.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Mic className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>No voice recordings yet.</p>
                <p className="text-sm mt-2">Record voice samples from your stories to see them here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recordings.map((recording) => (
                  <div key={recording.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full ${recording.isLocked ? 'bg-blue-100 dark:bg-blue-900' : 'bg-green-100 dark:bg-green-900'}`}>
                        {recording.isLocked ? (
                          <Lock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        ) : (
                          <Unlock className="w-5 h-5 text-green-600 dark:text-green-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{recording.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Story: {recording.storyTitle || `Story #${recording.storyId}`} • 
                          {parseFloat(recording.duration.toString()).toFixed(1)}s • 
                          {new Date(recording.createdDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {recording.narratorVoiceId && (
                        <Badge variant="secondary">
                          <AudioLines className="w-3 h-3 mr-1" />
                          Has Narrator Voice
                        </Badge>
                      )}
                      <Badge variant={recording.category === 1 ? "default" : recording.category === 2 ? "secondary" : "outline"}>
                        {recording.category === 1 ? "Emotion" : recording.category === 2 ? "Sound" : "Modulation"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Temporary Notice */}
        <Card className="mt-6 border-dashed">
          <CardHeader>
            <CardTitle className="text-lg">Coming Soon</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This page is currently showing a simplified view of your voice recordings. 
              After ElevenLabs integration and Narrator voice generation features are complete, 
              this page will include:
            </p>
            <ul className="list-disc list-inside mt-4 space-y-2 text-muted-foreground">
              <li>Advanced voice cloning management</li>
              <li>Narrator voice generation controls</li>
              <li>Voice quality analysis and optimization</li>
              <li>Cross-story voice sample aggregation</li>
              <li>ElevenLabs voice library integration</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}