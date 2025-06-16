import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, MoreVertical, Plus, Mic } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Message, Character, Conversation } from "@shared/schema";

interface ChatInterfaceProps {
  conversationId: number;
}

export function ChatInterface({ conversationId }: ChatInterfaceProps) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversation } = useQuery<Conversation>({
    queryKey: [`/api/conversations/${conversationId}`],
  });

  const { data: character } = useQuery<Character>({
    queryKey: [`/api/characters/${conversation?.characterId}`],
    enabled: !!conversation?.characterId,
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: [`/api/conversations/${conversationId}/messages`],
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", `/api/conversations/${conversationId}/messages`, {
        content,
        isAi: false,
      });
      return await response.json();
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${conversationId}/messages`] });
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !sendMessageMutation.isPending) {
      sendMessageMutation.mutate(message.trim());
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send greeting message if no messages exist
  useEffect(() => {
    if (character && messages.length === 0 && !messagesLoading) {
      const timer = setTimeout(() => {
        sendMessageMutation.mutate(character.greeting);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [character, messages.length, messagesLoading]);

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (!character) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tiktok-red"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 bg-dark-card border-b border-gray-800">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/")}
            className="mr-3 text-dark-text hover:bg-gray-800"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <img 
            src={character.avatar || "https://images.unsplash.com/photo-1569913486515-b74bf7751574?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"}
            alt={character.name}
            className="w-10 h-10 rounded-full mr-3 object-cover"
          />
          <div>
            <h3 className="font-semibold text-dark-text">{character.name}</h3>
            <p className="text-sm text-green-400 flex items-center">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
              Online
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="text-gray-text hover:bg-gray-800">
          <MoreVertical className="h-5 w-5" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 hide-scrollbar">
        {messagesLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-tiktok-red"></div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start space-x-3 ${
                msg.isAi ? "" : "justify-end"
              }`}
            >
              {msg.isAi && (
                <img 
                  src={character.avatar || "https://images.unsplash.com/photo-1569913486515-b74bf7751574?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"}
                  alt={character.name}
                  className="w-8 h-8 rounded-full flex-shrink-0 object-cover"
                />
              )}
              
              <div className={`max-w-xs px-4 py-3 rounded-2xl ${
                msg.isAi 
                  ? "bg-dark-card rounded-tl-sm" 
                  : "bg-tiktok-red rounded-tr-sm"
              }`}>
                <p className="text-sm text-dark-text whitespace-pre-wrap">{msg.content}</p>
                <span className={`text-xs mt-2 block ${
                  msg.isAi ? "text-gray-text" : "text-pink-200"
                }`}>
                  {formatTime(msg.createdAt!)}
                </span>
              </div>

              {!msg.isAi && (
                <img 
                  src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"
                  alt="You"
                  className="w-8 h-8 rounded-full flex-shrink-0 object-cover"
                />
              )}
            </div>
          ))
        )}
        
        {sendMessageMutation.isPending && (
          <div className="flex items-start space-x-3">
            <img 
              src={character.avatar || "https://images.unsplash.com/photo-1569913486515-b74bf7751574?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"}
              alt={character.name}
              className="w-8 h-8 rounded-full flex-shrink-0 object-cover"
            />
            <div className="bg-dark-card rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <div className="p-4 bg-dark-card border-t border-gray-800">
        <form onSubmit={handleSendMessage} className="flex items-end space-x-3">
          <Button 
            type="button"
            variant="ghost" 
            size="icon"
            className="text-gray-text hover:bg-gray-800"
          >
            <Plus className="h-6 w-6" />
          </Button>
          
          <div className="flex-1 relative">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              className="bg-gray-800 text-dark-text border-gray-700 focus:border-tiktok-cyan rounded-2xl pr-12"
              disabled={sendMessageMutation.isPending}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:bg-transparent"
            >
              <Mic className="h-5 w-5" />
            </Button>
          </div>
          
          <Button
            type="submit"
            size="icon"
            disabled={!message.trim() || sendMessageMutation.isPending}
            className="bg-tiktok-red hover:bg-tiktok-red/80 rounded-full touch-target"
          >
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
