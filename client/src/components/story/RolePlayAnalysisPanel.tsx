import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CharacterInviteCard } from "./CharacterInviteCard";
import { 
  Play, 
  Edit, 
  Save, 
  Plus, 
  Clock, 
  MapPin, 
  Users, 
  Film, 
  Loader2,
  RefreshCw,
  Send,
  UserPlus,
  Mail,
  Phone,
  Copy,
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertCircle,
  X,
  DollarSign,
  AlertTriangle
} from "lucide-react";
import { VideoPlayer } from '@/components/ui/video-player';

interface DialogueLine {
  characterName: string;
  dialogue: string;
  emotion: string;
  intensity: number;
  action?: string;
}

interface SceneBackground {
  location: string;
  timeOfDay: string;
  atmosphere: string;
  visualDescription: string;
  soundscape?: string;
  lighting?: string;
}

interface RolePlayScene {
  sceneNumber: number;
  title: string;
  background: SceneBackground;
  dialogueSequence: DialogueLine[];
  stageDirections: string[];
  estimatedDuration: number;
  emotionalTone: string;
}

interface RolePlayAnalysis {
  title: string;
  genre: string;
  overallTone: string;
  totalScenes: number;
  estimatedPlaytime: number;
  scenes: RolePlayScene[];
  characters: Array<{
    name: string;
    role: string;
    personality: string;
    voiceProfile: string;
    costumeSuggestion?: string;
  }>;
  productionNotes: string[];
}

interface RolePlayAnalysisPanelProps {
  storyId: number;
  storyContent: string;
  existingCharacters?: any[];
  existingAnalysis?: RolePlayAnalysis | null;
  onAnalysisGenerated?: (analysis: RolePlayAnalysis) => void;
}

export function RolePlayAnalysisPanel({
  storyId,
  storyContent,
  existingCharacters = [],
  existingAnalysis = null,
  onAnalysisGenerated
}: RolePlayAnalysisPanelProps) {
  const { toast } = useToast();
  const [analysis, setAnalysis] = useState<RolePlayAnalysis | null>(existingAnalysis);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingScene, setEditingScene] = useState<number | null>(null);
  const [editedScene, setEditedScene] = useState<RolePlayScene | null>(null);

  // Update analysis when existingAnalysis prop changes
  useEffect(() => {
    if (existingAnalysis) {
      setAnalysis(existingAnalysis);
    }
  }, [existingAnalysis]);
  
  // Invitation system state
  const [characterInvitations, setCharacterInvitations] = useState<Map<string, {
    id: string;
    contactValue: string;
    contactMethod: string;
    hasVoiceRecording: boolean;
    invitationToken: string;
    sentAt: Date;
  }>>(new Map());
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    invitationName: "",
    contactMethod: "email" as "email" | "phone",
    contactValue: "",
    characterAssignments: {} as { [characterName: string]: string }
  });
  const [sendingInvitation, setSendingInvitation] = useState(false);

  // Video generation state
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [videoResult, setVideoResult] = useState<any>(null);
  const [showCostWarning, setShowCostWarning] = useState(false);
  const [videoStatusMessage, setVideoStatusMessage] = useState<string>("");

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedAnalysis, setEditedAnalysis] = useState<RolePlayAnalysis | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [hasMetadataChanges, setHasMetadataChanges] = useState(false);

  // Use existing analysis if provided
  useEffect(() => {
    if (existingAnalysis && !analysis) {
      setAnalysis(existingAnalysis);
      setEditedAnalysis(JSON.parse(JSON.stringify(existingAnalysis))); // Deep copy for editing
    }
  }, [existingAnalysis, analysis]);

  // Check for existing video when component loads
  useEffect(() => {
    const checkExistingVideo = async () => {
      if (!storyId || videoResult) return;
      
      try {
        const result = await apiRequest(`/api/videos/story/${storyId}`);
        if (result && result.videoUrl) {
          setVideoResult(result);
        }
      } catch (error) {
        // No existing video found, which is normal
        console.log("No existing video found for story", storyId);
      }
    };

    checkExistingVideo();
  }, [storyId, videoResult]);

  // Function to check if metadata has changed (excluding dialogues)
  const hasNonDialogueChanges = (original: RolePlayAnalysis | null, edited: RolePlayAnalysis | null): boolean => {
    if (!original || !edited) return false;
    
    // Check metadata fields that would require video regeneration
    const metadataFields = ['title', 'genre', 'estimatedDuration', 'sceneCount'];
    for (const field of metadataFields) {
      if (original[field as keyof RolePlayAnalysis] !== edited[field as keyof RolePlayAnalysis]) {
        return true;
      }
    }
    
    // Check character changes (excluding dialogue text)
    if (original.characters.length !== edited.characters.length) return true;
    
    for (let i = 0; i < original.characters.length; i++) {
      const origChar = original.characters[i];
      const editChar = edited.characters[i];
      
      // Check character metadata (not dialogue content)
      if (origChar.name !== editChar.name ||
          origChar.role !== editChar.role ||
          origChar.personality !== editChar.personality ||
          origChar.voiceProfile !== editChar.voiceProfile) {
        return true;
      }
    }
    
    // Check scene metadata (not dialogue content)
    if (original.scenes.length !== edited.scenes.length) return true;
    
    for (let i = 0; i < original.scenes.length; i++) {
      const origScene = original.scenes[i];
      const editScene = edited.scenes[i];
      
      if (origScene.title !== editScene.title ||
          origScene.background?.location !== editScene.background?.location ||
          origScene.emotionalTone !== editScene.emotionalTone ||
          origScene.estimatedDuration !== editScene.estimatedDuration) {
        return true;
      }
    }
    
    return false;
  };

  // Track metadata changes when editing
  useEffect(() => {
    if (analysis && editedAnalysis) {
      const hasChanges = hasNonDialogueChanges(analysis, editedAnalysis);
      setHasMetadataChanges(hasChanges);
    }
  }, [analysis, editedAnalysis]);

  // Always show generate/regenerate video button
  const shouldShowGenerateButton = true;

  // Video generation function with cost control
  const generateVideo = async (forceRegenerate: boolean = false) => {
    if (!analysis) return;

    setGeneratingVideo(true);
    try {
      // Ensure clean serializable data
      const requestData = {
        storyId: Number(storyId),
        quality: 'standard' as const,
        forceRegenerate: Boolean(forceRegenerate)
      };
      
      console.log('Video generation request:', requestData);

      const result = await apiRequest(`/api/videos/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      setVideoResult(result);
      
      if (result.cacheHit) {
        setVideoStatusMessage("Video retrieved from library - using existing video to save costs");
      } else if (result.status === 'pending_approval') {
        setVideoStatusMessage("Video generated - pending review. Please review and approve the generated video");
      } else {
        if (forceRegenerate) {
          setVideoStatusMessage("Video regenerated successfully - new version created");
        } else {
          setVideoStatusMessage("Video generated successfully with AI video generation");
        }
      }
    } catch (error: any) {
      console.error("Video generation failed:", error);
      setVideoStatusMessage(`Video generation failed: ${error.message || "Failed to generate video"}`);
    } finally {
      setGeneratingVideo(false);
      setShowCostWarning(false);
    }
  };

  // Video approval functions
  const approveVideo = async () => {
    if (!storyId) return;

    try {
      const result = await apiRequest(`/api/videos/approve/${storyId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      setVideoResult(result);
      setVideoStatusMessage("Video approved and saved successfully");
    } catch (error: any) {
      console.error("Video approval failed:", error);
      setVideoStatusMessage(`Video approval failed: ${error.message || "Failed to approve video"}`);
    }
  };

  const rejectVideo = async () => {
    if (!storyId) return;

    try {
      await apiRequest(`/api/videos/reject/${storyId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Video quality not acceptable' })
      });

      setVideoResult(null);
      setVideoStatusMessage("Video rejected - you can generate a new one");
    } catch (error: any) {
      console.error("Video rejection failed:", error);
      setVideoStatusMessage(`Video rejection failed: ${error.message || "Failed to reject video"}`);
    }
  };

  // Handle video generation with cost warning for regeneration
  const handleGenerateVideoClick = () => {
    if (videoResult) {
      // If video exists, show cost warning for regeneration
      setShowCostWarning(true);
    } else {
      // If no video exists, generate directly
      generateVideo(false);
    }
  };

  // Edit mode functions
  const enterEditMode = () => {
    if (analysis) {
      setIsEditMode(true);
      setEditedAnalysis(JSON.parse(JSON.stringify(analysis))); // Deep copy
      setHasUnsavedChanges(false);
    }
  };

  const exitEditMode = () => {
    setIsEditMode(false);
    setEditedAnalysis(null);
    setHasUnsavedChanges(false);
  };

  const saveChanges = async () => {
    if (!editedAnalysis) return;

    try {
      // Save edited analysis to database as user customization
      await apiRequest(`/api/stories/${storyId}/roleplay/customization`, "PUT", {
        customizedAnalysis: editedAnalysis
      });

      // Update the current analysis with edited version
      setAnalysis(editedAnalysis);
      setIsEditMode(false);
      setHasUnsavedChanges(false);

      toast({
        title: "Changes Saved",
        description: "Your roleplay customizations have been saved",
      });
    } catch (error: any) {
      console.error("Failed to save changes:", error);
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save changes",
        variant: "destructive",
      });
    }
  };

  const updateAnalysisField = (field: string, value: any) => {
    if (!editedAnalysis) return;
    
    setEditedAnalysis(prev => ({
      ...prev!,
      [field]: value
    }));
    setHasUnsavedChanges(true);
  };

  const updateScene = (sceneIndex: number, updatedScene: RolePlayScene) => {
    if (!editedAnalysis) return;

    const updatedScenes = [...editedAnalysis.scenes];
    updatedScenes[sceneIndex] = updatedScene;
    
    setEditedAnalysis(prev => ({
      ...prev!,
      scenes: updatedScenes
    }));
    setHasUnsavedChanges(true);
  };

  const sendInvitation = async () => {
    if (!inviteForm.invitationName || !inviteForm.contactValue) {
      toast({
        title: "Missing Information",
        description: "Please provide invitation name and contact details",
        variant: "destructive",
      });
      return;
    }

    setSendingInvitation(true);
    try {
      // Convert story to collaborative template
      const templateResponse = await apiRequest("/api/roleplay-templates/convert", "POST", {
        storyId: storyId,
        title: `${analysis?.title || 'Untitled'} - ${inviteForm.invitationName}`,
        description: `Roleplay invitation: ${inviteForm.invitationName}`,
        isPublic: false
      });

      // Create instance from template
      const instanceResponse = await apiRequest("/api/roleplay-instances/create", "POST", {
        templateId: templateResponse.templateId,
        instanceTitle: inviteForm.invitationName,
        participantContacts: [{
          characterName: Object.keys(inviteForm.characterAssignments)[0] || analysis?.characters[0]?.name || "Character",
          contactMethod: inviteForm.contactMethod,
          contactValue: inviteForm.contactValue,
          isGuest: true
        }]
      });

      // Add to sent invitations
      const newInvitation = {
        id: instanceResponse.instanceId,
        invitationName: inviteForm.invitationName,
        contactMethod: inviteForm.contactMethod,
        contactValue: inviteForm.contactValue,
        status: "pending" as const,
        sentAt: new Date(),
        characterAssignments: inviteForm.characterAssignments,
        invitationUrl: instanceResponse.invitationLinks[0]?.invitationUrl || ""
      };

      setSentInvitations(prev => [...prev, newInvitation]);

      toast({
        title: "Invitation Sent",
        description: `Roleplay invitation "${inviteForm.invitationName}" has been sent successfully!`,
      });

      // Reset form
      setInviteForm({
        invitationName: "",
        contactMethod: "email",
        contactValue: "",
        characterAssignments: {}
      });
      setShowInviteDialog(false);

    } catch (error) {
      toast({
        title: "Failed to Send Invitation",
        description: "There was an error sending the invitation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSendingInvitation(false);
    }
  };

  const copyInvitationLink = (invitationUrl: string) => {
    navigator.clipboard.writeText(invitationUrl);
    toast({
      title: "Link Copied",
      description: "Invitation link copied to clipboard",
    });
  };

  const generateRolePlayAnalysis = async () => {
    if (!storyId) {
      toast({
        title: "Invalid Story",
        description: "Story ID is required for role-play analysis.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const result = await apiRequest(`/api/stories/${storyId}/roleplay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      setAnalysis(result);
      onAnalysisGenerated?.(result);
      
      toast({
        title: "Role-Play Analysis Generated",
        description: `Created ${result.scenes.length} scenes with dialogues and backgrounds.`,
      });
    } catch (error) {
      console.error('Role-play analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: "Failed to generate role-play analysis. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const startEditingScene = (sceneIndex: number) => {
    if (analysis) {
      setEditingScene(sceneIndex);
      setEditedScene({ ...analysis.scenes[sceneIndex] });
    }
  };

  const saveSceneEdits = async () => {
    if (!analysis || editingScene === null || !editedScene) return;

    try {
      const updatedScenes = [...analysis.scenes];
      updatedScenes[editingScene] = editedScene;

      const enhancedAnalysis = await apiRequest(`/api/stories/${storyId}/roleplay`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalAnalysis: analysis,
          modifications: { scenes: updatedScenes }
        }),
        credentials: 'include'
      });

      setAnalysis(enhancedAnalysis);
      setEditingScene(null);
      setEditedScene(null);
      
      toast({
        title: "Scene Updated",
        description: "Scene modifications saved successfully.",
      });
    } catch (error) {
      console.error('Scene update error:', error);
      toast({
        title: "Update Failed",
        description: "Failed to save scene modifications.",
        variant: "destructive",
      });
    }
  };

  const generateNewDialogue = async (sceneIndex: number) => {
    if (!analysis) return;

    try {
      const scene = analysis.scenes[sceneIndex];
      const characterNames = scene.dialogueSequence.map(d => d.characterName);
      
      const result = await apiRequest(`/api/stories/${storyId}/roleplay/dialogue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sceneContext: `${scene.title}: ${scene.background.visualDescription}`,
          characters: characterNames,
          emotionalTone: scene.emotionalTone
        }),
        credentials: 'include'
      });

      const updatedScenes = [...analysis.scenes];
      updatedScenes[sceneIndex].dialogueSequence = result.dialogue;
      
      setAnalysis({ ...analysis, scenes: updatedScenes });
      
      toast({
        title: "Dialogue Regenerated",
        description: "New dialogue generated for the scene.",
      });
    } catch (error) {
      console.error('Dialogue generation error:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate new dialogue.",
        variant: "destructive",
      });
    }
  };

  if (!analysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Film className="h-5 w-5" />
            Role Play Analysis
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Transform your story into an interactive role-play with scenes, dialogues, and backgrounds
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-8">
            <Button 
              onClick={generateRolePlayAnalysis} 
              disabled={isGenerating}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Role-Play...
                </>
              ) : (
                <>
                  <Film className="w-4 h-4 mr-2" />
                  Generate Role-Play Analysis
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Analysis Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Film className="h-5 w-5" />
              {isEditMode && editedAnalysis ? (
                <Input
                  value={editedAnalysis.title}
                  onChange={(e) => updateAnalysisField('title', e.target.value)}
                  className="text-lg font-semibold"
                />
              ) : (
                analysis.title
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              {isEditMode ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exitEditMode}
                    disabled={generatingVideo}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={saveChanges}
                    disabled={!hasUnsavedChanges || generatingVideo}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={enterEditMode}
                    disabled={generatingVideo}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  {shouldShowGenerateButton && (
                    <Button
                      size="sm"
                      onClick={handleGenerateVideoClick}
                      disabled={generatingVideo}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {generatingVideo ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          {videoResult ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2" />
                              Regenerate Video
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-2" />
                              Generate Video
                            </>
                          )}
                        </>
                      )}
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
          {hasUnsavedChanges && (
            <div className="text-sm text-amber-600 mt-2">
              <AlertCircle className="w-4 h-4 inline mr-1" />
              You have unsaved changes
            </div>
          )}
        </CardHeader>
        <CardContent>
          {/* Video Status Message */}
          {videoStatusMessage && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200">{videoStatusMessage}</p>
            </div>
          )}
          {/* Video Generation Result */}
          {videoResult && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
                  Video Generated Successfully
                </h3>
                <Badge variant="secondary" className="bg-green-100 dark:bg-green-900">
                  {videoResult.duration}s
                </Badge>
              </div>
              <div className="space-y-4">
                <VideoPlayer
                  videoUrl={videoResult.videoUrl}
                  thumbnailUrl={videoResult.thumbnailUrl}
                  title={`${analysis.title} - Generated Video`}
                  duration={videoResult.duration}
                  className="w-full"
                />
                

                
                {/* Audio player if available */}
                {videoResult.audioUrl && (
                  <div className="border rounded-lg p-3 bg-green-50 dark:bg-green-950">
                    <h5 className="font-medium text-green-900 dark:text-green-200 mb-2 text-sm">Character Audio</h5>
                    <audio src={videoResult.audioUrl} controls className="w-full" />
                  </div>
                )}
                
                {/* Video expectation description */}
                {videoResult.metadata?.videoExpectation && (
                  <div className="border rounded-lg p-3 bg-amber-50 dark:bg-amber-950">
                    <h5 className="font-medium text-amber-900 dark:text-amber-200 mb-2 text-sm">What This Video Should Show</h5>
                    <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                      {videoResult.metadata.videoExpectation}
                    </p>
                  </div>
                )}
                
                <div className="space-y-2">
                  <div className="text-sm text-green-700 dark:text-green-300">
                    <strong>Characters:</strong> {analysis?.characters?.map((c: any) => c.name).join(', ') || 'None specified'}
                    {videoResult.metadata?.hasAudio && " | Audio included"}
                    {videoResult.metadata?.dialogueCount && ` | ${analysis?.scenes?.reduce((total: number, scene: any) => total + (scene.dialogueSequence?.length || 0), 0)} dialogues`}
                    {videoResult.cacheHit && " | Loaded from cache (no cost)"}
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-3 rounded border-l-4 border-blue-500">
                    <strong>Video Description:</strong> A {analysis?.scenes?.length || 0}-scene {analysis?.genre?.toLowerCase() || 'story'} video featuring {analysis?.characters?.map((c: any) => c.name).join(', ') || 'the characters'}. The video has a {analysis?.overallTone?.toLowerCase() || 'engaging'} tone and brings your story to life with AI-generated visuals that match the narrative and character descriptions.
                  </div>
                </div>
                {videoResult.cacheHit && (
                  <div className="text-xs text-green-600">
                    <CheckCircle className="w-3 h-3 inline mr-1" />
                    Retrieved from cache (no OpenAI cost)
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{analysis.genre}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{analysis.estimatedPlaytime} min</span>
            </div>
            <div className="flex items-center gap-2">
              <Film className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{analysis.totalScenes} scenes</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{analysis.characters.length} characters</span>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Overall Tone</h4>
              <Badge variant="outline">{analysis.overallTone}</Badge>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Characters</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {analysis.characters.map((character, index) => (
                  <div key={index} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <h5 className="font-medium">{character.name}</h5>
                      <Badge variant="outline" className="text-xs">
                        {character.role}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{character.personality}</p>
                    <p className="text-xs text-muted-foreground">Voice: {character.voiceProfile}</p>
                    {character.costumeSuggestion && (
                      <p className="text-xs text-muted-foreground">Costume: {character.costumeSuggestion}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Character Invitations Summary */}
      {characterInvitations.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Active Invitations ({characterInvitations.size})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from(characterInvitations.entries()).map(([characterName, invitation]) => (
                <div key={characterName} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{characterName} Role</h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {invitation.contactMethod === "email" ? (
                          <Mail className="w-4 h-4" />
                        ) : (
                          <Phone className="w-4 h-4" />
                        )}
                        {invitation.contactValue}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={
                          invitation.status === "completed" ? "default" :
                          invitation.status === "accepted" ? "secondary" :
                          invitation.status === "declined" ? "destructive" : "outline"
                        }
                      >
                        {invitation.status}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyInvitationLink(invitation.invitationUrl)}
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      Copy Link
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(invitation.invitationUrl, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      View
                    </Button>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    Sent: {invitation.sentAt.toLocaleDateString()} at {invitation.sentAt.toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scenes */}
      {analysis.scenes.map((scene, sceneIndex) => (
        <Card key={scene.sceneNumber}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <span className="bg-purple-100 text-purple-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
                  {scene.sceneNumber}
                </span>
                {editingScene === sceneIndex ? (
                  <Input
                    value={editedScene?.title || ""}
                    onChange={(e) => setEditedScene(prev => prev ? { ...prev, title: e.target.value } : null)}
                    className="text-lg font-semibold"
                  />
                ) : (
                  scene.title
                )}
              </CardTitle>
              <div className="flex gap-2">
                {editingScene === sceneIndex ? (
                  <>
                    <Button size="sm" onClick={saveSceneEdits}>
                      <Save className="w-4 h-4 mr-1" />
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingScene(null)}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" variant="outline" onClick={() => generateNewDialogue(sceneIndex)}>
                      <RefreshCw className="w-4 h-4 mr-1" />
                      New Dialogue
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => startEditingScene(sceneIndex)}>
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {Math.floor(scene.estimatedDuration / 60)}:{(scene.estimatedDuration % 60).toString().padStart(2, '0')}
              </div>
              <Badge variant="outline" className="text-xs">
                {scene.emotionalTone}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Scene Background */}
            <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Scene Background
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Location:</span> {scene.background.location}
                </div>
                <div>
                  <span className="font-medium">Time:</span> {scene.background.timeOfDay}
                </div>
                <div>
                  <span className="font-medium">Atmosphere:</span> {scene.background.atmosphere}
                </div>
                {scene.background.lighting && (
                  <div>
                    <span className="font-medium">Lighting:</span> {scene.background.lighting}
                  </div>
                )}
              </div>
              <div>
                <span className="font-medium">Visual Description:</span>
                <p className="mt-1 text-muted-foreground">{scene.background.visualDescription}</p>
              </div>
              {scene.background.soundscape && (
                <div>
                  <span className="font-medium">Soundscape:</span>
                  <p className="mt-1 text-muted-foreground">{scene.background.soundscape}</p>
                </div>
              )}
            </div>

            {/* Dialogue Sequence */}
            <div className="space-y-3">
              <h4 className="font-medium">Dialogue Sequence</h4>
              <div className="space-y-3">
                {scene.dialogueSequence.map((dialogue, dialogueIndex) => (
                  <div key={dialogueIndex} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-purple-700 dark:text-purple-300">
                        {dialogue.characterName}
                      </span>
                      <div className="flex items-center gap-2 text-xs">
                        <Badge variant="outline">{dialogue.emotion}</Badge>
                        <span className="text-muted-foreground">Intensity: {dialogue.intensity}/10</span>
                      </div>
                    </div>
                    <p className="text-sm">{dialogue.dialogue}</p>
                    {dialogue.action && (
                      <p className="text-xs text-muted-foreground italic">
                        *{dialogue.action}*
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Stage Directions */}
            {scene.stageDirections.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Stage Directions</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {scene.stageDirections.map((direction, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-purple-600 mt-1">•</span>
                      {direction}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Production Notes */}
      {analysis.productionNotes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Production Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.productionNotes.map((note, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-blue-600 mt-1">•</span>
                  {note}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Cost Warning Dialog */}
      <Dialog open={showCostWarning} onOpenChange={setShowCostWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Video Regeneration Cost Warning
            </DialogTitle>
            <DialogDescription>
              You already have a video for this story. Regenerating will create a new video using video generation credits.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
              <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300 mb-2">
                <DollarSign className="w-4 h-4" />
                <span className="font-medium">Cost Information</span>
              </div>
              <ul className="text-sm text-orange-600 dark:text-orange-400 space-y-1">
                <li>• Video regeneration will consume video generation credits</li>
                <li>• Maximum duration: 3 minutes (cost optimized)</li>
                <li>• Existing video will be replaced</li>
                <li>• New video will be cached to prevent future costs</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCostWarning(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => generateVideo(true)}
              disabled={generatingVideo}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {generatingVideo ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                'Proceed with Regeneration'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}