import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { formatDate } from '@/lib/utils';

export function HomePage() {
  const { user } = useAuth();
  
  const { data: stories, isLoading } = useQuery({
    queryKey: ['stories'],
    queryFn: async () => {
      const response = await apiClient.stories.getAll();
      return response.data;
    },
  });

  const { data: voiceRecordings } = useQuery({
    queryKey: ['voice-recordings', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await apiClient.voice.getRecordings(user.id);
      return response.data;
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.name}!</h1>
        <p className="text-muted-foreground">
          Continue your storytelling journey or create something new.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Stories</span>
                <span className="font-medium">{stories?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Voice Recordings</span>
                <span className="font-medium">{voiceRecordings?.length || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild className="w-full">
              <Link href="/stories">
                <Plus className="w-4 h-4 mr-2" />
                Create New Story
              </Link>
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link href="/profile">
                View Profile
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Recent Stories</h2>
          <Button asChild variant="outline">
            <Link href="/stories">View All</Link>
          </Button>
        </div>

        {stories && stories.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {stories.slice(0, 6).map((story) => (
              <Card key={story.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">{story.title}</CardTitle>
                  <CardDescription>
                    {story.genre && <span className="text-xs">{story.genre}</span>}
                    {story.genre && story.category && <span className="text-xs"> • </span>}
                    {story.category && <span className="text-xs">{story.category}</span>}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {story.summary && (
                    <p className="text-sm text-muted-foreground mb-4">
                      {story.summary.length > 100 
                        ? `${story.summary.substring(0, 100)}...` 
                        : story.summary
                      }
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {formatDate(story.createdAt)}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        story.status === 'published' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                      }`}>
                        {story.status}
                      </span>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/stories/${story.id}`}>View</Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                You haven't created any stories yet.
              </p>
              <Button asChild>
                <Link href="/stories">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Story
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}