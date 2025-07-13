import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { UserProfile } from "@/components/user-profile";
import { Home, Book, Upload, Mic } from "lucide-react";

export function AppHeader() {
  return (
    <header className="border-b bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <Link href="/">
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent cursor-pointer">
                StoryTeller AI
              </h1>
            </Link>
            
            <nav className="hidden md:flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-sm">
                  <Home className="h-4 w-4 mr-2" />
                  Home
                </Button>
              </Link>
              <Link href="/stories">
                <Button variant="ghost" size="sm" className="text-sm">
                  <Book className="h-4 w-4 mr-2" />
                  Library
                </Button>
              </Link>
              <Link href="/upload-story">
                <Button variant="ghost" size="sm" className="text-sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Button>
              </Link>
              <Link href="/voice-setup">
                <Button variant="ghost" size="sm" className="text-sm">
                  <Mic className="h-4 w-4 mr-2" />
                  Voice Setup
                </Button>
              </Link>
            </nav>
          </div>

          <div className="flex items-center space-x-2">
            <UserProfile />
          </div>
        </div>
      </div>
    </header>
  );
}