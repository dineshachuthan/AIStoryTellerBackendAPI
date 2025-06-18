import { CharacterFeed } from "@/components/character-feed";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { Upload, Mic, Users, Play, User, Heart, FileText, File, AudioLines, PenTool } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BottomNavigation } from "@/components/bottom-navigation";
import { defaultStoryConfig } from "@shared/storyConfig";

export default function Home() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const getUserInitials = () => {
    if (!user) return 'U';
    return user.displayName 
      ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase()
      : user.firstName && user.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
      : user.email ? user.email[0].toUpperCase()
      : 'U';
  };

  return (
    <div className="relative w-full h-screen bg-dark-bg text-dark-text overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-50 bg-dark-bg/80 backdrop-blur-lg border-b border-gray-800 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">DeeVee</h1>
          <div className="flex items-center space-x-3">
            <Button
              onClick={() => setLocation("/voice-samples")}
              variant="outline"
              size="sm"
              className="border-tiktok-cyan text-tiktok-cyan hover:bg-tiktok-cyan/20"
            >
              <AudioLines className="w-4 h-4 mr-2" />
              Voice Samples
            </Button>
            
            <Button
              onClick={() => setLocation("/profile")}
              variant="ghost"
              size="sm"
              className="relative h-8 w-8 rounded-full p-0"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage 
                  src={user?.profileImageUrl || undefined} 
                  alt={user?.displayName || user?.email || 'User'} 
                />
                <AvatarFallback className="bg-tiktok-red text-white text-xs">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Actions Overlay */}
      <div className="absolute top-20 left-0 right-0 z-40 p-4">
        <Card className="bg-dark-card/90 backdrop-blur-lg border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center text-lg">
              <Users className="w-5 h-5 mr-2 text-tiktok-pink" />
              Collaborative Storytelling
            </CardTitle>
            <CardDescription className="text-gray-text text-sm">
              Create stories with friends where each person voices a unique character
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button
                onClick={() => setLocation("/write-story")}
                variant="outline"
                className="border-blue-500 text-blue-500 hover:bg-blue-500/20 h-auto p-3 flex flex-col items-center space-y-1"
                size="sm"
              >
                <PenTool className="w-5 h-5" />
                <span className="text-xs text-center">{defaultStoryConfig.writtenStory.label}</span>
              </Button>
              <Button
                onClick={() => setLocation("/voice-record")}
                variant="outline"
                className="border-green-500 text-green-500 hover:bg-green-500/20 h-auto p-3 flex flex-col items-center space-y-1"
                size="sm"
              >
                <Mic className="w-5 h-5" />
                <span className="text-xs text-center">{defaultStoryConfig.voiceRecord.label}</span>
                <span className="text-xs opacity-70">({defaultStoryConfig.voiceRecord.maxDurationMinutes} min limit)</span>
              </Button>
              <Button
                onClick={() => setLocation("/upload-story")}
                variant="outline"
                className="border-purple-500 text-purple-500 hover:bg-purple-500/20 h-auto p-3 flex flex-col items-center space-y-1"
                size="sm"
              >
                <FileText className="w-5 h-5" />
                <span className="text-xs text-center">{defaultStoryConfig.uploadText.label}</span>
              </Button>
              <Button
                onClick={() => setLocation("/upload-audio")}
                className="bg-tiktok-red hover:bg-tiktok-red/80 h-auto p-3 flex flex-col items-center space-y-1"
                size="sm"
              >
                <AudioLines className="w-5 h-5" />
                <span className="text-xs text-center">{defaultStoryConfig.uploadAudio.label}</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <CharacterFeed />
      <BottomNavigation />
    </div>
  );
}
