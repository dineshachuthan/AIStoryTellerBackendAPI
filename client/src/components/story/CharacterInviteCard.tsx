import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Send, Mail, Phone, Loader2 } from "lucide-react";

interface CharacterInviteCardProps {
  character: {
    name: string;
    role: string;
    personality: string;
    voiceProfile: string;
    costumeSuggestion?: string;
  };
  storyId: number;
  onInviteSent: (invitation: any) => void;
}

export function CharacterInviteCard({ character, storyId, onInviteSent }: CharacterInviteCardProps) {
  const [showInvite, setShowInvite] = useState(false);
  const [contactMethod, setContactMethod] = useState<"email" | "phone">("email");
  const [contactValue, setContactValue] = useState("");
  const [sending, setSending] = useState(false);
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
        id: Date.now(),
        characterName: character.name,
        contactMethod,
        contactValue: contactValue.trim(),
        invitationName: `${character.name} Role`,
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
    </div>
  );
}