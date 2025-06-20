import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Search, X, Filter } from "lucide-react";
import { useState } from "react";

interface StoryFiltersProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedGenre: string;
  onGenreChange: (genre: string) => void;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  selectedEmotion: string;
  onEmotionChange: (emotion: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  availableGenres: string[];
  availableTags: string[];
  availableEmotions: string[];
  className?: string;
}

export function StoryFilters({
  searchTerm,
  onSearchChange,
  selectedGenre,
  onGenreChange,
  selectedTags,
  onTagsChange,
  selectedEmotion,
  onEmotionChange,
  sortBy,
  onSortChange,
  availableGenres,
  availableTags,
  availableEmotions,
  className
}: StoryFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter(t => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  const clearAllFilters = () => {
    onSearchChange("");
    onGenreChange("");
    onTagsChange([]);
    onEmotionChange("");
    onSortChange("recent");
  };

  const hasActiveFilters = searchTerm || selectedGenre || selectedTags.length > 0 || selectedEmotion || sortBy !== "recent";

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search stories, characters, or themes..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 pr-4"
        />
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={selectedGenre} onValueChange={onGenreChange}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Genre" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Genres</SelectItem>
            {availableGenres.map((genre) => (
              <SelectItem key={genre} value={genre}>
                {genre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Most Recent</SelectItem>
            <SelectItem value="popular">Most Popular</SelectItem>
            <SelectItem value="title">Title A-Z</SelectItem>
            <SelectItem value="reading-time">Reading Time</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          Advanced
        </Button>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="gap-2 text-muted-foreground"
          >
            <X className="h-4 w-4" />
            Clear All
          </Button>
        )}
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <>
          <Separator />
          <div className="space-y-4">
            {/* Emotion Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Emotion</label>
              <Select value={selectedEmotion} onValueChange={onEmotionChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by emotion" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Emotions</SelectItem>
                  {availableEmotions.map((emotion) => (
                    <SelectItem key={emotion} value={emotion}>
                      {emotion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tags Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Tags</label>
              <div className="flex flex-wrap gap-2">
                {availableTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer hover:bg-primary/10"
                    onClick={() => handleTagToggle(tag)}
                  >
                    {tag}
                    {selectedTags.includes(tag) && (
                      <X className="h-3 w-3 ml-1" />
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 pt-2">
          {searchTerm && (
            <Badge variant="secondary" className="gap-1">
              Search: {searchTerm}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onSearchChange("")}
              />
            </Badge>
          )}
          {selectedGenre && (
            <Badge variant="secondary" className="gap-1">
              Genre: {selectedGenre}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onGenreChange("")}
              />
            </Badge>
          )}
          {selectedEmotion && (
            <Badge variant="secondary" className="gap-1">
              Emotion: {selectedEmotion}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onEmotionChange("")}
              />
            </Badge>
          )}
          {selectedTags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              Tag: {tag}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleTagToggle(tag)}
              />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}