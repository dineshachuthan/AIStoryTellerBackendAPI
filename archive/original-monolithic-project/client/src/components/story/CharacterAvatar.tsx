import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CharacterAvatarProps {
  character: {
    name: string;
    role: 'protagonist' | 'antagonist' | 'supporting' | 'narrator' | 'other';
    appearance?: string;
    assignedVoice?: string;
    voiceSampleId?: number;
  };
  size?: "sm" | "md" | "lg" | "xl";
  showRole?: boolean;
  showVoice?: boolean;
  className?: string;
  onClick?: () => void;
}

const roleColors: Record<string, string> = {
  protagonist: "bg-blue-100 text-blue-800 border-blue-200",
  antagonist: "bg-red-100 text-red-800 border-red-200", 
  supporting: "bg-green-100 text-green-800 border-green-200",
  narrator: "bg-purple-100 text-purple-800 border-purple-200",
  other: "bg-gray-100 text-gray-800 border-gray-200",
};

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-10 w-10", 
  lg: "h-12 w-12",
  xl: "h-16 w-16",
};

export function CharacterAvatar({ 
  character, 
  size = "md",
  showRole = false,
  showVoice = false,
  className,
  onClick 
}: CharacterAvatarProps) {
  const initials = character.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const roleColor = roleColors[character.role] || roleColors.other;

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div className="relative">
        <Avatar 
          className={cn(sizeClasses[size], onClick && "cursor-pointer hover:ring-2 hover:ring-primary")}
          onClick={onClick}
        >
          <AvatarImage 
            src={character.appearance} 
            alt={character.name}
          />
          <AvatarFallback className="font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        
        {showRole && (
          <Badge 
            variant="outline"
            className={cn(
              "absolute -bottom-1 -right-1 text-xs px-1 py-0",
              roleColor
            )}
          >
            {character.role[0].toUpperCase()}
          </Badge>
        )}
      </div>
      
      <div className="text-center space-y-1">
        <p className={cn(
          "font-medium truncate max-w-20",
          size === "sm" ? "text-xs" : "text-sm"
        )}>
          {character.name}
        </p>
        
        {showVoice && (
          <div className="space-y-1">
            {character.voiceSampleId ? (
              <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                Your Voice
              </Badge>
            ) : character.assignedVoice ? (
              <Badge variant="outline" className="text-xs">
                AI: {character.assignedVoice}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                No Voice
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
}