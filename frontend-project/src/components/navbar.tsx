import { Link, useLocation } from 'wouter';
import { BookOpen, Home, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

export function Navbar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { toast } = useToast();

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

  const isActive = (path: string) => location === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2">
              <BookOpen className="w-6 h-6" />
              <span className="font-bold text-xl">StoryTeller</span>
            </Link>
            
            <div className="hidden md:flex items-center space-x-4">
              <Link href="/">
                <Button 
                  variant={isActive('/') ? 'default' : 'ghost'}
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <Home className="w-4 h-4" />
                  <span>Home</span>
                </Button>
              </Link>
              
              <Link href="/stories">
                <Button 
                  variant={isActive('/stories') ? 'default' : 'ghost'}
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Stories</span>
                </Button>
              </Link>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {user?.name}
            </span>
            
            <Link href="/profile">
              <Button 
                variant={isActive('/profile') ? 'default' : 'ghost'}
                size="sm"
                className="flex items-center space-x-2"
              >
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Profile</span>
              </Button>
            </Link>
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleLogout}
              className="flex items-center space-x-2"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}