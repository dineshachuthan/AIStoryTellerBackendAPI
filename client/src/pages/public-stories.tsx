import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";
import { Search, Play, Heart, Clock, Users, Filter } from "lucide-react";
import { BottomNavigation } from "@/components/bottom-navigation";
import { AppTopNavigation } from "@/components/app-top-navigation";
import { formatDistanceToNow } from "date-fns";
import type { Story } from "@shared/schema";
import { getAllGenres, getAllEmotionalTags, getAllMoods, getGenreLabel, getEmotionalTagLabel, getMoodLabel } from "@shared/storyGenres";

interface StoryFilters {
  genre?: string;
  emotionalTags?: string[];
  moodCategory?: string;
  ageRating?: string;
  search?: string;
}

export default function PublicStories() {
  const [, setLocation] = useLocation();
  const [filters, setFilters] = useState<StoryFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  const { data: stories = [], isLoading } = useQuery<Story[]>({
    queryKey: ["/api/stories", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.genre) params.append('genre', filters.genre);
      if (filters.moodCategory) params.append('moodCategory', filters.moodCategory);
      if (filters.ageRating) params.append('ageRating', filters.ageRating);
      if (filters.search) params.append('search', filters.search);
      if (filters.emotionalTags?.length) {
        filters.emotionalTags.forEach(tag => params.append('emotionalTags', tag));
      }
      
      const response = await fetch(`/api/stories?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch stories');
      return response.json();
    },
  });

  const { data: availableFilters } = useQuery({
    queryKey: ["/api/stories/filters"],
    queryFn: async () => {
      const response = await fetch('/api/stories/filters');
      if (!response.ok) throw new Error('Failed to fetch filters');
      return response.json();
    },
  });

  const handlePlayStory = (storyId: number) => {
    setLocation(`/story/${storyId}/play`);
  };

  const handleFilterChange = (key: keyof StoryFilters, value: string | string[] | undefined) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const activeFilterCount = Object.values(filters).filter(v => 
    v && (Array.isArray(v) ? v.length > 0 : true)
  ).length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-white">Loading public stories...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg text-dark-text">
      <AppTopNavigation />
      
      {/* Page Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Users className="w-6 h-6 text-tiktok-pink" />
            <h1 className="text-2xl font-bold text-white">Public Stories</h1>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="border-gray-700 text-gray-300"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="p-4 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search stories by title, summary, or tags..."
            value={filters.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="pl-10 bg-dark-card border-gray-700 text-white"
          />
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <Card className="bg-dark-card border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                Filter Stories
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Clear All
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Genre Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Genre</label>
                <Select value={filters.genre || ''} onValueChange={(value) => 
                  handleFilterChange('genre', value === 'all' ? undefined : value)
                }>
                  <SelectTrigger className="bg-dark-bg border-gray-700">
                    <SelectValue placeholder="All Genres" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Genres</SelectItem>
                    {getAllGenres().map(genre => (
                      <SelectItem key={genre.value} value={genre.value}>
                        {genre.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Mood Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Mood</label>
                <Select value={filters.moodCategory || ''} onValueChange={(value) => 
                  handleFilterChange('moodCategory', value === 'all' ? undefined : value)
                }>
                  <SelectTrigger className="bg-dark-bg border-gray-700">
                    <SelectValue placeholder="All Moods" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Moods</SelectItem>
                    {getAllMoods().map(mood => (
                      <SelectItem key={mood.value} value={mood.value}>
                        {mood.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Age Rating Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Age Rating</label>
                <Select value={filters.ageRating || ''} onValueChange={(value) => 
                  handleFilterChange('ageRating', value === 'all' ? undefined : value)
                }>
                  <SelectTrigger className="bg-dark-bg border-gray-700">
                    <SelectValue placeholder="All Ages" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Ages</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="teen">Teen (13+)</SelectItem>
                    <SelectItem value="mature">Mature (18+)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Emotional Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Emotional Themes</label>
                <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                  {getAllEmotionalTags().slice(0, 8).map(tag => (
                    <Badge
                      key={tag.value}
                      variant={filters.emotionalTags?.includes(tag.value) ? "default" : "outline"}
                      className={`cursor-pointer text-xs ${
                        filters.emotionalTags?.includes(tag.value)
                          ? "bg-tiktok-pink text-white"
                          : "border-gray-700 text-gray-400 hover:bg-gray-800"
                      }`}
                      onClick={() => {
                        const current = filters.emotionalTags || [];
                        const newTags = current.includes(tag.value)
                          ? current.filter(t => t !== tag.value)
                          : [...current, tag.value];
                        handleFilterChange('emotionalTags', newTags.length > 0 ? newTags : undefined);
                      }}
                    >
                      {tag.label}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Stories Grid */}
      <div className="p-4 pb-20">
        {stories.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 mx-auto text-gray-600 mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">No Stories Found</h2>
            <p className="text-gray-400">
              {activeFilterCount > 0 
                ? "Try adjusting your filters to find more stories"
                : "No public stories are available yet"
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stories.map((story: Story) => (
              <Card key={story.id} className="bg-dark-card border-gray-700 hover:border-tiktok-pink/50 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-white text-lg line-clamp-2">
                        {story.title}
                      </CardTitle>
                      <CardDescription className="text-gray-400 mt-1">
                        {story.genre && (
                          <Badge variant="outline" className="text-xs border-gray-700 text-tiktok-cyan mr-2">
                            {getGenreLabel(story.genre)}
                          </Badge>
                        )}
                        {story.moodCategory && (
                          <Badge variant="outline" className="text-xs border-gray-700 text-purple-400">
                            {getMoodLabel(story.moodCategory)}
                          </Badge>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <p className="text-gray-300 text-sm line-clamp-3 mb-4">
                    {story.summary}
                  </p>
                  
                  <div className="flex items-center text-xs text-gray-500 mb-4">
                    <Clock className="w-3 h-3 mr-1" />
                    {story.readingTime ? `${story.readingTime} min read` : '5 min read'} •
                    {story.createdAt ? formatDistanceToNow(new Date(story.createdAt), { addSuffix: true }) : 'Recently'}
                  </div>
                  
                  {/* Emotional Tags */}
                  {story.emotionalTags && story.emotionalTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {story.emotionalTags.slice(0, 3).map((tag, index) => (
                        <Badge 
                          key={index}
                          variant="outline" 
                          className="text-xs border-gray-700 text-gray-400"
                        >
                          {getEmotionalTagLabel(tag)}
                        </Badge>
                      ))}
                      {story.emotionalTags.length > 3 && (
                        <Badge variant="outline" className="text-xs border-gray-700 text-gray-400">
                          +{story.emotionalTags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => handlePlayStory(story.id)}
                      className="bg-tiktok-cyan hover:bg-tiktok-cyan/80 flex-1"
                      size="sm"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Play Story
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-gray-700 text-gray-400 hover:bg-gray-800"
                    >
                      <Heart className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
}