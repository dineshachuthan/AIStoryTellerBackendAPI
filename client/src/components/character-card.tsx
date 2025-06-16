import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share2, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Character } from "@shared/schema";

interface CharacterCardProps {
  character: Character;
  isActive: boolean;
  onChatClick: (characterId: number) => void;
}

export function CharacterCard({ character, isActive, onChatClick }: CharacterCardProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLiked, setIsLiked] = useState(false);
  const [localLikes, setLocalLikes] = useState(character.likes);

  const likeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/characters/${character.id}/like`);
      return await response.json();
    },
    onSuccess: (data) => {
      setLocalLikes(data.likes);
      setIsLiked(true);
      queryClient.invalidateQueries({ queryKey: ["/api/characters"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to like character",
        variant: "destructive",
      });
    },
  });

  const handleLike = () => {
    if (!isLiked) {
      likeMutation.mutate();
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Meet ${character.name}`,
          text: `Check out ${character.name} - ${character.title} on CharacterTok!`,
          url: window.location.href
        });
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Link copied!",
          description: "Character link copied to clipboard",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to copy link",
          variant: "destructive",
        });
      }
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  };

  const formatRating = (rating: number) => {
    return (rating / 10).toFixed(1);
  };

  return (
    <div className="absolute inset-0 w-full h-full">
      {/* Background */}
      <div 
        className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/60"
        style={{
          backgroundImage: character.background ? `url(${character.background})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center"
        }}
      />

      {/* Character Info */}
      <div className="absolute bottom-20 left-4 right-20 z-10">
        <div className="flex items-center mb-3">
          <img 
            src={character.avatar || "https://images.unsplash.com/photo-1569913486515-b74bf7751574?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"}
            alt={character.name}
            className="w-12 h-12 rounded-full border-2 border-tiktok-cyan mr-3 object-cover"
          />
          <div>
            <h3 className="text-lg font-semibold text-dark-text">{character.name}</h3>
            <p className="text-sm text-gray-text">{character.title}</p>
          </div>
        </div>
        
        <p className="text-sm mb-4 leading-relaxed text-dark-text">
          {character.description}
        </p>
        
        <div className="flex items-center space-x-4 text-sm text-dark-text">
          <span className="flex items-center">
            <Heart className="w-4 h-4 text-tiktok-pink mr-1" />
            <span>{formatNumber(localLikes)}</span>
          </span>
          <span className="flex items-center">
            <MessageCircle className="w-4 h-4 text-tiktok-cyan mr-1" />
            <span>{formatNumber(character.chats)}</span>
          </span>
          <span className="flex items-center">
            <Star className="w-4 h-4 text-yellow-400 mr-1" />
            <span>{formatRating(character.rating)}</span>
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="absolute bottom-20 right-4 flex flex-col space-y-4 z-10">
        <Button
          size="icon"
          variant="ghost"
          onClick={handleLike}
          disabled={likeMutation.isPending}
          className={`bg-dark-card/50 backdrop-blur-sm hover:bg-dark-card/70 border-0 rounded-full w-12 h-12 flex flex-col items-center justify-center touch-target ${
            isLiked ? "animate-pulse-heart" : ""
          }`}
        >
          <Heart className={`w-6 h-6 ${isLiked ? "text-tiktok-red fill-tiktok-red" : "text-white"}`} />
          <span className="text-xs mt-1 text-white">{formatNumber(localLikes)}</span>
        </Button>

        <Button
          size="icon"
          variant="ghost"
          onClick={handleShare}
          className="bg-dark-card/50 backdrop-blur-sm hover:bg-dark-card/70 border-0 rounded-full w-12 h-12 flex flex-col items-center justify-center touch-target"
        >
          <Share2 className="w-6 h-6 text-white" />
          <span className="text-xs mt-1 text-white">Share</span>
        </Button>

        <Button
          size="icon"
          variant="ghost"
          onClick={() => onChatClick(character.id)}
          className="bg-tiktok-red hover:bg-tiktok-red/80 border-0 rounded-full w-12 h-12 flex flex-col items-center justify-center animate-bounce-gentle touch-target"
        >
          <MessageCircle className="w-6 h-6 text-white" />
          <span className="text-xs mt-1 text-white">Chat</span>
        </Button>
      </div>
    </div>
  );
}
