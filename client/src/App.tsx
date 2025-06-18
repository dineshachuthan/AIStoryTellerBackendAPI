import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import Chat from "@/pages/chat";
import CreateCharacter from "@/pages/create-character";
import UploadStory from "@/pages/upload-story";
import VoiceSetup from "@/pages/voice-setup";
import StoryPlayer from "@/pages/story-player";
import StoryLibrary from "@/pages/story-library";
import StoryCollaboration from "@/pages/story-collaboration";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/stories" component={StoryLibrary} />
      <Route path="/chat/:conversationId" component={Chat} />
      <Route path="/create" component={CreateCharacter} />
      <Route path="/upload-story" component={UploadStory} />
      <Route path="/voice-setup" component={VoiceSetup} />
      <Route path="/story/:storyId/play" component={StoryPlayer} />
      <Route path="/story/:storyId/collaborate" component={StoryCollaboration} />
      <Route component={NotFound} />
    </Switch>
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
