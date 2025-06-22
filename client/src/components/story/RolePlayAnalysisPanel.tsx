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
  AlertCircle
} from "lucide-react";

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
  const [analysis, setAnalysis] = useState<RolePlayAnalysis | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingScene, setEditingScene] = useState<number | null>(null);
  const [editedScene, setEditedScene] = useState<RolePlayScene | null>(null);
  
  // Invitation system state
  const [sentInvitations, setSentInvitations] = useState<Array<{
    id: string;
    invitationName: string;
    contactMethod: "email" | "phone";
    contactValue: string;
    status: "pending" | "accepted" | "declined" | "completed";
    sentAt: Date;
    characterAssignments: { [characterName: string]: string };
    invitationUrl: string;
  }>>([]);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    invitationName: "",
    contactMethod: "email" as "email" | "phone",
    contactValue: "",
    characterAssignments: {} as { [characterName: string]: string }
  });
  const [sendingInvitation, setSendingInvitation] = useState(false);

  // Use existing analysis if provided
  useEffect(() => {
    if (existingAnalysis && !analysis) {
      setAnalysis(existingAnalysis);
    }
  }, [existingAnalysis, analysis]);

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
              {analysis.title}
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={generateRolePlayAnalysis}
              disabled={isGenerating}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Regenerate
            </Button>
          </div>
        </CardHeader>
        <CardContent>
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
                  <CharacterInviteCard 
                    key={index}
                    character={character}
                    storyId={storyId}
                    onInviteSent={(invitation) => {
                      setSentInvitations(prev => [...prev, invitation]);
                      toast({ title: "Invitation sent!", description: `Invitation sent to ${invitation.contactValue}` });
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sent Invitations Tracking */}
      {sentInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Sent Invitations ({sentInvitations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sentInvitations.map((invitation) => (
                <div key={invitation.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{invitation.invitationName}</h4>
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
    </div>
  );
}