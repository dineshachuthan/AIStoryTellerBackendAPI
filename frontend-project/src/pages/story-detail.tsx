import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { apiClient } from '@/lib/api-client';
import { formatDateTime } from '@/lib/utils';

export function StoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const storyId = parseInt(id || '0');

  const { data: story, isLoading, error } = useQuery({
    queryKey: ['story', storyId],
    queryFn: async () => {
      const response = await apiClient.stories.getById(storyId);
      return response.data;
    },
    enabled: !!storyId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Story Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The story you're looking for doesn't exist or has been removed.
          </p>
          <Button asChild>
            <Link href="/stories">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Stories
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button asChild variant="outline" className="mb-4">
          <Link href="/stories">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Stories
          </Link>
        </Button>
        
        <div className="flex items-center gap-4 mb-4">
          <h1 className="text-3xl font-bold">{story.title}</h1>
          <span className={`text-sm px-3 py-1 rounded ${
            story.status === 'published' 
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
          }`}>
            {story.status}
          </span>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>Created: {formatDateTime(story.createdAt)}</span>
          <span>Updated: {formatDateTime(story.updatedAt)}</span>
          {story.genre && <span>Genre: {story.genre}</span>}
          {story.category && <span>Category: {story.category}</span>}
        </div>
      </div>

      <div className="grid gap-6">
        {story.summary && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{story.summary}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Content</CardTitle>
          </CardHeader>
          <CardContent>
            {story.content ? (
              <div className="prose prose-sm max-w-none dark:prose-invert">
                {story.content.split('\n').map((paragraph, index) => (
                  <p key={index} className="mb-4">
                    {paragraph}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground italic">
                No content available. This story is still being written.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Story Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Status:</span>
                <span className="ml-2 text-muted-foreground">{story.status}</span>
              </div>
              <div>
                <span className="font-medium">Processing:</span>
                <span className="ml-2 text-muted-foreground">{story.processingStatus}</span>
              </div>
              <div>
                <span className="font-medium">Public:</span>
                <span className="ml-2 text-muted-foreground">{story.isPublic ? 'Yes' : 'No'}</span>
              </div>
              <div>
                <span className="font-medium">Author ID:</span>
                <span className="ml-2 text-muted-foreground">{story.authorId}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}