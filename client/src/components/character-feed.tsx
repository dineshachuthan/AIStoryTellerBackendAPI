import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { CharacterCard } from "./character-card";
import { apiRequest } from "@/lib/queryClient";
import type { Character } from "@shared/schema";

export function CharacterFeed() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [touchStart, setTouchStart] = useState<{ y: number; time: number } | null>(null);

  const { data: characters = [], isLoading } = useQuery<Character[]>({
    queryKey: ["/api/characters"],
  });

  const createConversationMutation = useMutation({
    mutationFn: async (characterId: number) => {
      const userId = `user_${Date.now()}`; // Simple user ID generation
      const response = await apiRequest("POST", "/api/conversations", {
        characterId,
        userId,
      });
      return await response.json();
    },
    onSuccess: (conversation) => {
      setLocation(`/chat/${conversation.id}`);
    },
  });

  const handleChatClick = (characterId: number) => {
    createConversationMutation.mutate(characterId);
  };

  const nextCharacter = useCallback(() => {
    if (isTransitioning || currentIndex >= characters.length - 1) return;
    setIsTransitioning(true);
    setCurrentIndex(prev => prev + 1);
    setTimeout(() => setIsTransitioning(false), 300);
  }, [currentIndex, characters.length, isTransitioning]);

  const previousCharacter = useCallback(() => {
    if (isTransitioning || currentIndex <= 0) return;
    setIsTransitioning(true);
    setCurrentIndex(prev => prev - 1);
    setTimeout(() => setIsTransitioning(false), 300);
  }, [currentIndex, isTransitioning]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({
      y: e.touches[0].clientY,
      time: Date.now(),
    });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart || isTransitioning) return;

    const touchEnd = e.changedTouches[0].clientY;
    const deltaY = touchStart.y - touchEnd;
    const deltaTime = Date.now() - touchStart.time;
    const threshold = 50;
    const velocity = Math.abs(deltaY) / deltaTime;

    // Require minimum swipe distance and velocity
    if (Math.abs(deltaY) > threshold && velocity > 0.3) {
      if (deltaY > 0) {
        nextCharacter();
      } else {
        previousCharacter();
      }
    }

    setTouchStart(null);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "w") {
        e.preventDefault();
        previousCharacter();
      } else if (e.key === "ArrowDown" || e.key === "s") {
        e.preventDefault();
        nextCharacter();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextCharacter, previousCharacter]);

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tiktok-red mx-auto mb-4"></div>
          <p className="text-dark-text">Loading characters...</p>
        </div>
      </div>
    );
  }

  if (characters.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-dark-text mb-4">No characters available</p>
          <p className="text-gray-text text-sm">Create your first character to get started!</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="w-full h-full relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {characters.map((character, index) => {
        let transform = "";
        
        if (index < currentIndex) {
          transform = "translateY(-100%)";
        } else if (index === currentIndex) {
          transform = "translateY(0)";
        } else {
          transform = "translateY(100%)";
        }

        return (
          <div
            key={character.id}
            className="absolute inset-0 w-full h-full transition-transform duration-300 ease-out"
            style={{ transform }}
          >
            <CharacterCard
              character={character}
              isActive={index === currentIndex}
              onChatClick={handleChatClick}
            />
          </div>
        );
      })}

      {/* Scroll indicator */}
      {characters.length > 1 && (
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex flex-col space-y-1 z-20">
          {characters.map((_, index) => (
            <div
              key={index}
              className={`w-1 h-8 rounded-full transition-colors duration-200 ${
                index === currentIndex ? "bg-tiktok-red" : "bg-white/30"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
