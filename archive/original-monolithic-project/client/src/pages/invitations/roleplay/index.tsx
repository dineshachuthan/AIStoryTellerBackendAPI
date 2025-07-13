import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, UserPlus, Mic, Play, Check, Film } from "lucide-react";
import { toast, toastMessages } from "@/lib/toast-utils";
import { useAuth } from "@/hooks/useAuth";

interface RoleplayInvitationData {
  id: number;
  storyId: number;
  inviterId: string;
  token: string;
  characterId?: number;
  characterName?: string;
  inviteeEmail?: string;
  inviteePhone?: string;
  expiresAt: string;
  status: string;
  roleplayDetails?: {
    scenes: Array<{
      id: string;
      description: string;
      requiredEmotions: string[];
    }>;
  };
  story?: {
    title: string;
    summary?: string;
  };
  inviter?: {
    firstName?: string;
    lastName?: string;
    email: string;
  };
}

export default function RoleplayInvitationLanding() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const [currentScene, setCurrentScene] = useState(0);
  const [recordings, setRecordings] = useState<Map<string, Blob>>(new Map());

  // Fetch roleplay invitation details
  const { data: invitation, isLoading, error } = useQuery<RoleplayInvitationData>({
    queryKey: [`/api/roleplay-invitations/${token}`],
    enabled: !!token,
  });

  useEffect(() => {
    if (error) {
      toast({
        title: "Invalid Invitation",
        description: "This roleplay invitation link is invalid or has expired.",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const handleAcceptInvitation = async () => {
    if (!invitation) return;

    try {
      // TODO: Implement accept roleplay invitation logic
      toast({
        title: "Roleplay Invitation Accepted",
        description: "You can now start recording your character's voice for each scene.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to accept roleplay invitation. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-tiktok-red" />
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Card className="w-full max-w-md bg-dark-card border-gray-800">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-white">Invalid Roleplay Invitation</CardTitle>
            <CardDescription className="text-gray-400">
              This roleplay invitation link is invalid or has expired.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const isExpired = new Date(invitation.expiresAt) < new Date();

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-4xl mx-auto p-6 pt-20 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-white">Join the Roleplay!</h1>
          <p className="text-gray-400">
            {invitation.inviter?.firstName || "Someone"} has invited you to perform in a collaborative roleplay
          </p>
        </div>

        {/* Story & Character Details */}
        <Card className="bg-dark-card border-gray-800">
          <CardHeader>
            <CardTitle className="text-xl text-white flex items-center">
              <Film className="w-5 h-5 mr-2 text-tiktok-red" />
              {invitation.story?.title}
            </CardTitle>
            {invitation.story?.summary && (
              <CardDescription className="text-gray-400 mt-2">
                {invitation.story.summary}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {invitation.characterName && (
              <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-lg p-4 border border-purple-800">
                <p className="text-sm text-gray-400 mb-1">You'll be performing as:</p>
                <p className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                  {invitation.characterName}
                </p>
              </div>
            )}

            {isExpired ? (
              <div className="text-center py-4">
                <p className="text-red-400 mb-4">This roleplay invitation has expired.</p>
                <Button variant="outline" className="border-gray-700">
                  Request New Invitation
                </Button>
              </div>
            ) : invitation.status === "pending" ? (
              <div className="space-y-4">
                {!isAuthenticated && (
                  <div className="bg-blue-950/30 border border-blue-800 rounded-lg p-4">
                    <p className="text-blue-300 text-sm mb-2">
                      Sign in to save your performance and join more roleplays
                    </p>
                    <Button 
                      onClick={() => window.location.href = "/api/login"}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Sign In
                    </Button>
                  </div>
                )}

                <Button 
                  onClick={handleAcceptInvitation}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  Accept Roleplay Invitation & Begin
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-950/30 border border-green-800 rounded-lg p-4">
                  <p className="text-green-300 text-sm flex items-center">
                    <Check className="w-4 h-4 mr-2" />
                    Roleplay invitation accepted - Let's create magic!
                  </p>
                </div>

                {/* Scene Recording Interface */}
                {invitation.roleplayDetails?.scenes && (
                  <div className="bg-gray-900 rounded-lg p-6 space-y-4">
                    <h3 className="text-lg font-semibold text-white">
                      Scene {currentScene + 1} of {invitation.roleplayDetails.scenes.length}
                    </h3>
                    <p className="text-gray-400 text-sm">
                      {invitation.roleplayDetails.scenes[currentScene].description}
                    </p>
                    
                    {/* Emotion requirements */}
                    <div className="flex flex-wrap gap-2">
                      {invitation.roleplayDetails.scenes[currentScene].requiredEmotions.map(emotion => (
                        <span key={emotion} className="px-3 py-1 bg-purple-900/30 text-purple-300 rounded-full text-sm">
                          {emotion}
                        </span>
                      ))}
                    </div>

                    {/* Recording controls */}
                    <div className="flex justify-center space-x-4 mt-6">
                      <Button className="bg-red-600 hover:bg-red-700">
                        <Mic className="w-4 h-4 mr-2" />
                        Record Scene
                      </Button>
                    </div>

                    {/* Scene navigation */}
                    <div className="flex justify-between mt-6">
                      <Button 
                        variant="outline" 
                        className="border-gray-700"
                        disabled={currentScene === 0}
                        onClick={() => setCurrentScene(currentScene - 1)}
                      >
                        Previous Scene
                      </Button>
                      <Button 
                        variant="outline" 
                        className="border-gray-700"
                        disabled={currentScene === invitation.roleplayDetails.scenes.length - 1}
                        onClick={() => setCurrentScene(currentScene + 1)}
                      >
                        Next Scene
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}