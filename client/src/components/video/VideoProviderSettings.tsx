import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, Settings, DollarSign, Clock, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VideoProvider {
  name: string;
  enabled: boolean;
  hasApiKey: boolean;
  capabilities: {
    maxDuration: number;
    supportedFormats: string[];
    supportedStyles: string[];
    supportsCharacters: boolean;
    supportsVoice: boolean;
  };
}

interface ProviderConfig {
  activeProvider: string;
  providers: { [key: string]: VideoProvider };
  fallbackOrder: string[];
}

export function VideoProviderSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedProvider, setSelectedProvider] = useState<string>('');

  const { data: config, isLoading } = useQuery<ProviderConfig>({
    queryKey: ['/api/video/providers/config'],
  });

  const { data: validation } = useQuery<{ [key: string]: boolean }>({
    queryKey: ['/api/video/providers/validate'],
  });

  const { data: costs } = useQuery<{ [key: string]: number }>({
    queryKey: ['/api/video/providers/estimate'],
    queryFn: async () => {
      const response = await fetch('/api/video/providers/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration: 10, quality: 'standard' })
      });
      return response.json();
    }
  });

  const switchProviderMutation = useMutation({
    mutationFn: async (provider: string) => {
      const response = await fetch('/api/video/providers/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider })
      });
      if (!response.ok) throw new Error('Failed to switch provider');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Provider switched",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/video/providers/config'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Switch failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  useEffect(() => {
    if (config && !selectedProvider) {
      setSelectedProvider(config.activeProvider);
    }
  }, [config, selectedProvider]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Video Provider Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!config) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Video Provider Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Unable to load provider configuration.</p>
        </CardContent>
      </Card>
    );
  }

  const availableProviders = Object.entries(config.providers).filter(([_, provider]) => 
    provider.enabled && provider.hasApiKey
  );

  const handleSwitchProvider = () => {
    if (selectedProvider && selectedProvider !== config.activeProvider) {
      switchProviderMutation.mutate(selectedProvider);
    }
  };

  const getProviderDisplayName = (name: string) => {
    const names: { [key: string]: string } = {
      'runwayml': 'RunwayML Gen-3',
      'pika-labs': 'Pika Labs',
      'luma-ai': 'Luma AI Dream Machine'
    };
    return names[name] || name;
  };

  const getProviderDescription = (name: string) => {
    const descriptions: { [key: string]: string } = {
      'runwayml': 'High-quality cinematic videos up to 30 seconds',
      'pika-labs': 'Realistic video generation with great dramatic scenes',
      'luma-ai': 'Professional filmmaking quality with smooth camera movement'
    };
    return descriptions[name] || 'Video generation service';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Video Provider Settings
        </CardTitle>
        <CardDescription>
          Configure and switch between video generation services
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Active Provider */}
        <div>
          <h3 className="text-sm font-medium mb-2">Active Provider</h3>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-green-700 bg-green-100">
              {getProviderDisplayName(config.activeProvider)}
            </Badge>
            {validation?.[config.activeProvider] ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
          </div>
        </div>

        <Separator />

        {/* Provider Selection */}
        {availableProviders.length > 0 ? (
          <div>
            <h3 className="text-sm font-medium mb-2">Switch Provider</h3>
            <div className="flex gap-2">
              <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a provider" />
                </SelectTrigger>
                <SelectContent>
                  {availableProviders.map(([name, provider]) => (
                    <SelectItem key={name} value={name}>
                      {getProviderDisplayName(name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={handleSwitchProvider}
                disabled={!selectedProvider || selectedProvider === config.activeProvider || switchProviderMutation.isPending}
              >
                {switchProviderMutation.isPending ? 'Switching...' : 'Switch'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center text-muted-foreground">
            <p>No video providers configured with API keys.</p>
            <p className="text-sm mt-1">Add API keys to environment variables to enable providers.</p>
          </div>
        )}

        <Separator />

        {/* Provider Capabilities */}
        <div>
          <h3 className="text-sm font-medium mb-3">Available Providers</h3>
          <div className="space-y-3">
            {availableProviders.map(([name, provider]) => (
              <div key={name} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{getProviderDisplayName(name)}</h4>
                    {validation?.[name] ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  {costs?.[name] && costs[name] > 0 && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <DollarSign className="h-3 w-3" />
                      ${costs[name].toFixed(2)} est.
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {getProviderDescription(name)}
                </p>
                <div className="flex gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {provider.capabilities.maxDuration}s max
                  </div>
                  {provider.capabilities.supportsCharacters && (
                    <div className="flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      Characters
                    </div>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {provider.capabilities.supportedFormats.join(', ')}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fallback Order */}
        <div>
          <h3 className="text-sm font-medium mb-2">Fallback Order</h3>
          <div className="flex gap-1">
            {config.fallbackOrder.map((provider, index) => (
              <Badge key={provider} variant="outline" className="text-xs">
                {index + 1}. {getProviderDisplayName(provider)}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            If the active provider fails, the system will try these providers in order.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}