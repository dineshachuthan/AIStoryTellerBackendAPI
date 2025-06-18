import { CharacterFeed } from "@/components/character-feed";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { Upload, Mic, Users, Play } from "lucide-react";
import { BottomNavigation } from "@/components/bottom-navigation";

export default function Home() {
  const [, setLocation] = useLocation();

  return (
    <div className="relative w-full h-screen bg-dark-bg text-dark-text overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-50 bg-dark-bg/80 backdrop-blur-lg border-b border-gray-800 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">DeeVee</h1>
          <div className="flex space-x-2">
            <Button
              onClick={() => setLocation("/voice-setup")}
              variant="outline"
              size="sm"
              className="border-tiktok-cyan text-tiktok-cyan hover:bg-tiktok-cyan/20"
            >
              <Mic className="w-4 h-4 mr-2" />
              Voice Setup
            </Button>
            <Button
              onClick={() => setLocation("/upload-story")}
              className="bg-tiktok-red hover:bg-tiktok-red/80"
              size="sm"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Story
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
            <div className="grid grid-cols-3 gap-2">
              <Button
                onClick={() => setLocation("/create")}
                variant="outline"
                className="border-tiktok-pink text-tiktok-pink hover:bg-tiktok-pink/20 h-auto p-3 flex flex-col items-center space-y-1"
                size="sm"
              >
                <Users className="w-5 h-5" />
                <span className="text-xs">Character</span>
              </Button>
              <Button
                onClick={() => setLocation("/voice-setup")}
                variant="outline"
                className="border-tiktok-cyan text-tiktok-cyan hover:bg-tiktok-cyan/20 h-auto p-3 flex flex-col items-center space-y-1"
                size="sm"
              >
                <Mic className="w-5 h-5" />
                <span className="text-xs">Voice</span>
              </Button>
              <Button
                onClick={() => setLocation("/upload-story")}
                className="bg-tiktok-red hover:bg-tiktok-red/80 h-auto p-3 flex flex-col items-center space-y-1"
                size="sm"
              >
                <Upload className="w-5 h-5" />
                <span className="text-xs">Create</span>
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
