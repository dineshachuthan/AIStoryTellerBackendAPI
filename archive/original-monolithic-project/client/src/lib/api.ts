import { apiRequest } from "./queryClient";
import type { Character, InsertCharacter, Conversation, Message } from '@shared/schema/schema';

export const api = {
  // Characters
  getCharacters: async (): Promise<Character[]> => {
    const response = await apiRequest("GET", "/api/characters");
    return await response.json();
  },

  getCharacter: async (id: number): Promise<Character> => {
    const response = await apiRequest("GET", `/api/characters/${id}`);
    return await response.json();
  },

  createCharacter: async (character: InsertCharacter): Promise<Character> => {
    const response = await apiRequest("POST", "/api/characters", character);
    return await response.json();
  },

  likeCharacter: async (id: number): Promise<{ likes: number }> => {
    const response = await apiRequest("POST", `/api/characters/${id}/like`);
    return await response.json();
  },

  // Conversations
  getConversations: async (userId: string): Promise<Conversation[]> => {
    const response = await apiRequest("GET", `/api/conversations?userId=${userId}`);
    return await response.json();
  },

  createConversation: async (characterId: number, userId: string): Promise<Conversation> => {
    const response = await apiRequest("POST", "/api/conversations", {
      characterId,
      userId,
    });
    return await response.json();
  },

  // Messages
  getMessages: async (conversationId: number): Promise<Message[]> => {
    const response = await apiRequest("GET", `/api/conversations/${conversationId}/messages`);
    return await response.json();
  },

  sendMessage: async (conversationId: number, content: string): Promise<{ userMessage: Message; aiMessage?: Message }> => {
    const response = await apiRequest("POST", `/api/conversations/${conversationId}/messages`, {
      content,
      isAi: false,
    });
    return await response.json();
  },
};
