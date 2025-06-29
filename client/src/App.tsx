import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppHeader } from "@/components/app-header";
import { AppTopNavigation } from "@/components/app-top-navigation";
import { useAuth } from "@/hooks/useAuth";
import Home from "@/pages/home";
import Chat from "@/pages/chat";
import CreateCharacter from "@/pages/create-character";
import UploadStory from "@/pages/upload-story";
import StoryAnalysis from "@/pages/story-analysis";
import VoiceSamples from "@/pages/voice-samples";
import { VoiceRecordPage } from "@/pages/voice-record";
import { UploadAudioPage } from "@/pages/upload-audio";
import StoryPlayer from "@/pages/story-player";
import StoryLibrary from "@/pages/story-library";
import StoryCollaboration from "@/pages/story-collaboration";
import VoiceModulationTest from "@/pages/voice-modulation-test";
import CollaborativeRoleplay from "@/pages/collaborative-roleplay";
import Invitation from "@/pages/invitation";
import RoleplayRecording from "@/pages/roleplay-recording";
import Login from "@/pages/login";
import Register from "@/pages/register";
import NotFound from "@/pages/not-found";
import OAuthTest from "@/pages/oauth-test";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

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
    <>
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
            <Route path="/voice-setup" component={VoiceSamples} />
            <Route path="/voice-samples" component={VoiceSamples} />
            <Route path="/story/:storyId" component={StoryPlayer} />
            <Route path="/story/:storyId/play" component={StoryPlayer} />
            <Route path="/story/:storyId/collaborate" component={StoryCollaboration} />
            <Route path="/collaborative-roleplay" component={CollaborativeRoleplay} />
            <Route path="/invite/:token" component={Invitation} />
            <Route path="/roleplay/:token" component={RoleplayRecording} />
            <Route path="/voice-test" component={VoiceModulationTest} />
            <Route component={NotFound} />
          </>
        ) : (
          <Route path="*" component={Login} />
        )}
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="tiktok-theme min-h-screen">
          <Toaster />
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
