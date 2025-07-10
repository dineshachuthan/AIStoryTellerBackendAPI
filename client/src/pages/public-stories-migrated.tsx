/**
 * Example of migrated component using centralized API client
 * This shows how to migrate from direct fetch calls to using the API client
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";
import { Search, Play, Heart, Clock, Users, Filter } from "lucide-react";
import { AppTopNavigation } from "@/components/app-top-navigation";
import { formatDistanceToNow } from "date-fns";
import type { Story } from '@shared/schema/schema';
import { getAllGenres, getAllEmotionalTags, getAllMoods, getGenreLabel, getEmotionalTagLabel, getMoodLabel } from '@shared/constants/storyGenres';

// NEW: Import the API client and custom hooks
import { apiClient } from "@/lib/api-client";
import { useStories } from "@/hooks/use-api";

interface StoryFilters {
  genre?: string;
  emotionalTags?: string[];
  moodCategory?: string;
  ageRating?: string;
  search?: string;
}

export default function PublicStoriesMigrated() {
  const [, setLocation] = useLocation();
  const [filters, setFilters] = useState<StoryFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  // OPTION 1: Using the custom hook (simplest approach for basic listing)
  // const { data: stories = [], isLoading } = useStories();

  // OPTION 2: Using the API client directly with filters
  // Now properly using the updated API client that supports filters
  const { data: stories = [], isLoading } = useQuery<Story[]>({
    queryKey: ["/api/stories", filters],
    queryFn: () => apiClient.stories.list(filters),
  });

  // Using API client for filters endpoint
  const { data: availableFilters } = useQuery({
    queryKey: ["/api/stories/filters"],
    queryFn: () => apiClient.stories.getFilters(),
  });

  const handlePlayStory = (storyId: number) => {
    setLocation(`/story/${storyId}/play`);
  };

  // Rest of the component remains the same...
  return (
    <div className="min-h-screen bg-background">
      <AppTopNavigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">Public Stories</h1>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>

          {/* Filters section */}
          {showFilters && (
            <Card>
              <CardHeader>
                <CardTitle>Filter Stories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filter controls... */}
              </CardContent>
            </Card>
          )}

          {/* Stories grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (
              <div className="col-span-full text-center py-8">
                Loading stories...
              </div>
            ) : stories.length === 0 ? (
              <div className="col-span-full text-center py-8">
                No stories found matching your filters.
              </div>
            ) : (
              stories.map((story) => (
                <Card key={story.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle>{story.title}</CardTitle>
                    <CardDescription>
                      By {story.userId} • {formatDistanceToNow(new Date(story.createdAt))} ago
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      className="w-full"
                      onClick={() => handlePlayStory(story.id)}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Play Story
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}