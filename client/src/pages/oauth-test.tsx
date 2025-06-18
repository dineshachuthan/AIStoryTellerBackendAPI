import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function OAuthTest() {
  const testGoogleAuth = () => {
    console.log('Testing Google OAuth...');
    // Direct navigation instead of iframe
    window.location.href = '/api/auth/google';
  };

  const testInNewTab = () => {
    console.log('Testing Google OAuth in new tab...');
    window.open('/api/auth/google', '_blank');
  };

  return (
    <div className="container mx-auto p-4">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>OAuth Test Page</CardTitle>
          <CardDescription>
            Test Google OAuth authentication methods
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Button 
              onClick={testGoogleAuth} 
              className="w-full"
              variant="default"
            >
              Test Google OAuth (Same Tab)
            </Button>
            
            <Button 
              onClick={testInNewTab} 
              className="w-full"
              variant="outline"
            >
              Test Google OAuth (New Tab)
            </Button>
            
            <div className="pt-4">
              <p className="text-sm text-muted-foreground">
                Current URL: {window.location.href}
              </p>
              <p className="text-sm text-muted-foreground">
                OAuth Endpoint: {window.location.origin}/api/auth/google
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}