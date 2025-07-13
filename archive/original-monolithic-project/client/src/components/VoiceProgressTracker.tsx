import { useQuery } from '@tanstack/react-query';
import { Progress } from '@/components/ui/progress';
import { VOICE_TYPES, MIN_SAMPLES_FOR_VOICE } from '@shared/config/ephemeral-voice-config';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface VoiceProgress {
  voiceType: string;
  recordedCount: number;
  requiredCount: number;
}

export function VoiceProgressTracker() {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Fetch voice progress for all voice types
  const { data: progress = [] } = useQuery<VoiceProgress[]>({
    queryKey: ['/api/user/voice-progress'],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Calculate if any voice is ready
  const hasCompleteVoice = progress.some(p => p.recordedCount >= p.requiredCount);

  return (
    <div className="fixed top-14 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-b">
      <div 
        className="container mx-auto px-4 py-2 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            {/* Compact view - show first 3 voice types */}
            {progress.slice(0, 3).map((voiceProgress) => {
              const voiceType = VOICE_TYPES.find(v => v.id === voiceProgress.voiceType);
              if (!voiceType) return null;
              
              const percentage = (voiceProgress.recordedCount / voiceProgress.requiredCount) * 100;
              const isComplete = voiceProgress.recordedCount >= voiceProgress.requiredCount;
              
              return (
                <div key={voiceType.id} className="flex items-center gap-2">
                  <span className="text-lg">{voiceType.icon}</span>
                  <span className="text-sm font-medium hidden sm:inline">
                    {voiceType.name.split(' ')[0]}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {voiceProgress.recordedCount}/{voiceProgress.requiredCount}
                  </span>
                  <Progress 
                    value={percentage} 
                    className={`w-16 h-2 ${isComplete ? 'bg-green-100' : ''}`}
                  />
                  {isComplete && <span className="text-green-500 text-xs">✓</span>}
                </div>
              );
            })}
            
            {progress.length > 3 && (
              <span className="text-xs text-muted-foreground">
                +{progress.length - 3} more
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {hasCompleteVoice && (
              <span className="text-xs text-green-600 font-medium animate-pulse">
                Voice ready!
              </span>
            )}
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>
      </div>
      
      {/* Expanded view - show all voice types */}
      {isExpanded && (
        <div className="container mx-auto px-4 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
            {progress.map((voiceProgress) => {
              const voiceType = VOICE_TYPES.find(v => v.id === voiceProgress.voiceType);
              if (!voiceType) return null;
              
              const percentage = (voiceProgress.recordedCount / voiceProgress.requiredCount) * 100;
              const isComplete = voiceProgress.recordedCount >= voiceProgress.requiredCount;
              
              return (
                <div 
                  key={voiceType.id} 
                  className={`p-3 rounded-lg border ${isComplete ? 'bg-green-50 border-green-300 dark:bg-green-950/20' : 'bg-gray-50 dark:bg-gray-900'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{voiceType.icon}</span>
                      <div>
                        <p className="font-medium">{voiceType.name}</p>
                        <p className="text-xs text-muted-foreground">{voiceType.description}</p>
                      </div>
                    </div>
                    {isComplete && <span className="text-green-600 text-lg">✓</span>}
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>Progress</span>
                      <span className="font-medium">
                        {voiceProgress.recordedCount}/{voiceProgress.requiredCount} samples
                      </span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="mt-3 text-center">
            <p className="text-sm text-muted-foreground">
              Record {MIN_SAMPLES_FOR_VOICE} emotion samples for each voice type to unlock
            </p>
          </div>
        </div>
      )}
    </div>
  );
}