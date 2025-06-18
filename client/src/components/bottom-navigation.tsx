import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Home, Book, Plus, MessageCircle, User } from "lucide-react";

export function BottomNavigation() {
  const [location, setLocation] = useLocation();

  const navItems = [
    { icon: Home, label: "Home", path: "/", active: location === "/" },
    { icon: Book, label: "Stories", path: "/stories", active: location === "/stories" },
    { icon: Plus, label: "Create", path: "/upload-story", active: location === "/upload-story", special: true },
    { icon: MessageCircle, label: "Chats", path: "/chats", active: location === "/chats" },
  ];

  return (
    <nav className="absolute bottom-0 left-0 right-0 bg-dark-card/90 backdrop-blur-sm border-t border-gray-800 z-20">
      <div className="flex items-center justify-around py-3">
        {navItems.map(({ icon: Icon, label, path, active, special }) => (
          <Button
            key={path}
            variant="ghost"
            onClick={() => setLocation(path)}
            className={`flex flex-col items-center space-y-1 px-4 py-2 hover:bg-transparent touch-target ${
              active ? "text-tiktok-red" : "text-gray-text hover:text-dark-text"
            }`}
          >
            {special ? (
              <div className="bg-tiktok-red rounded-lg p-2">
                <Icon className="w-5 h-5 text-white" />
              </div>
            ) : (
              <Icon className="w-6 h-6" />
            )}
            <span className="text-xs">{label}</span>
          </Button>
        ))}
      </div>
    </nav>
  );
}
