import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AudioLines, LogOut, User, Loader2, Home, BookOpen } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export function AppTopNavigation() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();

  // Get session-based voice cloning status (no automatic polling)
  const { data: voiceCloningStatus } = useQuery({
    queryKey: ["/api/voice-cloning/session-status"],
    enabled: !!user,
    staleTime: 30 * 60 * 1000, // 30 minutes cache duration
    // No automatic polling - status updates only when user clicks or navigates
  });

  const getUserInitials = () => {
    if (!user) return 'U';
    return user.displayName 
      ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase()
      : user.firstName && user.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
      : user.email ? user.email[0].toUpperCase()
      : 'U';
  };

  return (
    <div className="fixed top-0 left-0 right-0 bg-dark-bg/80 backdrop-blur-lg border-b border-gray-800 p-4 z-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 sm:space-x-6">
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            className="text-xl sm:text-2xl font-bold text-white hover:bg-transparent p-0"
          >
            DeeVee
          </Button>
          
          {/* Main Navigation - Hidden on very small screens */}
          <nav className="hidden sm:flex items-center space-x-2">
            <Button
              variant="ghost"
              onClick={() => setLocation("/")}
              className="text-white hover:bg-white/10"
            >
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
            
            <Button
              variant="ghost"
              onClick={() => setLocation("/stories")}
              className="text-white hover:bg-white/10"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              My Stories
            </Button>
          </nav>
        </div>
        
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Mobile Navigation Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild className="sm:hidden">
              <Button variant="ghost" size="sm" className="text-white">
                <BookOpen className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-dark-card border-gray-700">
              <DropdownMenuItem onClick={() => setLocation("/")} className="text-gray-300 hover:text-white">
                <Home className="w-4 h-4 mr-2" />
                Home
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocation("/stories")} className="text-gray-300 hover:text-white">
                <BookOpen className="w-4 h-4 mr-2" />
                My Stories
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            onClick={() => {
              // Users can freely navigate even during cloning
              setLocation("/voice-samples");
            }}
            variant="outline"
            size="sm"
            className={`${
              voiceCloningStatus?.isAnyCloning 
                ? "border-orange-500 text-orange-500 hover:bg-orange-500/20" 
                : "border-tiktok-cyan text-tiktok-cyan hover:bg-tiktok-cyan/20"
            } hidden sm:flex`}
            title={voiceCloningStatus?.isAnyCloning ? "ElevenLabs voice cloning in progress (you can still navigate)" : "Record voice samples for personalized narration"}
          >
            {voiceCloningStatus?.isAnyCloning ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <AudioLines className="w-4 h-4 mr-2" />
            )}
            <span className="hidden lg:inline">{voiceCloningStatus?.navigationButtonLabel || "Voice Samples"}</span>
          </Button>

          <Button
            onClick={async () => {
              try {
                await logout();
                setLocation('/');
              } catch (error) {
                console.error('Logout failed:', error);
              }
            }}
            variant="outline"
            size="sm"
            className="border-red-500 text-red-500 hover:bg-red-500/20 hidden sm:flex"
          >
            <LogOut className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Logout</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="relative h-8 w-8 rounded-full p-0"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage 
                    src={user?.profileImageUrl || undefined} 
                    alt={user?.displayName || user?.email || 'User'} 
                  />
                  <AvatarFallback className="bg-tiktok-red text-white text-xs">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-dark-card border-gray-700">
              {/* Mobile-only menu items */}
              <div className="sm:hidden">
                <DropdownMenuItem
                  onClick={() => setLocation("/voice-samples")}
                  className="text-gray-300 hover:text-white hover:bg-gray-700"
                >
                  <AudioLines className="w-4 h-4 mr-2" />
                  Voice Samples
                </DropdownMenuItem>
              </div>
              
              <DropdownMenuItem 
                onClick={() => window.location.href = '/api/auth/logout'}
                className="text-red-400 hover:bg-gray-700 focus:bg-gray-700"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}