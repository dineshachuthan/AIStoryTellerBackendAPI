import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api-client";
import AppTopNavigation from "@/components/app-top-navigation";
import { getMessage } from '@shared/utils/i18n-hierarchical';
import { useLanguage } from "@/contexts/language-context";

interface NarratorProfile {
  language: string;
  dialect?: string;
  accent?: string;
  slangLevel: 'none' | 'light' | 'moderate' | 'heavy';
  codeSwitch: boolean;
  formalityLevel: 'casual' | 'neutral' | 'formal';
}

export default function NarratorProfilePage() {
  const { language: uiLanguage } = useLanguage();
  const { toast } = useToast();
  
  // Fetch user data to get current language preference
  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
  });
  
  const [profile, setProfile] = useState<NarratorProfile>({
    language: 'en',
    dialect: undefined,
    accent: undefined,
    slangLevel: 'none',
    codeSwitch: false,
    formalityLevel: 'neutral'
  });

  // Load saved narrator profile
  const { data: savedProfile } = useQuery({
    queryKey: ["/api/user/narrator-profile"],
    enabled: !!user,
  });

  useEffect(() => {
    if (savedProfile) {
      setProfile(savedProfile);
    } else if (user?.language) {
      setProfile(prev => ({ ...prev, language: user.language }));
    }
  }, [savedProfile, user]);

  // Save narrator profile
  const saveProfileMutation = useMutation({
    mutationFn: async (profile: NarratorProfile) => {
      return apiClient.user.saveNarratorProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/narrator-profile"] });
      toast({
        title: "Success",
        description: "Narrator profile saved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save narrator profile",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveProfileMutation.mutate(profile);
  };

  // Dynamic dialect options based on selected language
  const getDialectOptions = () => {
    switch (profile.language) {
      case 'en':
        return [
          { value: 'standard', label: 'Standard English' },
          { value: 'indian-english', label: 'Indian English' },
          { value: 'british', label: 'British English' },
          { value: 'american', label: 'American English' },
        ];
      case 'hi':
        return [
          { value: 'standard', label: 'Standard Hindi' },
          { value: 'american-hindi', label: 'Hindi with American Accent' },
          { value: 'delhi', label: 'Delhi Hindi' },
          { value: 'mumbai', label: 'Mumbai Hindi' },
        ];
      case 'ta':
        return [
          { value: 'standard', label: 'Standard Tamil' },
          { value: 'tamil-english', label: 'Tamil with English Mix' },
          { value: 'chennai', label: 'Chennai Tamil' },
          { value: 'madurai', label: 'Madurai Tamil' },
        ];
      default:
        return [];
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppTopNavigation />
      
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Narrator Voice Profile</CardTitle>
            <CardDescription>
              Customize how your stories are narrated. These settings affect the voice personality and speaking style.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Primary Language */}
            <div className="space-y-2">
              <Label htmlFor="language">Primary Language</Label>
              <Select
                value={profile.language}
                onValueChange={(value) => setProfile(prev => ({ 
                  ...prev, 
                  language: value,
                  dialect: undefined // Reset dialect when language changes
                }))}
              >
                <SelectTrigger id="language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="hi">Hindi</SelectItem>
                  <SelectItem value="ta">Tamil</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                  <SelectItem value="ja">Japanese</SelectItem>
                  <SelectItem value="ko">Korean</SelectItem>
                  <SelectItem value="zh">Chinese</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Dialect Style */}
            <div className="space-y-2">
              <Label htmlFor="dialect">Dialect Style</Label>
              <Select
                value={profile.dialect || 'standard'}
                onValueChange={(value) => setProfile(prev => ({ ...prev, dialect: value }))}
              >
                <SelectTrigger id="dialect">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getDialectOptions().map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Slang Level */}
            <div className="space-y-2">
              <Label htmlFor="slang">Slang Level</Label>
              <Select
                value={profile.slangLevel}
                onValueChange={(value: any) => setProfile(prev => ({ ...prev, slangLevel: value }))}
              >
                <SelectTrigger id="slang">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Slang</SelectItem>
                  <SelectItem value="light">Light Slang</SelectItem>
                  <SelectItem value="moderate">Moderate Slang</SelectItem>
                  <SelectItem value="heavy">Heavy Slang</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                How much cultural expressions and informal language to include
              </p>
            </div>

            {/* Formality Level */}
            <div className="space-y-2">
              <Label htmlFor="formality">Formality Level</Label>
              <Select
                value={profile.formalityLevel}
                onValueChange={(value: any) => setProfile(prev => ({ ...prev, formalityLevel: value }))}
              >
                <SelectTrigger id="formality">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                  <SelectItem value="formal">Formal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Code Switching */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="codeswitch">Code Switching</Label>
                <p className="text-sm text-muted-foreground">
                  Mix languages naturally (e.g., Hindi words in English narration)
                </p>
              </div>
              <Switch
                id="codeswitch"
                checked={profile.codeSwitch}
                onCheckedChange={(checked) => setProfile(prev => ({ ...prev, codeSwitch: checked }))}
              />
            </div>

            {/* Preview Text */}
            <div className="space-y-2 pt-4 border-t">
              <Label>Preview</Label>
              <Card className="p-4 bg-muted">
                <p className="text-sm">
                  {profile.language === 'en' && profile.dialect === 'indian-english' && profile.slangLevel !== 'none' && (
                    `"The story begins, yaar! Our hero was walking down the street only, when suddenly something happened, na?"`
                  )}
                  {profile.language === 'en' && profile.dialect === 'indian-english' && profile.slangLevel === 'none' && (
                    `"The story begins. Our hero was walking down the street when suddenly something happened."`
                  )}
                  {profile.language === 'hi' && (
                    `"कहानी शुरू होती है। हमारा हीरो सड़क पर चल रहा था जब अचानक कुछ हुआ।"`
                  )}
                  {profile.language === 'ta' && (
                    `"கதை தொடங்குகிறது. நம் ஹீரோ தெருவில் நடந்து கொண்டிருந்தார், திடீரென்று ஏதோ நடந்தது."`
                  )}
                  {profile.language === 'en' && !profile.dialect && (
                    `"The story begins. Our hero was walking down the street when suddenly something happened."`
                  )}
                </p>
              </Card>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4">
              <Button 
                onClick={handleSave}
                disabled={saveProfileMutation.isPending}
              >
                {saveProfileMutation.isPending ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}