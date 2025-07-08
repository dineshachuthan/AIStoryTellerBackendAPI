import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppHeader } from "@/components/app-header";
import { AppTopNavigation } from "@/components/app-top-navigation";
// import { VoiceSessionInitializer } from "@/components/voice-session-initializer"; // Temporarily disabled
import { useAuth } from "@/hooks/useAuth";
import { sessionActivityTracker } from "@/lib/session-activity";
import { useEffect } from "react";
import { LanguageProvider } from "@/contexts/language-context";
import Home from "@/pages/home";
import Chat from "@/pages/chat";
import CreateCharacter from "@/pages/create-character";
import UploadStory from "@/pages/upload-story";
import StoryAnalysis from "@/pages/story-analysis";
import SimplifiedVoiceSamples from "@/pages/voice-samples-simple";
import { VoiceRecordPage } from "@/pages/voice-record";
import { UploadAudioPage } from "@/pages/upload-audio";
import StoryPlayer from "@/pages/story-player";
import StoryLibrary from "@/pages/story-library";
import StoryCollaboration from "@/pages/story-collaboration";
import VoiceModulationTest from "@/pages/voice-modulation-test";
import VoiceCloningTest from "@/pages/voice-cloning-test";
import VoiceCloningTest1 from "@/pages/voice-cloning-test1";
import CollaborativeRoleplay from "@/pages/collaborative-roleplay";
import Invitation from "@/pages/invitation";
import RoleplayRecording from "@/pages/roleplay-recording";
import Login from "@/pages/login";
import Register from "@/pages/register";
import NotFound from "@/pages/not-found";
import OAuthTest from "@/pages/oauth-test";
import StoryNarration from "@/pages/StoryNarration";



function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  // Initialize session activity tracking for authenticated users
  useEffect(() => {
    if (isAuthenticated) {
      sessionActivityTracker.init();
    }
    
    return () => {
      sessionActivityTracker.destroy();
    };
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="tiktok-theme min-h-screen">
        <Toaster />
        <Switch>
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />
          <Route path="/oauth-test" component={OAuthTest} />
          {isAuthenticated ? (
            <>

              {/* Top Navigation for all authenticated pages except Home */}
              <Route path="/" component={Home} />
              <Route path="/stories" component={StoryLibrary} />
              <Route path="/chat/:conversationId" component={Chat} />
              <Route path="/create" component={CreateCharacter} />
              <Route path="/upload-story" component={UploadStory} />
              <Route path="/:storyId/upload-story" component={UploadStory} />
              <Route path="/voice-record" component={VoiceRecordPage} />
              <Route path="/upload-audio" component={UploadAudioPage} />
              <Route path="/story-analysis" component={StoryAnalysis} />
              <Route path="/analysis/:storyId" component={StoryAnalysis} />
              <Route path="/voice-setup" component={SimplifiedVoiceSamples} />
              <Route path="/voice-samples" component={SimplifiedVoiceSamples} />
              <Route path="/story/:storyId" component={StoryPlayer} />
              <Route path="/story/:storyId/play" component={StoryPlayer} />
              <Route path="/story/:storyId/collaborate" component={StoryCollaboration} />
              <Route path="/stories/:id/narration" component={StoryNarration} />
              <Route path="/collaborative-roleplay" component={CollaborativeRoleplay} />
              <Route path="/invite/:token" component={Invitation} />
              <Route path="/roleplay/:token" component={RoleplayRecording} />
              <Route path="/voice-test" component={VoiceModulationTest} />
              <Route path="/voice-cloning-test" component={VoiceCloningTest} />
              <Route path="/voice-cloning-test1" component={VoiceCloningTest1} />
              <Route component={NotFound} />
            </>
          ) : (
            <Route path="*" component={Login} />
          )}
        </Switch>
      </div>
    </TooltipProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
