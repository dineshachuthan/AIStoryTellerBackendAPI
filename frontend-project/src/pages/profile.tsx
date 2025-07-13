import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { apiClient } from '@/lib/api-client';
import { useAuth } from "@/hooks/use-auth"';
import { useToast } from '@/hooks/use-toast';
import { formatDateTime } from '@/lib/utils';

export function ProfilePage() {
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const { data: stories } = useQuery({
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

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Success",
        description: "Logged out successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to logout",
        variant: "destructive",
      });
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Profile</h1>
        <p className="text-muted-foreground">
          Manage your account and view your activity.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <p className="text-muted-foreground">{user.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <p className="text-muted-foreground">{user.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Language</label>
              <p className="text-muted-foreground">{user.language || 'en'}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Locale</label>
              <p className="text-muted-foreground">{user.locale || 'en-US'}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Member Since</label>
              <p className="text-muted-foreground">{formatDateTime(user.createdAt)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total Stories</span>
              <span className="font-medium">{stories?.length || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Published Stories</span>
              <span className="font-medium">
                {stories?.filter(s => s.status === 'published').length || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Draft Stories</span>
              <span className="font-medium">
                {stories?.filter(s => s.status === 'draft').length || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Voice Recordings</span>
              <span className="font-medium">{voiceRecordings?.length || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Public Stories</span>
              <span className="font-medium">
                {stories?.filter(s => s.isPublic).length || 0}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {stories && stories.length > 0 ? (
              <div className="space-y-3">
                {stories.slice(0, 5).map((story) => (
                  <div key={story.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{story.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(story.updatedAt)}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      story.status === 'published' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                    }`}>
                      {story.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No recent activity.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full">
              Edit Profile
            </Button>
            <Button variant="outline" className="w-full">
              Change Password
            </Button>
            <Button variant="outline" className="w-full">
              Download My Data
            </Button>
            <Button variant="destructive" className="w-full" onClick={handleLogout}>
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}