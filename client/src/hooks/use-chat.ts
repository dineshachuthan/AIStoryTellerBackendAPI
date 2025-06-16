import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useConversation(id: number) {
  return useQuery({
    queryKey: [`/api/conversations/${id}`],
    enabled: !!id,
  });
}

export function useMessages(conversationId: number) {
  return useQuery({
    queryKey: [`/api/conversations/${conversationId}/messages`],
    queryFn: () => api.getMessages(conversationId),
    enabled: !!conversationId,
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ characterId, userId }: { characterId: number; userId: string }) => 
      api.createConversation(characterId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ conversationId, content }: { conversationId: number; content: string }) => 
      api.sendMessage(conversationId, content),
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/conversations/${conversationId}/messages`] 
      });
    },
  });
}
