import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Send, Mail, Phone, Loader2, Trash2, AlertTriangle } from "lucide-react";

interface CharacterInviteCardProps {
  character: {
    name: string;
    role: string;
    personality: string;
    voiceProfile: string;
    costumeSuggestion?: string;
  };
  storyId: number;
  existingInvitation?: {
    id: string;
    contactValue: string;
    contactMethod: string;
    hasVoiceRecording: boolean;
    invitationToken: string;
  } | null;
  onInviteSent: (invitation: any) => void;
  onInviteDeleted: (characterName: string) => void;
}

export function CharacterInviteCard({ character, storyId, existingInvitation, onInviteSent, onInviteDeleted }: CharacterInviteCardProps) {
  const [showInvite, setShowInvite] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [contactMethod, setContactMethod] = useState<"email" | "phone">("email");
  const [contactValue, setContactValue] = useState("");
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const sendInvitation = async () => {
    if (!contactValue.trim()) {
      toast({ title: "Error", description: "Please enter a contact method", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      const response = await apiRequest(`/api/collaborative/templates`, {
        method: 'POST',
        body: JSON.stringify({
          storyId,
          characterName: character.name,
          contactMethod,
          contactValue: contactValue.trim(),
          invitationName: `${character.name} Role`
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const invitation = {
        id: response.instanceId,
        characterName: character.name,
        contactMethod,
        contactValue: contactValue.trim(),
        invitationName: `${character.name} Role`,
        invitationToken: response.invitationToken,
        hasVoiceRecording: false,
        sentAt: new Date()
      };

      onInviteSent(invitation);
      setShowInvite(false);
      setContactValue("");
      
      toast({ 
        title: "Invitation sent!", 
        description: `${character.name} role invitation sent to ${contactValue}` 
      });
    } catch (error) {
      console.error('Invitation error:', error);
      toast({ 
        title: "Error", 
        description: "Failed to send invitation", 
        variant: "destructive" 
      });
    } finally {
      setSending(false);
    }
  };

  const deleteInvitation = async () => {
    if (!existingInvitation) return;

    setDeleting(true);
    try {
      await apiRequest(`/api/collaborative/invitations/${existingInvitation.invitationToken}`, {
        method: 'DELETE'
      });

      onInviteDeleted(character.name);
      setShowDeleteConfirm(false);
      
      toast({ 
        title: "Invitation deleted", 
        description: `${character.name} invitation has been removed` 
      });
    } catch (error) {
      console.error('Delete invitation error:', error);
      toast({ 
        title: "Error", 
        description: "Failed to delete invitation", 
        variant: "destructive" 
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleNewInviteClick = () => {
    if (existingInvitation?.hasVoiceRecording) {
      // Show warning dialog for voice recording
      toast({
        title: "Warning",
        description: `${existingInvitation.contactValue} has already recorded voice samples for ${character.name}. Delete the current invitation first if you want to invite someone else.`,
        variant: "destructive"
      });
      return;
    }
    setShowInvite(true);
  };

  return (
    <div className="border rounded-lg p-3 space-y-2">
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
      
      {/* Show existing invitation if present */}
      {existingInvitation ? (
        <div className="mt-2 p-2 bg-muted rounded border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              {existingInvitation.contactMethod === "email" ? (
                <Mail className="w-4 h-4" />
              ) : (
                <Phone className="w-4 h-4" />
              )}
              <span className="truncate">{existingInvitation.contactValue}</span>
            </div>
            {existingInvitation.hasVoiceRecording && (
              <Badge variant="secondary" className="text-xs">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Has Recording
              </Badge>
            )}
          </div>
          <div className="flex gap-2 mt-2">
            <Button size="sm" variant="outline" onClick={handleNewInviteClick} className="flex-1">
              <Send className="w-4 h-4 mr-2" />
              New Invite
            </Button>
            <Button 
              size="sm" 
              variant="destructive" 
              onClick={() => setShowDeleteConfirm(true)}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      ) : (
        <Dialog open={showInvite} onOpenChange={setShowInvite}>
          <DialogTrigger asChild>
            <Button size="sm" className="w-full mt-2">
              <Send className="w-4 h-4 mr-2" />
              Invite for {character.name}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Someone to Play {character.name}</DialogTitle>
            <DialogDescription>
              Send an invitation for the {character.name} role
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Contact Method</Label>
              <Select value={contactMethod} onValueChange={(value: "email" | "phone") => setContactMethod(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email
                    </div>
                  </SelectItem>
                  <SelectItem value="phone">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Phone Number
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="contactValue">
                {contactMethod === "email" ? "Email Address" : "Phone Number"}
              </Label>
              <Input
                id="contactValue"
                type={contactMethod === "email" ? "email" : "tel"}
                placeholder={contactMethod === "email" ? "friend@example.com" : "+1234567890"}
                value={contactValue}
                onChange={(e) => setContactValue(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvite(false)}>
              Cancel
            </Button>
            <Button onClick={sendInvitation} disabled={sending}>
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Invitation</DialogTitle>
            <DialogDescription>
              {existingInvitation?.hasVoiceRecording ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-amber-600">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-medium">Warning: Voice recordings exist</span>
                  </div>
                  <p>
                    {existingInvitation.contactValue} has already recorded voice samples for {character.name}. 
                    Deleting this invitation will remove their access and recordings.
                  </p>
                </div>
              ) : (
                <p>
                  Are you sure you want to delete the invitation for {character.name} sent to {existingInvitation?.contactValue}?
                </p>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteInvitation} disabled={deleting}>
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}