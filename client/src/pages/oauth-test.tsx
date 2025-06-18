import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface OAuthDiagnostics {
  environment: string;
  baseUrl: string;
  currentDomain: string;
  googleOAuth: {
    configured: boolean;
    clientId: string;
    callbackUrl: string;
    authUrl: string;
    requiredGoogleCloudSettings: {
      oauthConsentScreen: {
        userType: string;
        publishingStatus: string;
        authorizedDomains: string[];
      };
      credentials: {
        redirectUris: string[];
      };
    };
  };
}

export default function OAuthTest() {
  const [diagnostics, setDiagnostics] = useState<OAuthDiagnostics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/oauth/diagnostics')
      .then(res => res.json())
      .then(data => {
        setDiagnostics(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch diagnostics:', err);
        setLoading(false);
      });
  }, []);

  const testGoogleAuth = () => {
    console.log('Testing Google OAuth...');
    window.location.href = '/api/auth/google';
  };

  const testInNewTab = () => {
    console.log('Testing Google OAuth in new tab...');
    window.open('/api/auth/google', '_blank');
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading diagnostics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>OAuth Configuration Diagnostics</CardTitle>
          <CardDescription>
            Current OAuth setup and required Google Cloud Console settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {diagnostics && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Environment:</label>
                  <Badge variant="outline">{diagnostics.environment}</Badge>
                </div>
                <div>
                  <label className="text-sm font-medium">Base URL:</label>
                  <p className="text-sm">{diagnostics.baseUrl}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Current Domain:</label>
                  <p className="text-sm">{diagnostics.currentDomain}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Google OAuth:</label>
                  <Badge variant={diagnostics.googleOAuth.configured ? "default" : "destructive"}>
                    {diagnostics.googleOAuth.configured ? "Configured" : "Not Configured"}
                  </Badge>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">Google Cloud Console Requirements:</h3>
                
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium">OAuth Consent Screen:</h4>
                    <ul className="text-sm space-y-1 pl-4">
                      <li>• User Type: <code className="bg-gray-100 px-1 rounded">{diagnostics.googleOAuth.requiredGoogleCloudSettings.oauthConsentScreen.userType}</code></li>
                      <li>• Publishing Status: <code className="bg-gray-100 px-1 rounded">{diagnostics.googleOAuth.requiredGoogleCloudSettings.oauthConsentScreen.publishingStatus}</code></li>
                      <li>• Authorized Domains: <code className="bg-gray-100 px-1 rounded">{diagnostics.googleOAuth.requiredGoogleCloudSettings.oauthConsentScreen.authorizedDomains[0]}</code></li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium">OAuth 2.0 Credentials:</h4>
                    <ul className="text-sm space-y-1 pl-4">
                      <li>• Client ID: <code className="bg-gray-100 px-1 rounded">{diagnostics.googleOAuth.clientId}</code></li>
                      <li>• Authorized redirect URIs:</li>
                      {diagnostics.googleOAuth.requiredGoogleCloudSettings.credentials.redirectUris.map((uri, index) => (
                        <li key={index} className="pl-4">- <code className="bg-gray-100 px-1 rounded text-xs">{uri}</code></li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
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
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}