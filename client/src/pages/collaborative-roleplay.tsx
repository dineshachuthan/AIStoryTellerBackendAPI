import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast, toastMessages } from "@/lib/toast-utils";
import { Users, Play, Crown, Copy, Settings } from "lucide-react";

interface StoryTemplate {
  id: number;
  title: string;
  description: string;
  genre: string;
  tags: string[];
  isPublic: boolean;
  createdByUserId: string;
  characterRoles: Array<{
    id: number;
    characterName: string;
    characterDescription: string;
    requiredEmotions: Array<{
      emotion: string;
      intensity: number;
      sampleCount: number;
    }>;
  }>;
  scenes: number;
  backgrounds: number;
}

interface StoryInstance {
  id: number;
  instanceTitle: string;
  status: string;
  completionPercentage: number;
  participants: Array<{
    id: number;
    characterRoleId: number;
    userId: string | null;
    invitationStatus: string;
    recordingProgress: number;
  }>;
}

export default function CollaborativeRoleplay() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedStoryId, setSelectedStoryId] = useState<number | null>(null);
  const [instanceTitle, setInstanceTitle] = useState("");
  const [showCreateInstance, setShowCreateInstance] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState("en-US");

  // Fetch user's stories
  const { data: stories = [] } = useQuery({
    queryKey: ['/api/stories'],
  });

  // Fetch public templates
  const { data: publicTemplates = [] } = useQuery<StoryTemplate[]>({
    queryKey: ['/api/roleplay-templates'],
  });

  // Fetch user's templates
  const { data: userTemplates = [] } = useQuery<StoryTemplate[]>({
    queryKey: ['/api/roleplay-templates/my-templates'],
  });

  // Fetch user's instances
  const { data: userInstances = [] } = useQuery<StoryInstance[]>({
    queryKey: ['/api/roleplay-instances/my-instances'],
  });

  // Convert story to template mutation
  const convertToTemplate = useMutation({
    mutationFn: async (storyId: number) => {
      const response = await fetch(`/api/stories/${storyId}/convert-to-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ makePublic: true }),
      });
      if (!response.ok) throw new Error('Failed to convert story');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Template Created",
        description: "Your story has been converted to a collaborative template!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/roleplay-templates/my-templates'] });
    },
    onError: () => {
      toast({
        title: "Conversion Failed",
        description: "Failed to convert story to template. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Create instance mutation
  const createInstance = useMutation({
    mutationFn: async ({ templateId, title, language }: { templateId: number; title: string; language: string }) => {
      const response = await fetch(`/api/roleplay-templates/${templateId}/create-instance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceTitle: title, isPublic: false, language }),
      });
      if (!response.ok) throw new Error('Failed to create instance');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Instance Created",
        description: `Collaborative instance "${instanceTitle}" created successfully!`,
      });
      setShowCreateInstance(false);
      setInstanceTitle("");
      setSelectedLanguage("en-US");
      queryClient.invalidateQueries({ queryKey: ['/api/roleplay-instances/my-instances'] });
    },
    onError: () => {
      toast({
        title: "Creation Failed",
        description: "Failed to create instance. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleConvertStory = (storyId: number) => {
    convertToTemplate.mutate(storyId);
  };

  const handleCreateInstance = () => {
    if (!selectedTemplateId || !instanceTitle.trim()) return;
    createInstance.mutate({ 
      templateId: selectedTemplateId, 
      title: instanceTitle.trim(), 
      language: selectedLanguage 
    });
  };

  const copyInvitationLink = (token: string) => {
    const link = `${window.location.origin}/roleplay-invite/${token}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link Copied",
      description: "Invitation link copied to clipboard!",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 dark:from-purple-900/20 dark:via-blue-900/20 dark:to-indigo-900/20 p-4">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Collaborative Roleplay
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Convert your stories into collaborative templates and invite friends to play different characters with their own voices and pictures.
          </p>
        </div>

        {/* Convert Stories Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5" />
              Convert Your Stories to Templates
            </CardTitle>
            <CardDescription>
              Transform your analyzed stories into collaborative templates that others can perform with different casts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {stories.filter((story: any) => story.processingStatus === 'completed').map((story: any) => (
                <Card key={story.id} className="p-4">
                  <h3 className="font-semibold text-lg mb-2">{story.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {story.summary || "No summary available"}
                  </p>
                  <div className="flex gap-2 mb-3">
                    {story.tags?.slice(0, 2).map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <Button 
                    onClick={() => handleConvertStory(story.id)}
                    disabled={convertToTemplate.isPending}
                    size="sm" 
                    className="w-full"
                  >
                    {convertToTemplate.isPending ? "Converting..." : "Convert to Template"}
                  </Button>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Public Templates Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Public Templates
            </CardTitle>
            <CardDescription>
              Browse public story templates and create your own performance instances.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {publicTemplates.map((template) => (
                <Card key={template.id} className="p-4">
                  <h3 className="font-semibold text-lg mb-2">{template.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {template.description}
                  </p>
                  <div className="flex gap-2 mb-3">
                    <Badge variant="outline">{template.genre}</Badge>
                    <Badge variant="secondary">{template.characterRoles?.length || 0} roles</Badge>
                  </div>
                  <div className="space-y-2">
                    <Button 
                      variant="outline"
                      onClick={() => setLocation(`/roleplay-templates/${template.id}`)}
                      size="sm" 
                      className="w-full"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    <Dialog open={showCreateInstance && selectedTemplateId === template.id} onOpenChange={(open) => {
                      setShowCreateInstance(open);
                      if (open) setSelectedTemplateId(template.id);
                    }}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="w-full">
                          Create Instance
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create Collaborative Instance</DialogTitle>
                          <DialogDescription>
                            Create your own performance of "{template.title}" with your chosen cast.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="instanceTitle">Instance Title</Label>
                            <Input
                              id="instanceTitle"
                              value={instanceTitle}
                              onChange={(e) => setInstanceTitle(e.target.value)}
                              placeholder={`My version of ${template.title}`}
                            />
                          </div>
                          <div>
                            <Label htmlFor="language">Language</Label>
                            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select language" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="en-US">English</SelectItem>
                                <SelectItem value="es-ES">Spanish</SelectItem>
                                <SelectItem value="fr-FR">French</SelectItem>
                                <SelectItem value="de-DE">German</SelectItem>
                                <SelectItem value="it-IT">Italian</SelectItem>
                                <SelectItem value="pt-BR">Portuguese</SelectItem>
                                <SelectItem value="ja-JP">Japanese</SelectItem>
                                <SelectItem value="ko-KR">Korean</SelectItem>
                                <SelectItem value="zh-CN">Chinese (Simplified)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Button 
                            onClick={handleCreateInstance}
                            disabled={createInstance.isPending || !instanceTitle.trim()}
                            className="w-full"
                          >
                            {createInstance.isPending ? "Creating..." : "Create Instance"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* My Templates Section */}
        {userTemplates.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>My Templates</CardTitle>
              <CardDescription>
                Templates you've created from your stories.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {userTemplates.map((template) => (
                  <Card key={template.id} className="p-4">
                    <h3 className="font-semibold text-lg mb-2">{template.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {template.description}
                    </p>
                    <div className="flex gap-2 mb-3">
                      <Badge variant="outline">{template.genre}</Badge>
                      <Badge variant="secondary">{template.characterRoles?.length || 0} roles</Badge>
                      <Badge variant={template.isPublic ? "default" : "secondary"}>
                        {template.isPublic ? "Public" : "Private"}
                      </Badge>
                    </div>
                    <Button 
                      variant="outline"
                      onClick={() => setLocation(`/roleplay-templates/${template.id}`)}
                      size="sm" 
                      className="w-full"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Manage Template
                    </Button>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* My Instances Section */}
        {userInstances.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>My Collaborative Instances</CardTitle>
              <CardDescription>
                Performance instances you've created or are participating in.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {userInstances.map((instance) => (
                  <Card key={instance.id} className="p-4">
                    <h3 className="font-semibold text-lg mb-2">{instance.instanceTitle}</h3>
                    <div className="flex gap-2 mb-3">
                      <Badge variant={
                        instance.status === 'completed' ? 'default' :
                        instance.status === 'recording' ? 'secondary' : 'outline'
                      }>
                        {instance.status}
                      </Badge>
                      <Badge variant="outline">
                        {instance.completionPercentage}% complete
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      Participants: {instance.participants?.filter(p => p.userId).length || 0} / {instance.participants?.length || 0}
                    </div>
                    <Button 
                      onClick={() => setLocation(`/roleplay-instances/${instance.id}`)}
                      size="sm" 
                      className="w-full"
                    >
                      Manage Instance
                    </Button>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}