import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Users, Eye, Heart } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface StoryCardProps {
  story: {
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
  };
  onPlay?: (storyId: number) => void;
  onEdit?: (storyId: number) => void;
  onView?: (storyId: number) => void;
  showActions?: boolean;
  compact?: boolean;
}

export function StoryCard({ 
  story, 
  onPlay, 
  onEdit, 
  onView, 
  showActions = true,
  compact = false 
}: StoryCardProps) {
  const handlePlay = () => onPlay?.(story.id);
  const handleEdit = () => onEdit?.(story.id);
  const handleView = () => onView?.(story.id);

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className={compact ? "pb-2" : ""}>
        <div className="flex justify-between items-start">
          <CardTitle className={`${compact ? "text-lg" : "text-xl"} line-clamp-2`}>
            {story.title}
          </CardTitle>
          {story.genre && (
            <Badge variant="secondary" className="ml-2 shrink-0">
              {story.genre}
            </Badge>
          )}
        </div>
        
        {!compact && story.summary && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
            {story.summary}
          </p>
        )}
      </CardHeader>

      <CardContent className={compact ? "pt-0" : ""}>
        <div className="space-y-3">
          {/* Story Stats */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {story.readingTime && (
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{story.readingTime}min</span>
              </div>
            )}
            
            {story._count?.views && (
              <div className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                <span>{story._count.views}</span>
              </div>
            )}
            
            {story._count?.likes && (
              <div className="flex items-center gap-1">
                <Heart className="h-4 w-4" />
                <span>{story._count.likes}</span>
              </div>
            )}
            
            {story.collaborators && story.collaborators.length > 0 && (
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{story.collaborators.length + 1}</span>
              </div>
            )}
          </div>

          {/* Tags */}
          {!compact && (story.tags || story.emotionalTags) && (
            <div className="flex flex-wrap gap-1">
              {story.tags?.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {story.emotionalTags?.slice(0, 2).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs bg-blue-50">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Author and Date */}
          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <span>by {story.author.name}</span>
            <span>{formatDistanceToNow(new Date(story.createdAt), { addSuffix: true })}</span>
          </div>

          {/* Actions */}
          {showActions && (
            <div className="flex gap-2 pt-2">
              <Button onClick={handlePlay} size="sm" className="flex-1">
                Play
              </Button>
              <Button onClick={handleView} variant="outline" size="sm">
                View
              </Button>
              <Button onClick={handleEdit} variant="ghost" size="sm">
                Edit
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}