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

  const handleOAuthLogin = (provider: string) => {
    console.log(`[OAuth] Attempting to open popup for ${provider}`);
    const popup = window.open(`/api/auth/${provider}`, 'oauth_popup', 'width=500,height=600,scrollbars=yes,resizable=yes');
    
    if (!popup) {
      console.log('[OAuth] Popup blocked, redirecting in same tab');
      // Fallback to same-tab if popup blocked
      window.location.href = `/api/auth/${provider}`;
      return;
    }

    console.log('[OAuth] Popup opened successfully');
    // Only monitor for closure without refreshing - message handler will handle success
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        console.log('[OAuth] Popup closed');
        clearInterval(checkClosed);
        // Don't refresh here - let the message handler do it
      }
    }, 1000);
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
            
            {/* OAuth Options */}
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-purple-900/20 dark:via-blue-900/20 dark:to-indigo-900/20 text-gray-500 dark:text-gray-400">
                    Or continue with
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-3 mt-4 max-w-sm mx-auto">
                <Button
                  variant="outline"
                  onClick={() => handleOAuthLogin('google')}
                  className="w-full border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                  title="Sign in with Google"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleOAuthLogin('facebook')}
                  className="w-full border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                  title="Sign in with Facebook"
                >
                  <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleOAuthLogin('microsoft')}
                  className="w-full border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                  title="Sign in with Microsoft"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#F25022" d="M11.4 11.4H0V0h11.4v11.4z"/>
                    <path fill="#00A4EF" d="M24 11.4H12.6V0H24v11.4z"/>
                    <path fill="#7FBA00" d="M11.4 24H0V12.6h11.4V24z"/>
                    <path fill="#FFB900" d="M24 24H12.6V12.6H24V24z"/>
                  </svg>
                </Button>
              </div>
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