import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface EmotionBadgeProps {
  emotion: string;
  intensity?: number;
  variant?: "default" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
  showIntensity?: boolean;
  className?: string;
}

const emotionColors: Record<string, string> = {
  joy: "bg-yellow-100 text-yellow-800 border-yellow-200",
  happiness: "bg-yellow-100 text-yellow-800 border-yellow-200",
  sadness: "bg-blue-100 text-blue-800 border-blue-200",
  grief: "bg-slate-100 text-slate-800 border-slate-200",
  anger: "bg-red-100 text-red-800 border-red-200",
  fear: "bg-purple-100 text-purple-800 border-purple-200",
  anxiety: "bg-purple-100 text-purple-800 border-purple-200",
  love: "bg-pink-100 text-pink-800 border-pink-200",
  curiosity: "bg-orange-100 text-orange-800 border-orange-200",
  wonder: "bg-indigo-100 text-indigo-800 border-indigo-200",
  surprise: "bg-cyan-100 text-cyan-800 border-cyan-200",
  shock: "bg-gray-100 text-gray-800 border-gray-200",
  excitement: "bg-green-100 text-green-800 border-green-200",
  hope: "bg-emerald-100 text-emerald-800 border-emerald-200",
  despair: "bg-stone-100 text-stone-800 border-stone-200",
  melancholy: "bg-violet-100 text-violet-800 border-violet-200",
  nostalgia: "bg-amber-100 text-amber-800 border-amber-200",
  peace: "bg-teal-100 text-teal-800 border-teal-200",
  tension: "bg-red-50 text-red-700 border-red-100",
  relief: "bg-green-50 text-green-700 border-green-100",
};

const intensityOpacity: Record<number, string> = {
  1: "opacity-30",
  2: "opacity-40", 
  3: "opacity-50",
  4: "opacity-60",
  5: "opacity-70",
  6: "opacity-80",
  7: "opacity-85",
  8: "opacity-90",
  9: "opacity-95",
  10: "opacity-100",
};

export function EmotionBadge({ 
  emotion, 
  intensity, 
  variant = "outline",
  size = "md",
  showIntensity = false,
  className 
}: EmotionBadgeProps) {
  const emotionKey = emotion.toLowerCase();
  const colorClass = emotionColors[emotionKey] || "bg-gray-100 text-gray-800 border-gray-200";
  const opacityClass = intensity ? intensityOpacity[intensity] || "opacity-100" : "opacity-100";
  
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-0.5", 
    lg: "text-base px-3 py-1",
  };

  return (
    <Badge 
      variant={variant}
      className={cn(
        variant === "outline" ? colorClass : "",
        sizeClasses[size],
        opacityClass,
        "font-medium",
        className
      )}
    >
      {emotion}
      {showIntensity && intensity && (
        <span className="ml-1 text-xs opacity-75">
          {intensity}/10
        </span>
      )}
    </Badge>
  );
}