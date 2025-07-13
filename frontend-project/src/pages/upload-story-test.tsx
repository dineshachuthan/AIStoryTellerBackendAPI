import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function UploadStoryTest() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-dark-bg text-white p-4">
      <Card className="bg-dark-card border-gray-800 max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/stories")}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Stories
            </Button>
          </div>
          <CardTitle className="text-white text-2xl">Upload Story - Test Page</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400">
            This is a test page to verify routing is working correctly.
          </p>
          <div className="mt-4">
            <Button 
              onClick={() => setLocation("/stories")}
              className="bg-tiktok-cyan hover:bg-tiktok-cyan/80 text-black"
            >
              Go to Stories
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}