import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Character, Invitation } from '@shared/types/types';
import { User, Mail, Phone, Send } from "lucide-react";

interface CharacterCardProps {
  character: Character;
  invitation?: Invitation | null;
  showInviteButton?: boolean;
  showVoiceInfo?: boolean;
  onInvite?: (character: Character) => void;
  onManageInvitation?: (invitation: Invitation) => void;
  className?: string;
}

export function CharacterCard({
  character,
  invitation,
  showInviteButton = false,
  showVoiceInfo = true,
  onInvite,
  onManageInvitation,
  className = ""
}: CharacterCardProps) {
  return (
    <Card className={`${className}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-medium">{character.name}</h3>
          </div>
          <Badge variant="outline" className="text-xs">
            {character.role}
          </Badge>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {character.description || character.personality}
          </p>
          
          {showVoiceInfo && (
            <p className="text-xs text-muted-foreground">
              Voice: {character.voiceProfile}
            </p>
          )}

          {character.costumeSuggestion && (
            <p className="text-xs text-muted-foreground">
              Costume: {character.costumeSuggestion}
            </p>
          )}

          {character.traits && character.traits.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {character.traits.slice(0, 3).map((trait) => (
                <Badge key={trait} variant="secondary" className="text-xs">
                  {trait}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {invitation && (
          <div className="mt-3 p-2 bg-muted rounded border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                {invitation.contactMethod === "email" ? (
                  <Mail className="w-4 h-4" />
                ) : (
                  <Phone className="w-4 h-4" />
                )}
                <span className="truncate">{invitation.contactValue}</span>
              </div>
              <Badge variant={
                invitation.status === "completed" ? "default" :
                invitation.status === "accepted" ? "secondary" :
                invitation.status === "declined" ? "destructive" : "outline"
              }>
                {invitation.status}
              </Badge>
            </div>
            {onManageInvitation && (
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full mt-2"
                onClick={() => onManageInvitation(invitation)}
              >
                Manage Invitation
              </Button>
            )}
          </div>
        )}

        {showInviteButton && !invitation && onInvite && (
          <Button 
            size="sm" 
            className="w-full"
            onClick={() => onInvite(character)}
          >
            <Send className="w-4 h-4 mr-2" />
            Invite for {character.name}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}