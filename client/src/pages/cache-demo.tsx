import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Clock, Hash, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

interface CacheInfo {
  storyId: number;
  contentLength: number;
  analysisTimestamp: string;
  cacheStrategy: string;
}

interface AnalysisResult {
  analysis: any;
  cacheInfo: CacheInfo;
}

export default function CacheDemo() {
  const [storyId, setStoryId] = useState("123");
  const [content, setContent] = useState(`Once upon a time, in a small village nestled between rolling hills and a sparkling river, there lived a young girl named Luna. She had always been curious about the mysterious forest that bordered her hometown, where ancient trees whispered secrets and strange lights danced among the branches at night.

One evening, as Luna sat by her bedroom window gazing at the stars, she noticed an unusual blue glow emanating from deep within the forest. Her heart raced with excitement and a touch of fear. Despite her parents' warnings about the dangers that lurked in those woods, Luna felt an irresistible pull toward the mysterious light.

The next morning, Luna packed a small bag with some bread, water, and her grandmother's compass. As she approached the forest edge, she took a deep breath and stepped into the shadows between the towering trees. The deeper she ventured, the more magical everything seemed - flowers that chimed like bells, butterflies with wings that sparkled like jewels, and streams that seemed to hum gentle melodies.

After hours of walking, Luna finally discovered the source of the blue glow. In a clearing stood an ancient oak tree, its trunk wider than a house, with bioluminescent moss covering its bark. At its base sat a small, shimmering creature that looked like a cross between a fox and a dragon, with scales that reflected the moonlight even in daylight.

The creature looked up at Luna with wise, knowing eyes and spoke in a voice like wind chimes, "I have been waiting for you, Luna. You have the heart of an explorer and the soul of a protector. This forest needs someone like you to help preserve its magic for future generations."

Luna's eyes widened with wonder as she realized this was the beginning of the greatest adventure of her life.`);
  const [lastHash, setLastHash] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mutation for enhanced analysis with cache invalidation
  const enhancedAnalysisMutation = useMutation({
    mutationFn: async ({ storyId, content }: { storyId: number, content: string }) => {
      const response = await fetch(`/api/stories/${storyId}/analyze-with-cache`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      
      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`);
      }
      
      return response.json() as Promise<AnalysisResult>;
    },
    onSuccess: (data) => {
      setLastHash(generateSimpleHash(content));
      toast({
        title: "Analysis Complete",
        description: `Story ${data.cacheInfo.storyId} analyzed using ${data.cacheInfo.cacheStrategy} strategy`
      });
    },
    onError: (error) => {
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    }
  });

  // Simple hash function for frontend demonstration
  const generateSimpleHash = (text: string): string => {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).substring(0, 12);
  };

  const currentHash = generateSimpleHash(content);
  const contentChanged = lastHash && lastHash !== currentHash;

  const handleAnalyze = () => {
    enhancedAnalysisMutation.mutate({ 
      storyId: parseInt(storyId), 
      content 
    });
  };

  const handleModifyContent = () => {
    const modifications = [
      "\n\nSuddenly, a gentle breeze carried the scent of jasmine through the air.",
      "\n\nThe creature's scales shimmered with different colors as it moved.",
      "\n\nLuna felt a warm sensation in her heart, as if magic was awakening within her.",
      "\n\nDistant thunder rumbled, but the sky remained crystal clear.",
      "\n\nThe ancient oak's leaves rustled, speaking in a language Luna almost understood."
    ];
    
    const randomModification = modifications[Math.floor(Math.random() * modifications.length)];
    setContent(prev => prev + randomModification);
    
    toast({
      title: "Content Modified",
      description: "Story content has been changed. Cache invalidation will trigger on next analysis."
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          
          {/* Header */}
          <Card className="border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-3 text-2xl text-blue-900 dark:text-blue-100">
                <Hash className="w-8 h-8" />
                Content Hash Cache Invalidation Demo
              </CardTitle>
              <p className="text-blue-700 dark:text-blue-300 mt-2">
                Demonstration of SHA256-based cache invalidation system for story analysis
              </p>
            </CardHeader>
          </Card>

          {/* Content Hash Status */}
          <Card className="border-2 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="w-5 h-5" />
                Content Hash Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Story ID</label>
                  <Input
                    value={storyId}
                    onChange={(e) => setStoryId(e.target.value)}
                    placeholder="Enter story ID"
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Current Hash</label>
                  <div className="px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-md border font-mono text-sm">
                    {currentHash}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cache Status</label>
                  <div className="flex items-center gap-2">
                    {contentChanged ? (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Cache Invalid
                      </Badge>
                    ) : lastHash ? (
                      <Badge variant="default" className="flex items-center gap-1 bg-green-600">
                        <CheckCircle className="w-3 h-3" />
                        Cache Valid
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        No Cache
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {contentChanged && (
                <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800 dark:text-orange-200">
                    Content has been modified since last analysis. Next analysis will trigger cache invalidation and generate fresh results.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Story Content Editor */}
          <Card>
            <CardHeader>
              <CardTitle>Story Content</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Modify the content below to see cache invalidation in action
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-96 font-mono text-sm"
                placeholder="Enter your story content here..."
              />
              
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={handleAnalyze}
                  disabled={enhancedAnalysisMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {enhancedAnalysisMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Hash className="w-4 h-4 mr-2" />
                      Analyze with Cache Check
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={handleModifyContent}
                  variant="outline"
                  disabled={enhancedAnalysisMutation.isPending}
                >
                  Add Random Content
                </Button>
                
                <Button
                  onClick={() => {
                    setContent("");
                    setLastHash(null);
                  }}
                  variant="outline"
                  disabled={enhancedAnalysisMutation.isPending}
                >
                  Clear Content
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Analysis Results */}
          {enhancedAnalysisMutation.data && (
            <Card className="border-2 border-green-200 dark:border-green-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-900 dark:text-green-100">
                  <CheckCircle className="w-5 h-5" />
                  Analysis Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Cache Information</h4>
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md space-y-1 text-sm">
                      <div><strong>Story ID:</strong> {enhancedAnalysisMutation.data.cacheInfo.storyId}</div>
                      <div><strong>Content Length:</strong> {enhancedAnalysisMutation.data.cacheInfo.contentLength} chars</div>
                      <div><strong>Strategy:</strong> {enhancedAnalysisMutation.data.cacheInfo.cacheStrategy}</div>
                      <div><strong>Timestamp:</strong> {new Date(enhancedAnalysisMutation.data.cacheInfo.analysisTimestamp).toLocaleString()}</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Analysis Summary</h4>
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md space-y-1 text-sm">
                      <div><strong>Title:</strong> {enhancedAnalysisMutation.data.analysis.title}</div>
                      <div><strong>Genre:</strong> {enhancedAnalysisMutation.data.analysis.genre}</div>
                      <div><strong>Characters:</strong> {enhancedAnalysisMutation.data.analysis.characters?.length || 0}</div>
                      <div><strong>Emotions:</strong> {enhancedAnalysisMutation.data.analysis.emotions?.length || 0}</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Story Summary</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                    {enhancedAnalysisMutation.data.analysis.summary}
                  </p>
                </div>

                {enhancedAnalysisMutation.data.analysis.emotions && enhancedAnalysisMutation.data.analysis.emotions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Detected Emotions</h4>
                    <div className="flex flex-wrap gap-2">
                      {enhancedAnalysisMutation.data.analysis.emotions.slice(0, 8).map((emotion: any, index: number) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {emotion.emotion} ({emotion.intensity}/10)
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Technical Information */}
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader>
              <CardTitle className="text-lg">How It Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Content Hash Cache Invalidation</h4>
                  <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                    <li>• SHA256 hash generated for story content</li>
                    <li>• Database stores analysis with content hash</li>
                    <li>• Hash comparison detects content changes</li>
                    <li>• Automatic cache invalidation on modifications</li>
                    <li>• Prevents unnecessary OpenAI API calls</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Performance Benefits</h4>
                  <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                    <li>• Database-backed persistent caching</li>
                    <li>• Cache survives server restarts</li>
                    <li>• Intelligent content change detection</li>
                    <li>• Cost optimization for AI analysis</li>
                    <li>• Scalable for millions of stories</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}