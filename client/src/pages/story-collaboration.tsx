import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, UserPlus, Users, Link, Copy, Mail, Check, X, Clock } from "lucide-react";
import { z } from "zod";

const inviteSchema = z.object({
  invitedUserEmail: z.string().email("Please enter a valid email address"),
  assignedCharacterId: z.number().optional(),
  permissions: z.enum(['voice_only', 'edit', 'view']).default('voice_only'),
});

const groupSchema = z.object({
  name: z.string().min(1, "Group name is required"),
  description: z.string().optional(),
  visibility: z.enum(['private', 'public', 'friends']).default('private'),
  maxMembers: z.number().min(2).max(50).default(10),
});

export default function StoryCollaboration() {
  const { storyId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [copiedInviteCode, setCopiedInviteCode] = useState<string | null>(null);

  // Fetch story details
  const { data: story } = useQuery({
    queryKey: [`/api/stories/${storyId}`],
    enabled: !!storyId,
  });

  // Fetch story characters
  const { data: characters = [] } = useQuery({
    queryKey: [`/api/stories/${storyId}/characters`],
    enabled: !!storyId,
  });

  // Fetch collaborations
  const { data: collaborations = [], refetch: refetchCollaborations } = useQuery({
    queryKey: [`/api/stories/${storyId}/collaborations`],
    enabled: !!storyId,
  });

  // Fetch story groups
  const { data: groups = [], refetch: refetchGroups } = useQuery({
    queryKey: [`/api/stories/${storyId}/groups`],
    enabled: !!storyId,
  });

  // Fetch voice assignments
  const { data: voiceAssignments = [] } = useQuery({
    queryKey: [`/api/stories/${storyId}/voice-assignments`],
    enabled: !!storyId,
  });

  const inviteForm = useForm({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      invitedUserEmail: "",
      permissions: 'voice_only' as const,
    },
  });

  const groupForm = useForm({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      name: "",
      description: "",
      visibility: 'private' as const,
      maxMembers: 10,
    },
  });

  const inviteUserMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest(`/api/stories/${storyId}/invite`, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: () => {
      toast({
        title: "Invitation Sent!",
        description: "Your friend will receive an invitation to collaborate on this story.",
      });
      setIsInviteDialogOpen(false);
      inviteForm.reset();
      refetchCollaborations();
    },
    onError: (error: any) => {
      toast({
        title: "Invitation Failed",
        description: error.message || "Failed to send invitation",
        variant: "destructive",
      });
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest(`/api/stories/${storyId}/groups`, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: () => {
      toast({
        title: "Group Created!",
        description: "Your story group has been created successfully.",
      });
      setIsGroupDialogOpen(false);
      groupForm.reset();
      refetchGroups();
    },
    onError: (error: any) => {
      toast({
        title: "Group Creation Failed",
        description: error.message || "Failed to create group",
        variant: "destructive",
      });
    },
  });

  const onInviteSubmit = (data: any) => {
    inviteUserMutation.mutate(data);
  };

  const onGroupSubmit = (data: any) => {
    createGroupMutation.mutate(data);
  };

  const copyInviteCode = (inviteCode: string) => {
    const inviteUrl = `${window.location.origin}/join/${inviteCode}`;
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopiedInviteCode(inviteCode);
      toast({
        title: "Invite Link Copied!",
        description: "Share this link with friends to join your story group.",
      });
      setTimeout(() => setCopiedInviteCode(null), 2000);
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-600 text-white';
      case 'declined':
        return 'bg-red-600 text-white';
      case 'pending':
        return 'bg-yellow-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <Check className="w-4 h-4" />;
      case 'declined':
        return <X className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const availableCharacters = characters.filter(
    char => !collaborations.some(collab => collab.assignedCharacterId === char.id && collab.status === 'accepted')
  );

  return (
    <div className="bg-dark-bg text-dark-text min-h-screen">
      <div className="flex flex-col h-screen">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-dark-card border-b border-gray-800">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setLocation(`/story/${storyId}`)}
            className="text-dark-text hover:bg-gray-800"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h2 className="text-lg font-semibold">Story Collaboration</h2>
          <div className="flex space-x-2">
            <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-tiktok-red hover:bg-tiktok-red/80">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite Friend
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-dark-card border-gray-800">
                <DialogHeader>
                  <DialogTitle className="text-dark-text">Invite Friend to Story</DialogTitle>
                  <DialogDescription className="text-gray-text">
                    Invite a friend to play a character in your story
                  </DialogDescription>
                </DialogHeader>
                <Form {...inviteForm}>
                  <form onSubmit={inviteForm.handleSubmit(onInviteSubmit)} className="space-y-4">
                    <FormField
                      control={inviteForm.control}
                      name="invitedUserEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-dark-text">Friend's Email</FormLabel>
                          <FormControl>
                            <Input 
                              {...field}
                              placeholder="friend@example.com"
                              className="bg-gray-800 text-dark-text border-gray-700"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={inviteForm.control}
                      name="assignedCharacterId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-dark-text">Assign Character</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                            <FormControl>
                              <SelectTrigger className="bg-gray-800 text-dark-text border-gray-700">
                                <SelectValue placeholder="Select a character" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-gray-800 border-gray-700">
                              {availableCharacters.map((character) => (
                                <SelectItem key={character.id} value={character.id.toString()}>
                                  {character.name} - {character.role}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={inviteForm.control}
                      name="permissions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-dark-text">Permissions</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-gray-800 text-dark-text border-gray-700">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-gray-800 border-gray-700">
                              <SelectItem value="voice_only">Voice Only</SelectItem>
                              <SelectItem value="edit">Edit Story</SelectItem>
                              <SelectItem value="view">View Only</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end space-x-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsInviteDialogOpen(false)}
                        className="border-gray-600 text-gray-300"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={inviteUserMutation.isPending}
                        className="bg-tiktok-red hover:bg-tiktok-red/80"
                      >
                        {inviteUserMutation.isPending ? "Sending..." : "Send Invite"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-gray-600 text-gray-300">
                  <Users className="w-4 h-4 mr-2" />
                  Create Group
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-dark-card border-gray-800">
                <DialogHeader>
                  <DialogTitle className="text-dark-text">Create Story Group</DialogTitle>
                  <DialogDescription className="text-gray-text">
                    Create a group for collaborative storytelling
                  </DialogDescription>
                </DialogHeader>
                <Form {...groupForm}>
                  <form onSubmit={groupForm.handleSubmit(onGroupSubmit)} className="space-y-4">
                    <FormField
                      control={groupForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-dark-text">Group Name</FormLabel>
                          <FormControl>
                            <Input 
                              {...field}
                              placeholder="My Story Group"
                              className="bg-gray-800 text-dark-text border-gray-700"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={groupForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-dark-text">Description (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              {...field}
                              placeholder="A group for collaborative storytelling"
                              className="bg-gray-800 text-dark-text border-gray-700"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={groupForm.control}
                      name="visibility"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-dark-text">Visibility</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-gray-800 text-dark-text border-gray-700">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-gray-800 border-gray-700">
                              <SelectItem value="private">Private</SelectItem>
                              <SelectItem value="friends">Friends Only</SelectItem>
                              <SelectItem value="public">Public</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end space-x-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsGroupDialogOpen(false)}
                        className="border-gray-600 text-gray-300"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createGroupMutation.isPending}
                        className="bg-tiktok-cyan hover:bg-tiktok-cyan/80"
                      >
                        {createGroupMutation.isPending ? "Creating..." : "Create Group"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <Tabs defaultValue="collaborators" className="space-y-6">
            <TabsList className="bg-gray-800 border border-gray-700">
              <TabsTrigger value="collaborators" className="data-[state=active]:bg-tiktok-red">
                Collaborators
              </TabsTrigger>
              <TabsTrigger value="groups" className="data-[state=active]:bg-tiktok-cyan">
                Groups
              </TabsTrigger>
              <TabsTrigger value="characters" className="data-[state=active]:bg-tiktok-pink">
                Characters
              </TabsTrigger>
            </TabsList>

            <TabsContent value="collaborators" className="space-y-4">
              <Card className="bg-dark-card border-gray-800">
                <CardHeader>
                  <CardTitle className="text-dark-text">Story Collaborators</CardTitle>
                  <CardDescription className="text-gray-text">
                    People invited to participate in this story
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {collaborations.length === 0 ? (
                    <div className="text-center py-8 text-gray-text">
                      <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No collaborators yet</p>
                      <p className="text-sm">Invite friends to bring your story to life!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {collaborations.map((collaboration: any) => (
                        <div
                          key={collaboration.id}
                          className="flex items-center justify-between p-4 bg-gray-800 rounded-lg"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-tiktok-red rounded-full flex items-center justify-center">
                              <Mail className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="text-dark-text font-medium">
                                {collaboration.invitedUser?.email || 'Invited User'}
                              </p>
                              <p className="text-gray-text text-sm">
                                {collaboration.assignedCharacter?.name || 'No character assigned'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className={getStatusColor(collaboration.status)}>
                              {getStatusIcon(collaboration.status)}
                              <span className="ml-1 capitalize">{collaboration.status}</span>
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="groups" className="space-y-4">
              <div className="grid gap-4">
                {groups.map((group: any) => (
                  <Card key={group.id} className="bg-dark-card border-gray-800">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-dark-text">{group.name}</CardTitle>
                        <Badge variant="outline" className="text-tiktok-cyan border-tiktok-cyan">
                          {group.visibility}
                        </Badge>
                      </div>
                      {group.description && (
                        <CardDescription className="text-gray-text">
                          {group.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="text-sm text-gray-text">
                            <Users className="w-4 h-4 inline mr-1" />
                            {group.memberCount || 0}/{group.maxMembers} members
                          </div>
                          <div className="flex items-center space-x-2">
                            <Link className="w-4 h-4 text-gray-text" />
                            <code className="text-xs bg-gray-800 px-2 py-1 rounded">
                              {group.inviteCode}
                            </code>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyInviteCode(group.inviteCode)}
                          className="border-gray-600 text-gray-300"
                        >
                          {copiedInviteCode === group.inviteCode ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {groups.length === 0 && (
                  <Card className="bg-dark-card border-gray-800">
                    <CardContent className="text-center py-8">
                      <Users className="w-12 h-12 mx-auto mb-4 text-gray-500" />
                      <p className="text-gray-text">No groups created yet</p>
                      <p className="text-sm text-gray-text">Create a group to organize multiple collaborators</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="characters" className="space-y-4">
              <Card className="bg-dark-card border-gray-800">
                <CardHeader>
                  <CardTitle className="text-dark-text">Character Assignments</CardTitle>
                  <CardDescription className="text-gray-text">
                    See which characters are assigned to collaborators
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {characters.map((character: any) => {
                      const assignment = voiceAssignments.find(
                        (va: any) => va.characterId === character.id
                      );
                      const collaboration = collaborations.find(
                        (c: any) => c.assignedCharacterId === character.id && c.status === 'accepted'
                      );

                      return (
                        <div
                          key={character.id}
                          className="flex items-center justify-between p-4 bg-gray-800 rounded-lg"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-tiktok-pink rounded-full flex items-center justify-center">
                              <span className="text-white font-semibold">
                                {character.name.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <p className="text-dark-text font-medium">{character.name}</p>
                              <p className="text-gray-text text-sm capitalize">{character.role}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            {collaboration ? (
                              <div>
                                <p className="text-green-400 text-sm">Assigned</p>
                                <p className="text-gray-text text-xs">
                                  {collaboration.invitedUser?.email}
                                </p>
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-gray-400 border-gray-600">
                                Available
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}