import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { InsertCharacter } from '@shared/schema';

export function useCharacters() {
  return useQuery({
    queryKey: ["/api/characters"],
    queryFn: api.getCharacters,
  });
}

export function useCharacter(id: number) {
  return useQuery({
    queryKey: [`/api/characters/${id}`],
    queryFn: () => api.getCharacter(id),
    enabled: !!id,
  });
}

export function useCreateCharacter() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (character: InsertCharacter) => api.createCharacter(character),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/characters"] });
    },
  });
}

export function useLikeCharacter() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => api.likeCharacter(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/characters"] });
    },
  });
}
