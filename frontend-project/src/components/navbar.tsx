import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';

export function Navbar() {
  const [location] = useLocation();
  const { logout, user } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-primary">
              AI Storyteller
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            <Link href="/stories">
              <Button
                variant={location.startsWith('/stories') ? 'default' : 'ghost'}
                size="sm"
              >
                Stories
              </Button>
            </Link>
            
            <Link href="/profile">
              <Button
                variant={location === '/profile' ? 'default' : 'ghost'}
                size="sm"
              >
                Profile
              </Button>
            </Link>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {user?.name || 'User'}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}