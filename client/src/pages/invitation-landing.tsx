import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, UserPlus, Mic, Play, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface InvitationData {
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

export default function InvitationLanding() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);

  // Fetch invitation details
  const { data: invitation, isLoading, error } = useQuery<InvitationData>({
    queryKey: [`/api/invitations/${token}`],
    enabled: !!token,
  });

  useEffect(() => {
    if (error) {
      toast({
        title: "Invalid Invitation",
        description: "This invitation link is invalid or has expired.",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const handleAcceptInvitation = async () => {
    if (!invitation) return;

    try {
      // TODO: Implement accept invitation logic
      toast({
        title: "Invitation Accepted",
        description: "You can now start recording your voice for this character.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to accept invitation. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleStartRecording = () => {
    setIsRecording(true);
    // TODO: Implement voice recording logic
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    setHasRecording(true);
    // TODO: Save recording
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
            <CardTitle className="text-2xl text-white">Invalid Invitation</CardTitle>
            <CardDescription className="text-gray-400">
              This invitation link is invalid or has expired.
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
          <h1 className="text-3xl font-bold text-white">You're Invited!</h1>
          <p className="text-gray-400">
            {invitation.inviter?.firstName || "Someone"} has invited you to participate in a story
          </p>
        </div>

        {/* Story Details */}
        <Card className="bg-dark-card border-gray-800">
          <CardHeader>
            <CardTitle className="text-xl text-white">{invitation.story?.title}</CardTitle>
            {invitation.story?.summary && (
              <CardDescription className="text-gray-400 mt-2">
                {invitation.story.summary}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {invitation.characterName && (
              <div className="bg-gray-900 rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-1">You've been invited to voice:</p>
                <p className="text-lg font-semibold text-tiktok-red">{invitation.characterName}</p>
              </div>
            )}

            {isExpired ? (
              <div className="text-center py-4">
                <p className="text-red-400 mb-4">This invitation has expired.</p>
                <Button variant="outline" className="border-gray-700">
                  Request New Invitation
                </Button>
              </div>
            ) : invitation.status === "pending" ? (
              <div className="space-y-4">
                {!isAuthenticated && (
                  <div className="bg-blue-950/30 border border-blue-800 rounded-lg p-4">
                    <p className="text-blue-300 text-sm mb-2">
                      Sign in to save your recordings and participate in more stories
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
                  className="w-full bg-tiktok-red hover:bg-red-600"
                >
                  Accept Invitation & Continue
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-950/30 border border-green-800 rounded-lg p-4">
                  <p className="text-green-300 text-sm flex items-center">
                    <Check className="w-4 h-4 mr-2" />
                    Invitation accepted
                  </p>
                </div>

                {/* Voice Recording Section */}
                <div className="bg-gray-900 rounded-lg p-6 space-y-4">
                  <h3 className="text-lg font-semibold text-white">Record Your Voice</h3>
                  <p className="text-gray-400 text-sm">
                    Record a short sample of your voice for the character "{invitation.characterName}"
                  </p>

                  <div className="flex justify-center space-x-4">
                    {!hasRecording ? (
                      <Button
                        onClick={isRecording ? handleStopRecording : handleStartRecording}
                        className={isRecording ? "bg-red-600 hover:bg-red-700" : "bg-tiktok-red hover:bg-red-600"}
                      >
                        <Mic className="w-4 h-4 mr-2" />
                        {isRecording ? "Stop Recording" : "Start Recording"}
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          className="border-gray-700"
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Play Recording
                        </Button>
                        <Button
                          onClick={handleStartRecording}
                          variant="outline"
                          className="border-gray-700"
                        >
                          <Mic className="w-4 h-4 mr-2" />
                          Re-record
                        </Button>
                      </>
                    )}
                  </div>

                  {hasRecording && (
                    <Button className="w-full bg-green-600 hover:bg-green-700 mt-4">
                      Submit Voice Recording
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}