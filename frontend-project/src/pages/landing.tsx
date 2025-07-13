import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'wouter';
import { 
  BookOpen, 
  Mic, 
  Users, 
  Sparkles, 
  Play, 
  Volume2,
  Brain,
  Star,
  ArrowRight
} from 'lucide-react';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-blue-900">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BookOpen className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              Storytelling Platform
            </span>
          </div>
          <Button asChild>
            <Link href="/login">Get Started</Link>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 mb-4">
            <Sparkles className="w-4 h-4 mr-2" />
            AI-Powered Storytelling
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Transform Your Ideas Into
            <span className="text-blue-600 block">Immersive Stories</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Create captivating stories with AI-powered narration, voice cloning, and collaborative features. 
            Turn your imagination into professional-quality content.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/login">
                Start Creating
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline">
              <Play className="mr-2 h-5 w-5" />
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Everything You Need to Create Amazing Stories
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Powerful AI tools and collaborative features to bring your stories to life
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <Brain className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <CardTitle>AI Story Analysis</CardTitle>
              <CardDescription>
                Advanced AI analyzes your stories to extract characters, emotions, and themes automatically
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                <li>• Character extraction and analysis</li>
                <li>• Emotion and mood detection</li>
                <li>• Genre classification</li>
                <li>• Story structure analysis</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <Volume2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <CardTitle>Voice Narration</CardTitle>
              <CardDescription>
                Transform your stories into immersive audio experiences with AI-powered voice synthesis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                <li>• Multiple voice options</li>
                <li>• Emotion-based voice modulation</li>
                <li>• Custom voice cloning</li>
                <li>• Sound effects integration</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <Users className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <CardTitle>Collaborative Features</CardTitle>
              <CardDescription>
                Work together with other creators to build amazing stories and share your work
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                <li>• Real-time collaboration</li>
                <li>• Story sharing and invitations</li>
                <li>• Comment and feedback system</li>
                <li>• Version control</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <Mic className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <CardTitle>Voice Recording</CardTitle>
              <CardDescription>
                Record your own voice samples to create personalized narrations and character voices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                <li>• High-quality audio recording</li>
                <li>• Voice sample management</li>
                <li>• Emotion-based recordings</li>
                <li>• Professional voice processing</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <Sparkles className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
              <CardTitle>AI Enhancement</CardTitle>
              <CardDescription>
                Enhance your stories with AI-powered suggestions, improvements, and creative additions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                <li>• Story continuation suggestions</li>
                <li>• Character development ideas</li>
                <li>• Plot enhancement</li>
                <li>• Writing style improvements</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <Star className="h-12 w-12 text-orange-600 mx-auto mb-4" />
              <CardTitle>Professional Quality</CardTitle>
              <CardDescription>
                Export your stories in multiple formats with professional-grade audio and video content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                <li>• Multiple export formats</li>
                <li>• High-quality audio output</li>
                <li>• Video generation support</li>
                <li>• Professional publishing</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">
            Ready to Create Your First Story?
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            Join thousands of creators who are already using our platform to bring their stories to life.
          </p>
          <Button size="lg" asChild>
            <Link href="/login">
              Get Started for Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-gray-950 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-6 w-6" />
              <span className="text-lg font-semibold">Storytelling Platform</span>
            </div>
            <p className="text-gray-400">
              © 2025 Storytelling Platform. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}