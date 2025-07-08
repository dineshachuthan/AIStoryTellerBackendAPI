import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Mail, Phone, Send, Plus, X } from "lucide-react";
import type { Story, StoryCharacter } from "@shared/schema";

interface InviteCollaboratorsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  story: Story;
  characters?: StoryCharacter[];
}

interface InviteData {
  type: 'email' | 'phone';
  value: string;
  characterId?: number;
}

export function InviteCollaboratorsDialog({ 
  open, 
  onOpenChange, 
  story,
  characters = []
}: InviteCollaboratorsDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [invites, setInvites] = useState<InviteData[]>([{ type: 'email', value: '' }]);
  const [message, setMessage] = useState('');

  const sendInvitationsMutation = useMutation({
    mutationFn: async () => {
      const validInvites = invites.filter(invite => invite.value.trim());
      if (validInvites.length === 0) {
        throw new Error('Please add at least one email or phone number');
      }

      return apiClient.sendStoryInvitations({
        storyId: story.id,
        invitations: validInvites.map(invite => ({
          email: invite.type === 'email' ? invite.value : undefined,
          phone: invite.type === 'phone' ? invite.value : undefined,
          characterId: invite.characterId,
        })),
        message: message.trim() || undefined,
      });
    },
    onSuccess: () => {
      toast({
        title: "Invitations sent!",
        description: `Successfully sent ${invites.filter(i => i.value).length} invitation(s)`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/stories', story.id, 'invitations'] });
      onOpenChange(false);
      // Reset form
      setInvites([{ type: 'email', value: '' }]);
      setMessage('');
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send invitations",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addInvite = () => {
    if (invites.length < 10) { // Max 10 invites at once
      setInvites([...invites, { type: 'email', value: '' }]);
    }
  };

  const removeInvite = (index: number) => {
    setInvites(invites.filter((_, i) => i !== index));
  };

  const updateInvite = (index: number, updates: Partial<InviteData>) => {
    const newInvites = [...invites];
    newInvites[index] = { ...newInvites[index], ...updates };
    setInvites(newInvites);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invite Collaborators</DialogTitle>
          <DialogDescription>
            Invite friends and family to narrate "{story.title}". They'll receive a link to record their own voice samples.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Invitations List */}
          <div className="space-y-3">
            <Label>Invitations</Label>
            {invites.map((invite, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="flex-1 flex items-center space-x-2">
                  <select
                    className="h-10 px-3 rounded-md border border-input bg-background"
                    value={invite.type}
                    onChange={(e) => updateInvite(index, { 
                      type: e.target.value as 'email' | 'phone',
                      value: '' 
                    })}
                  >
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                  </select>
                  
                  <Input
                    type={invite.type === 'email' ? 'email' : 'tel'}
                    placeholder={invite.type === 'email' ? 'email@example.com' : '+1234567890'}
                    value={invite.value}
                    onChange={(e) => updateInvite(index, { value: e.target.value })}
                    className="flex-1"
                  />

                  {characters.length > 0 && (
                    <select
                      className="h-10 px-3 rounded-md border border-input bg-background"
                      value={invite.characterId || ''}
                      onChange={(e) => updateInvite(index, { 
                        characterId: e.target.value ? Number(e.target.value) : undefined 
                      })}
                    >
                      <option value="">Any character</option>
                      {characters.map(char => (
                        <option key={char.id} value={char.id}>
                          {char.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {invites.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeInvite(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            
            {invites.length < 10 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addInvite}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add another invite
              </Button>
            )}
          </div>

          {/* Optional Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Personal Message (Optional)</Label>
            <Textarea
              id="message"
              placeholder="Add a personal note to your invitation..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={sendInvitationsMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => sendInvitationsMutation.mutate()}
              disabled={sendInvitationsMutation.isPending}
            >
              <Send className="h-4 w-4 mr-2" />
              {sendInvitationsMutation.isPending ? 'Sending...' : 'Send Invitations'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}