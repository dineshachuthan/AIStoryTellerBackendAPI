import { useParams, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { ChatInterface } from "@/components/chat-interface";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function Chat() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const [, setLocation] = useLocation();
  
  const { data: conversation, isLoading } = useQuery({
    queryKey: [`/api/conversations/${conversationId}`],
    queryFn: async () => {
      const { apiClient } = await import('@/lib/api-client');
      return apiClient.request('GET', `/api/conversations/${conversationId}`);
    },
    enabled: !!conversationId,
  });

  if (isLoading) {
    return (
      <div className="bg-dark-bg text-dark-text h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tiktok-red mx-auto mb-4"></div>
          <p>Loading conversation...</p>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="bg-dark-bg text-dark-text h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="mb-4">Conversation not found</p>
          <Button 
            onClick={() => setLocation("/")}
            className="bg-tiktok-red hover:bg-tiktok-red/80"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark-bg text-dark-text h-screen">
      <ChatInterface conversationId={parseInt(conversationId!)} />
    </div>
  );
}
