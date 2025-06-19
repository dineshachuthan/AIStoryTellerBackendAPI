import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AudioLines, LogOut, User } from "lucide-react";

export function AppTopNavigation() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

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
    <div className="bg-dark-bg/80 backdrop-blur-lg border-b border-gray-800 p-4">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => setLocation("/")}
          className="text-2xl font-bold text-white hover:bg-transparent p-0"
        >
          DeeVee
        </Button>
        
        <div className="flex items-center space-x-3">
          <Button
            onClick={() => setLocation("/voice-samples")}
            variant="outline"
            size="sm"
            className="border-tiktok-cyan text-tiktok-cyan hover:bg-tiktok-cyan/20"
          >
            <AudioLines className="w-4 h-4 mr-2" />
            Voice Samples
          </Button>

          <Button
            onClick={() => window.location.href = '/api/auth/logout'}
            variant="outline"
            size="sm"
            className="border-red-500 text-red-500 hover:bg-red-500/20"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
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
              <DropdownMenuItem 
                onClick={() => setLocation("/profile")}
                className="text-white hover:bg-gray-700 focus:bg-gray-700"
              >
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
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