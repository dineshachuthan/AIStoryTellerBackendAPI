import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Mic, Users, Sparkles, Play, ArrowRight, Star } from "lucide-react";
import { useLocation } from "wouter";

export default function Landing() {
  const [, setLocation] = useLocation();

  const handleGetStarted = () => {
    setLocation("/login");
  };

  const handleSignUp = () => {
    setLocation("/register");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-purple-900/20 dark:via-blue-900/20 dark:to-indigo-900/20">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center">
            <div className="flex items-center justify-center mb-6">
              <div className="p-3 rounded-full bg-gradient-to-r from-purple-600 to-blue-600">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                StoryTeller AI
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
              Create immersive stories with AI-powered narration. Transform your ideas into captivating audio experiences with your own voice.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={handleGetStarted}
                size="lg" 
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-3 text-lg"
              >
                Get Started <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                onClick={handleSignUp}
                variant="outline" 
                size="lg" 
                className="border-purple-300 text-purple-600 hover:bg-purple-50 px-8 py-3 text-lg"
              >
                Sign Up Free
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Powerful Features for Every Storyteller
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Whether you're a writer, content creator, or just love stories, our AI-powered platform has everything you need.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <Card className="border-2 border-purple-100 dark:border-purple-800 hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Mic className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <CardTitle className="text-xl">AI Voice Narration</CardTitle>
              <CardDescription>
                Clone your voice or use premium AI voices to narrate your stories with perfect emotion and timing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <Star className="w-4 h-4 mr-2 text-yellow-500" />
                  Voice cloning technology
                </div>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <Star className="w-4 h-4 mr-2 text-yellow-500" />
                  Emotion-based narration
                </div>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <Star className="w-4 h-4 mr-2 text-yellow-500" />
                  Multiple voice profiles
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-blue-100 dark:border-blue-800 hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-xl">Smart Story Analysis</CardTitle>
              <CardDescription>
                Our AI analyzes your stories to identify characters, emotions, and themes for perfect narration.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <Star className="w-4 h-4 mr-2 text-yellow-500" />
                  Character identification
                </div>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <Star className="w-4 h-4 mr-2 text-yellow-500" />
                  Emotion mapping
                </div>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <Star className="w-4 h-4 mr-2 text-yellow-500" />
                  Theme extraction
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-indigo-100 dark:border-indigo-800 hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <CardTitle className="text-xl">Collaborative Storytelling</CardTitle>
              <CardDescription>
                Invite friends and family to contribute voices and create stories together.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <Star className="w-4 h-4 mr-2 text-yellow-500" />
                  Multi-user projects
                </div>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <Star className="w-4 h-4 mr-2 text-yellow-500" />
                  Voice sharing
                </div>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <Star className="w-4 h-4 mr-2 text-yellow-500" />
                  Real-time collaboration
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Bring Your Stories to Life?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of storytellers who are already creating amazing audio experiences with StoryTeller AI.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={handleGetStarted}
              size="lg" 
              variant="secondary"
              className="bg-white text-purple-600 hover:bg-gray-100 px-8 py-3 text-lg"
            >
              Start Creating <Play className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              onClick={handleSignUp}
              size="lg" 
              variant="outline"
              className="border-white text-white hover:bg-white/10 px-8 py-3 text-lg"
            >
              Sign Up Free
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 dark:bg-gray-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="p-2 rounded-full bg-gradient-to-r from-purple-600 to-blue-600">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
              StoryTeller AI
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Transforming stories into immersive audio experiences
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}