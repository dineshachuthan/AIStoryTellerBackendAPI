import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/utils';

export function StoriesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newStoryTitle, setNewStoryTitle] = useState('');

  const { data: stories, isLoading } = useQuery({
    queryKey: ['stories'],
    queryFn: async () => {
      const response = await apiClient.stories.getAll();
      return response.data;
    },
  });

  const createStoryMutation = useMutation({
    mutationFn: apiClient.stories.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      toast({
        title: "Success",
        description: "Story created successfully!",
      });
      setIsCreating(false);
      setNewStoryTitle('');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create story",
        variant: "destructive",
      });
    },
  });

  const handleCreateStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoryTitle.trim()) return;

    await createStoryMutation.mutateAsync({
      title: newStoryTitle,
      content: '',
      authorId: user?.id || 1,
      status: 'draft',
      processingStatus: 'pending',
      isPublic: false,
    });
  };

  const filteredStories = stories?.filter(story =>
    story.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    story.summary?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold">My Stories</h1>
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Story
          </Button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input
            type="text"
            placeholder="Search stories..."
            className="w-full pl-10 pr-4 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {isCreating && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create New Story</CardTitle>
            <CardDescription>
              Enter a title for your new story to get started.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateStory} className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium mb-1">
                  Story Title
                </label>
                <input
                  id="title"
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  value={newStoryTitle}
                  onChange={(e) => setNewStoryTitle(e.target.value)}
                  placeholder="Enter your story title..."
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  disabled={createStoryMutation.isPending || !newStoryTitle.trim()}
                >
                  {createStoryMutation.isPending && <LoadingSpinner size="sm" className="mr-2" />}
                  Create Story
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsCreating(false);
                    setNewStoryTitle('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {filteredStories && filteredStories.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredStories.map((story) => (
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
              {searchTerm ? 'No stories found matching your search.' : 'You haven\'t created any stories yet.'}
            </p>
            {!searchTerm && (
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Story
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}