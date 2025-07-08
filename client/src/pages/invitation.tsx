import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Mic, Camera, User, Mail, CheckCircle, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { apiClient } from "@/lib/api-client";

interface InvitationDetails {
  instanceTitle: string;
  characterName: string;
  templateTitle: string;
  genre: string;
  estimatedDuration: number;
  requiredEmotions: Array<{
    emotion: string;
    intensity: number;
    sampleCount: number;
    completed: boolean;
  }>;
  invitationStatus: string;
}

export default function Invitation() {
  const { token } = useParams();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [acceptedAsGuest, setAcceptedAsGuest] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [photoUploaded, setPhotoUploaded] = useState(false);

  useEffect(() => {
    if (token) {
      fetchInvitationDetails();
    }
  }, [token]);

  const fetchInvitationDetails = async () => {
    try {
      setLoading(true);
      const data = await apiClient.invitations.get(token!);
      if (data) {
        setInvitation(data);
        
        // Calculate progress based on completed emotions
        const completedCount = data.requiredEmotions.filter((e: any) => e.completed).length;
        setRecordingProgress((completedCount / data.requiredEmotions.length) * 100);
      } else {
        toast({
          title: "Error",
          description: "Invalid or expired invitation link",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load invitation details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const acceptInvitationAsRegistered = async () => {
    try {
      await apiClient.invitations.accept(token!);
      toast({
        title: "Success",
        description: "Invitation accepted! You can now record your voice samples.",
      });
      fetchInvitationDetails();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to accept invitation",
        variant: "destructive",
      });
    }
  };

  const acceptInvitationAsGuest = async () => {
    if (!guestName.trim()) {
      toast({
        title: "Error",
        description: "Please enter your name",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`/api/invitations/${token}/accept-guest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestName, guestEmail }),
      });

      if (response.ok) {
        setAcceptedAsGuest(true);
        toast({
          title: "Success",
          description: "Welcome! You can now record your voice samples.",
        });
        fetchInvitationDetails();
      } else {
        toast({
          title: "Error",
          description: "Failed to accept invitation",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to accept invitation",
        variant: "destructive",
      });
    }
  };

  const handleVoiceRecording = async (emotion: string) => {
    // This would trigger the voice recording component
    toast({
      title: "Voice Recording",
      description: `Starting recording for ${emotion} emotion...`,
    });
    
    // Placeholder for actual voice recording implementation
    // In a real implementation, this would open a recording interface
    const audioUrl = `placeholder-audio-${emotion}-${Date.now()}.wav`;
    
    try {
      const response = await fetch(`/api/invitations/${token}/submit-voice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emotion, audioUrl }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `Voice sample for ${emotion} recorded successfully!`,
        });
        fetchInvitationDetails();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit voice recording",
        variant: "destructive",
      });
    }
  };

  const handlePhotoUpload = async () => {
    // This would trigger the photo upload component
    toast({
      title: "Photo Upload",
      description: "Opening camera for character photo...",
    });
    
    // Placeholder for actual photo upload implementation
    const photoUrl = `placeholder-photo-${Date.now()}.jpg`;
    
    try {
      const response = await fetch(`/api/invitations/${token}/submit-photo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrl }),
      });

      if (response.ok) {
        setPhotoUploaded(true);
        toast({
          title: "Success",
          description: "Character photo uploaded successfully!",
        });
        fetchInvitationDetails();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload photo",
        variant: "destructive",
      });
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Invalid Invitation</CardTitle>
            <CardDescription>
              This invitation link is invalid or has expired.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const isAccepted = invitation.invitationStatus === "accepted";
  const canRecord = isAccepted && (user || acceptedAsGuest);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <CardTitle className="text-2xl">You're Invited to Roleplay!</CardTitle>
                <CardDescription>
                  Join <strong>{invitation.instanceTitle}</strong> as <strong>{invitation.characterName}</strong>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Story Details */}
        <Card>
          <CardHeader>
            <CardTitle>Story Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">Template</Label>
                <p className="font-semibold">{invitation.templateTitle}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">Genre</Label>
                <Badge variant="secondary">{invitation.genre}</Badge>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">Duration</Label>
                <p className="font-semibold">{Math.round(invitation.estimatedDuration / 60)} minutes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Accept Invitation */}
        {!isAccepted && (
          <Card>
            <CardHeader>
              <CardTitle>Accept Invitation</CardTitle>
              <CardDescription>
                Choose how you'd like to participate in this roleplay
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {user ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <div>
                      <p className="font-medium">Welcome back, {user.email}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        You're logged in and ready to participate with full features
                      </p>
                    </div>
                  </div>
                  <Button onClick={acceptInvitationAsRegistered} className="w-full">
                    Accept Invitation
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Sign In</CardTitle>
                        <CardDescription>Full access to all features</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button asChild className="w-full">
                          <a href="/api/auth/google">Sign in with Google</a>
                        </Button>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Join as Guest</CardTitle>
                        <CardDescription>Limited to this story only</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <Label htmlFor="guestName">Your Name *</Label>
                          <Input
                            id="guestName"
                            value={guestName}
                            onChange={(e) => setGuestName(e.target.value)}
                            placeholder="Enter your name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="guestEmail">Email (optional)</Label>
                          <Input
                            id="guestEmail"
                            type="email"
                            value={guestEmail}
                            onChange={(e) => setGuestEmail(e.target.value)}
                            placeholder="your@email.com"
                          />
                        </div>
                        <Button onClick={acceptInvitationAsGuest} className="w-full">
                          Join as Guest
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Recording Interface */}
        {canRecord && (
          <>
            {/* Progress Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Recording Progress</CardTitle>
                <CardDescription>
                  Complete all voice samples and upload a character photo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Voice Samples</span>
                    <span>{invitation.requiredEmotions.filter(e => e.completed).length} / {invitation.requiredEmotions.length}</span>
                  </div>
                  <Progress value={recordingProgress} />
                </div>
              </CardContent>
            </Card>

            {/* Voice Recording */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="w-5 h-5" />
                  Voice Samples Required
                </CardTitle>
                <CardDescription>
                  Record your voice expressing these emotions for your character
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {invitation.requiredEmotions.map((emotion) => (
                    <Card key={emotion.emotion} className={emotion.completed ? "border-green-200 bg-green-50 dark:bg-green-900/20" : ""}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium capitalize">{emotion.emotion}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Intensity: {emotion.intensity}/10
                            </p>
                          </div>
                          {emotion.completed ? (
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleVoiceRecording(emotion.emotion)}
                            >
                              <Mic className="w-4 h-4 mr-1" />
                              Record
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Photo Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  Character Photo
                </CardTitle>
                <CardDescription>
                  Upload a photo to represent your character in the final video
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                  {photoUploaded ? (
                    <div className="text-center">
                      <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400 mx-auto mb-2" />
                      <p className="font-medium">Photo uploaded successfully!</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Camera className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="mb-4">Upload your character photo</p>
                      <Button onClick={handlePhotoUpload}>
                        Upload Photo
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Guest Limitations Notice */}
        {acceptedAsGuest && (
          <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">Guest Access</p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    As a guest, your recordings are temporary and only accessible for this story. 
                    Create an account to save your progress and access all features.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}