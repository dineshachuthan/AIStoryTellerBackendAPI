import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

export function VoiceSessionInitializer() {
  const { user, isLoading } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (user && !isLoading) {
      // Initialize voice cloning session in background
      fetch("/api/voice-cloning/initialize-session", {
        method: "POST",
        credentials: "include"
      }).then(response => {
        if (response.ok) {
          console.log("🔧 Voice cloning session initialized automatically");
          // Invalidate session status to trigger UI updates
          queryClient.invalidateQueries({ queryKey: ["/api/voice-cloning/session-status"] });
        }
      }).catch(error => {
        console.warn("Voice cloning session initialization failed:", error);
      });
    }
  }, [user, isLoading, queryClient]);

  return null; // This component doesn't render anything
}