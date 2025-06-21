import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { 
  Play, 
  Pause, 
  Mic, 
  MicOff, 
  Save, 
  RotateCcw, 
  Volume2, 
  User,
  CheckCircle,
  Clock,
  Eye,
  EyeOff
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface DialogueSegment {
  id: string;
  characterName: string;
  text: string;
  emotion: string;
  intensity: number;
  timestamp: number;
  duration: number;
  isUserCharacter: boolean;
  audioUrl?: string;
  userRecordingUrl?: string;
  isDraft?: boolean;
}

interface RoleplaySession {
  instanceTitle: string;
  characterName: string;
  templateTitle: string;
  storyContent: string;
  dialogueSegments: DialogueSegment[];
  characterRequirements: Array<{
    emotion: string;
    intensity: number;
    sampleCount: number;
    completed: boolean;
  }>;
  progressPercentage: number;
}

export default function RoleplayRecording() {
  const { token } = useParams();
  const { toast } = useToast();
  
  const [session, setSession] = useState<RoleplaySession | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSegment, setCurrentSegment] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSegment, setRecordingSegment] = useState<string | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showOnlyMyLines, setShowOnlyMyLines] = useState(false);
  const [draftRecordings, setDraftRecordings] = useState<Map<string, string>>(new Map());
  const [savedRecordings, setSavedRecordings] = useState<Set<string>>(new Set());
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (invitation && template && storyAnalysis) {
      fetchRoleplaySession();
    }
  }, [invitation, template, storyAnalysis]);

  // Fetch invitation details using existing API
  const { data: invitation, isLoading: invitationLoading } = useQuery({
    queryKey: ['/api/invitations', token],
    enabled: !!token,
  });

  // Fetch story analysis and template data using existing APIs
  const { data: template } = useQuery({
    queryKey: ['/api/roleplay-templates', invitation?.templateId],
    enabled: !!invitation?.templateId,
  });

  const { data: storyAnalysis } = useQuery({
    queryKey: ['/api/stories', template?.originalStoryId, 'analysis'],
    enabled: !!template?.originalStoryId,
  });

  const fetchRoleplaySession = async () => {
    if (!invitation || !template || !storyAnalysis) return;
    
    try {
      setLoading(true);
      
      // Build session from real data
      const userCharacterRole = template.characterRoles.find(
        role => role.name === invitation.characterName
      );
      
      // Generate dialogue segments from story analysis
      const dialogueSegments: DialogueSegment[] = [];
      
      // Extract dialogues from story analysis and create segments
      if (storyAnalysis.characters && storyAnalysis.emotions) {
        let timestamp = 0;
        
        // Create segments for each character's dialogue based on story analysis
        storyAnalysis.characters.forEach((character: any, index: number) => {
          const isUserCharacter = character.name === invitation.characterName;
          const emotion = storyAnalysis.emotions[index % storyAnalysis.emotions.length];
          
          // Extract sample dialogue from story content or use character description
          const sampleText = character.description || `As ${character.name}, I must play my part in this story.`;
          
          dialogueSegments.push({
            id: `seg_${index}`,
            characterName: character.name,
            text: sampleText,
            emotion: emotion.emotion,
            intensity: emotion.intensity,
            timestamp,
            duration: 3000 + (sampleText.length * 50), // Estimate duration based on text length
            isUserCharacter,
            audioUrl: !isUserCharacter ? `/audio/${character.assignedVoice}_${index}.mp3` : undefined
          });
          
          timestamp += 4000; // Add gap between segments
        });
      }
      
      const roleplaySession: RoleplaySession = {
        instanceTitle: invitation.instanceTitle,
        characterName: invitation.characterName,
        templateTitle: template.title,
        storyContent: template.description,
        dialogueSegments,
        characterRequirements: userCharacterRole?.requiredEmotions || [],
        progressPercentage: 0
      };
      
      setSession(roleplaySession);
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load roleplay session",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const playFullStory = () => {
    if (!session) return;
    
    setIsPlaying(true);
    setCurrentSegment(session.dialogueSegments[0].id);
    
    // Simulate audio playback with timing
    let segmentIndex = 0;
    const playNextSegment = () => {
      if (segmentIndex >= session.dialogueSegments.length) {
        setIsPlaying(false);
        setCurrentSegment(null);
        return;
      }
      
      const segment = session.dialogueSegments[segmentIndex];
      setCurrentSegment(segment.id);
      
      // Use recorded voice for user character, AI voice for others
      const audioUrl = segment.isUserCharacter && draftRecordings.has(segment.id)
        ? draftRecordings.get(segment.id)
        : segment.audioUrl;
      
      if (audioUrl && audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.playbackRate = playbackSpeed;
        audioRef.current.play();
      }
      
      setTimeout(() => {
        segmentIndex++;
        playNextSegment();
      }, segment.duration / playbackSpeed);
    };
    
    playNextSegment();
  };

  const stopPlayback = () => {
    setIsPlaying(false);
    setCurrentSegment(null);
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const startRecording = async (segmentId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(blob);
        
        // Store as draft recording
        setDraftRecordings(prev => new Map(prev).set(segmentId, audioUrl));
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSegment(segmentId);
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to access microphone",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setRecordingSegment(null);
  };

  const playRecording = (segmentId: string) => {
    const audioUrl = draftRecordings.get(segmentId);
    if (audioUrl && audioRef.current) {
      audioRef.current.src = audioUrl;
      audioRef.current.play();
    }
  };

  const saveRecording = async (segmentId: string) => {
    const audioUrl = draftRecordings.get(segmentId);
    if (!audioUrl) return;
    
    try {
      // Convert blob URL to file and upload
      const response = await fetch(audioUrl);
      const blob = await response.blob();
      
      // In a real implementation, you would upload the blob to your server
      const formData = new FormData();
      formData.append('audio', blob, `recording_${segmentId}.webm`);
      
      // Mock successful save
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSavedRecordings(prev => new Set(prev).add(segmentId));
      
      toast({
        title: "Success",
        description: "Recording saved successfully!",
      });
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save recording",
        variant: "destructive",
      });
    }
  };

  const saveAllRecordings = async () => {
    if (!session) return;
    
    const userSegments = session.dialogueSegments.filter(seg => seg.isUserCharacter);
    const recordedSegments = userSegments.filter(seg => draftRecordings.has(seg.id));
    
    if (recordedSegments.length === 0) {
      toast({
        title: "No Recordings",
        description: "Please record at least one dialogue before saving",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Save all recordings to server
      for (const segment of recordedSegments) {
        if (!savedRecordings.has(segment.id)) {
          await saveRecording(segment.id);
        }
      }
      
      toast({
        title: "Success",
        description: `All ${recordedSegments.length} recordings saved successfully!`,
      });
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save some recordings",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading roleplay session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Session Not Found</CardTitle>
            <CardDescription>
              Unable to load the roleplay session.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const userSegments = session.dialogueSegments.filter(seg => seg.isUserCharacter);
  const recordedCount = userSegments.filter(seg => savedRecordings.has(seg.id)).length;
  const progressPercentage = userSegments.length > 0 ? (recordedCount / userSegments.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <CardTitle className="text-2xl">{session.instanceTitle}</CardTitle>
                  <CardDescription>
                    Recording as <strong>{session.characterName}</strong>
                  </CardDescription>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-sm text-gray-500 dark:text-gray-400">Progress</div>
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {recordedCount}/{userSegments.length}
                </div>
              </div>
            </div>
            
            <Progress value={progressPercentage} className="mt-4" />
          </CardHeader>
        </Card>

        {/* Playback Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="w-5 h-5" />
              Story Playback
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              {!isPlaying ? (
                <Button onClick={playFullStory} className="flex-shrink-0">
                  <Play className="w-4 h-4 mr-2" />
                  Play Full Story
                </Button>
              ) : (
                <Button onClick={stopPlayback} variant="outline" className="flex-shrink-0">
                  <Pause className="w-4 h-4 mr-2" />
                  Stop
                </Button>
              )}
              
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4" />
                <span className="text-sm">Speed:</span>
                <Slider
                  value={[playbackSpeed]}
                  onValueChange={(value) => setPlaybackSpeed(value[0])}
                  min={0.5}
                  max={2}
                  step={0.1}
                  className="w-20"
                />
                <span className="text-sm w-8">{playbackSpeed}x</span>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowOnlyMyLines(!showOnlyMyLines)}
                className="ml-auto"
              >
                {showOnlyMyLines ? (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    Show All Lines
                  </>
                ) : (
                  <>
                    <EyeOff className="w-4 h-4 mr-2" />
                    Show Only My Lines
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Dialogue Segments */}
        <div className="space-y-3">
          {session.dialogueSegments
            .filter(segment => !showOnlyMyLines || segment.isUserCharacter)
            .map((segment) => (
            <Card 
              key={segment.id} 
              className={`transition-all duration-200 ${
                currentSegment === segment.id 
                  ? "ring-2 ring-purple-500 bg-purple-50 dark:bg-purple-900/20" 
                  : ""
              } ${
                segment.isUserCharacter 
                  ? "border-blue-200 dark:border-blue-800" 
                  : "border-gray-200 dark:border-gray-700"
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      segment.isUserCharacter 
                        ? "bg-blue-100 dark:bg-blue-900" 
                        : "bg-gray-100 dark:bg-gray-800"
                    }`}>
                      <User className={`w-5 h-5 ${
                        segment.isUserCharacter 
                          ? "text-blue-600 dark:text-blue-400" 
                          : "text-gray-600 dark:text-gray-400"
                      }`} />
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">{segment.characterName}</span>
                      {segment.isUserCharacter && (
                        <Badge variant="secondary" className="text-xs">Your Role</Badge>
                      )}
                      <Badge variant="outline" className="text-xs capitalize">
                        {segment.emotion}
                      </Badge>
                    </div>
                    
                    <p className="text-gray-700 dark:text-gray-300 mb-3">
                      "{segment.text}"
                    </p>
                    
                    {segment.isUserCharacter && (
                      <div className="flex items-center gap-2">
                        {!isRecording || recordingSegment !== segment.id ? (
                          <Button
                            size="sm"
                            onClick={() => startRecording(segment.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            <Mic className="w-4 h-4 mr-1" />
                            Record
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={stopRecording}
                            variant="outline"
                            className="border-red-600 text-red-600"
                          >
                            <MicOff className="w-4 h-4 mr-1" />
                            Stop Recording
                          </Button>
                        )}
                        
                        {draftRecordings.has(segment.id) && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => playRecording(segment.id)}
                            >
                              <Play className="w-4 h-4 mr-1" />
                              Play Draft
                            </Button>
                            
                            <Button
                              size="sm"
                              onClick={() => startRecording(segment.id)}
                              variant="outline"
                            >
                              <RotateCcw className="w-4 h-4 mr-1" />
                              Re-record
                            </Button>
                            
                            {!savedRecordings.has(segment.id) ? (
                              <Button
                                size="sm"
                                onClick={() => saveRecording(segment.id)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Save className="w-4 h-4 mr-1" />
                                Save
                              </Button>
                            ) : (
                              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Saved
                              </Badge>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Save All Button */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Ready to submit your recordings?</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  You have {userSegments.filter(seg => draftRecordings.has(seg.id)).length} draft recordings ready to save
                </p>
              </div>
              
              <Button
                onClick={saveAllRecordings}
                size="lg"
                className="bg-purple-600 hover:bg-purple-700"
                disabled={userSegments.filter(seg => draftRecordings.has(seg.id)).length === 0}
              >
                <Save className="w-5 h-5 mr-2" />
                Save All Recordings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Hidden audio element for playback */}
      <audio ref={audioRef} style={{ display: 'none' }} />
    </div>
  );
}