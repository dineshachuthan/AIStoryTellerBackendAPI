import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast, toastMessages } from "@/lib/toast-utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Mail, Phone, Send, Plus, X, Copy, CheckCircle, Users } from "lucide-react";
import type { Story, StoryCharacter } from '@shared/schema/schema';

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
  conversationStyle?: string;
}

export function InviteCollaboratorsDialog({ 
  open, 
  onOpenChange, 
  story,
  characters = []
}: InviteCollaboratorsDialogProps) {
  const queryClient = useQueryClient();
  const [invites, setInvites] = useState<InviteData[]>([{ type: 'email', value: '', conversationStyle: 'respectful' }]);
  const [message, setMessage] = useState('');
  const [createdInvitations, setCreatedInvitations] = useState<any[]>([]);
  const [copiedTokens, setCopiedTokens] = useState<Set<string>>(new Set());

  // Conversation styles available for selection
  const conversationStyles = [
    { value: 'respectful', label: 'Respectful' },
    { value: 'business', label: 'Business' },
    { value: 'jovial', label: 'Jovial' },
    { value: 'playful', label: 'Playful' },
    { value: 'close_friends', label: 'Close Friends' },
    { value: 'parent_to_child', label: 'Parent to Child' },
    { value: 'child_to_parent', label: 'Child to Parent' },
    { value: 'siblings', label: 'Siblings' }
  ];

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
          conversationStyle: invite.conversationStyle || 'respectful',
        })),
        message: message.trim() || undefined,
      });
    },
    onSuccess: (data) => {
      const count = invites.filter(i => i.value).length;
      toast.success(toastMessages.invitationsSent(count));
      queryClient.invalidateQueries({ queryKey: ['/api/stories', story.id, 'invitations'] });
      
      console.log('Invitation response data:', data);
      
      // Store created invitations for display
      if (data && data.results) {
        // Extract invitation objects from results array
        const invitations = data.results.map((result: any) => result.invitation);
        console.log('Extracted invitations:', invitations);
        setCreatedInvitations(invitations);
      }
      
      // Don't close dialog, let user see the links
      // Reset form
      setInvites([{ type: 'email', value: '', conversationStyle: 'respectful' }]);
      setMessage('');
    },
    onError: (error: Error) => {
      toast.error(toastMessages.invitationsFailed(error.message));
    },
  });

  const addInvite = () => {
    if (invites.length < 10) { // Max 10 invites at once
      setInvites([...invites, { type: 'email', value: '', conversationStyle: 'respectful' }]);
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

  const copyToClipboard = async (text: string, token: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedTokens(new Set([...copiedTokens, token]));
      toast.success('Link copied to clipboard!');
      setTimeout(() => {
        setCopiedTokens(prev => {
          const newSet = new Set(prev);
          newSet.delete(token);
          return newSet;
        });
      }, 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const getInvitationUrl = (token: string) => {
    return `${window.location.origin}/invitations/narration/${token}`;
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
          {/* Created Invitations Display */}
          {console.log('Rendering dialog, createdInvitations:', createdInvitations)}
          {createdInvitations.length > 0 && (
            <div className="space-y-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                <h3 className="font-semibold text-green-900 dark:text-green-100">
                  Invitations Created Successfully!
                </h3>
              </div>
              <p className="text-sm text-green-700 dark:text-green-300 mb-3">
                Share these links with your collaborators (email will be sent if MailGun is configured):
              </p>
              <div className="space-y-2">
                {createdInvitations.map((invitation) => {
                  const url = getInvitationUrl(invitation.invitationToken);
                  const isEmail = invitation.inviteeEmail;
                  return (
                    <div key={invitation.id} className="flex items-center space-x-2 p-2 bg-white dark:bg-gray-800 rounded border border-green-300 dark:border-green-700">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          {isEmail ? <Mail className="h-4 w-4 text-gray-500" /> : <Phone className="h-4 w-4 text-gray-500" />}
                          <span className="text-sm font-medium truncate">
                            {invitation.inviteeEmail || invitation.inviteePhone}
                          </span>
                          {invitation.characterId && (
                            <span className="text-xs text-gray-500">
                              (Character: {characters.find(c => c.id === invitation.characterId)?.name})
                            </span>
                          )}
                        </div>
                        <div className="mt-1">
                          <a 
                            href={url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline break-all"
                          >
                            {url}
                          </a>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(url, invitation.invitationToken)}
                        className="shrink-0"
                      >
                        {copiedTokens.has(invitation.invitationToken) ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Header with Add Invite Button */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Invite Collaborators</h3>
              <p className="text-sm text-muted-foreground">
                Share your story with friends and family
              </p>
            </div>
            {invites.length < 10 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addInvite}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Invite
              </Button>
            )}
          </div>

          {/* Character Assignment Info */}
          {characters.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg mb-4">
              <h4 className="text-sm font-medium mb-2">Available Characters</h4>
              <div className="grid grid-cols-2 gap-2">
                {characters.map(char => (
                  <div key={char.id} className="text-sm">
                    <span className="font-medium">{char.name}</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      ({char.personality})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Invitations Grid */}
          <div className="space-y-4">
            {invites.length > 0 ? (
              <div className="space-y-3">
                {invites.map((invite, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-card">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium">
                          {index + 1}
                        </div>
                        <span className="text-sm font-medium">Invitation #{index + 1}</span>
                      </div>
                      {invites.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeInvite(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Contact Method */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Contact Method</Label>
                        <div className="flex gap-2">
                          <select
                            className="w-20 h-9 px-2 rounded-md border border-input bg-background text-sm"
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
                            className="flex-1 h-9"
                          />
                        </div>
                      </div>

                      {/* Character Assignment */}
                      {characters.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Character Role</Label>
                          <select
                            className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
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
                        </div>
                      )}
                    </div>

                    {/* Conversation Style */}
                    <div className="mt-3 space-y-2">
                      <Label className="text-sm font-medium">
                        Your conversation style with this person
                      </Label>
                      <select
                        className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                        value={invite.conversationStyle || 'respectful'}
                        onChange={(e) => updateInvite(index, { 
                          conversationStyle: e.target.value
                        })}
                      >
                        {conversationStyles.map(style => (
                          <option key={style.value} value={style.value}>
                            {style.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No invitations yet</p>
                <p className="text-xs">Click "Add Invite" to get started</p>
              </div>
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