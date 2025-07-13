import { StoryCard } from "./StoryCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Search } from "lucide-react";

interface StoryGridProps {
  stories: Array<{
    id: number;
    title: string;
    summary?: string;
    genre?: string;
    readingTime?: number;
    createdAt: string;
    author: {
      name: string;
      email: string;
    };
    collaborators?: Array<{
      name: string;
      email: string;
    }>;
    _count?: {
      likes: number;
      views: number;
    };
    tags?: string[];
    emotionalTags?: string[];
  }>;
  loading?: boolean;
  error?: string;
  onPlay?: (storyId: number) => void;
  onEdit?: (storyId: number) => void;
  onView?: (storyId: number) => void;
  columns?: 1 | 2 | 3 | 4;
  compact?: boolean;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
}

export function StoryGrid({
  stories,
  loading = false,
  error,
  onPlay,
  onEdit,
  onView,
  columns = 3,
  compact = false,
  emptyMessage = "No stories found",
  emptyIcon
}: StoryGridProps) {
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
  };

  if (loading) {
    return (
      <div className={`grid ${gridCols[columns]} gap-6`}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-20 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-16" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (stories.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mb-4">
          {emptyIcon || <Search className="h-12 w-12 mx-auto text-muted-foreground" />}
        </div>
        <h3 className="text-lg font-semibold mb-2">No Stories Found</h3>
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`grid ${gridCols[columns]} gap-6`}>
      {stories.map((story) => (
        <StoryCard
          key={story.id}
          story={story}
          onPlay={onPlay}
          onEdit={onEdit}
          onView={onView}
          compact={compact}
        />
      ))}
    </div>
  );
}