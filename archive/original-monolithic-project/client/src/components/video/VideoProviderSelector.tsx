import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings, Check, AlertCircle } from 'lucide-react';
import { toast, toastMessages } from '@/lib/toast-utils';

interface ProviderStatus {
  enabled: boolean;
  priority: number;
  maxDuration: number;
  hasApiKey: boolean;
  isActive: boolean;
}

interface VideoConfig {
  activeProvider: string;
  providers: Record<string, ProviderStatus>;
  fallbackOrder: string[];
}

export function VideoProviderSelector() {
  const [config, setConfig] = useState<VideoConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);


  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/video/config');
      if (!response.ok) {
        throw new Error('Failed to load video configuration');
      }
      const data = await response.json();
      setConfig(data);
    } catch (error) {
      console.error('Error loading video config:', error);
      toast({
        title: "Configuration Error",
        description: "Failed to load video provider configuration",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const switchProvider = async (provider: string) => {
    setSwitching(true);
    try {
      const response = await fetch('/api/video/config/provider', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ provider })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to switch provider');
      }

      const result = await response.json();
      
      // Update local config
      if (config) {
        setConfig({
          ...config,
          activeProvider: provider,
          providers: Object.fromEntries(
            Object.entries(config.providers).map(([name, status]) => [
              name,
              { ...status, isActive: name === provider }
            ])
          )
        });
      }

      toast({
        title: "Provider Switched",
        description: `Video generation now using ${provider}`,
      });
    } catch (error: any) {
      console.error('Error switching provider:', error);
      toast({
        title: "Switch Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSwitching(false);
    }
  };

  const getProviderDisplayName = (provider: string) => {
    const names = {
      'kling': 'Kling AI',
      'runwayml': 'Video Provider B',
      'pika-labs': 'Pika Labs',
      'luma-ai': 'Luma AI'
    };
    return names[provider] || provider;
  };

  const getProviderDescription = (provider: string) => {
    const descriptions = {
      'kling': 'Chinese AI video generator with flexible content policies',
      'runwayml': 'Professional AI video generation with content guidelines',
      'pika-labs': 'Creative AI video generation with artistic focus',
      'luma-ai': 'High-quality AI video generation with realistic output'
    };
    return descriptions[provider] || 'AI video generation service';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Video Provider Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">Loading configuration...</div>
        </CardContent>
      </Card>
    );
  }

  if (!config) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            Configuration Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>Failed to load video provider configuration</p>
        </CardContent>
      </Card>
    );
  }

  const enabledProviders = Object.entries(config.providers)
    .filter(([_, status]) => status.enabled)
    .sort(([_, a], [__, b]) => a.priority - b.priority);

  const disabledProviders = Object.entries(config.providers)
    .filter(([_, status]) => !status.enabled);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Video Provider Settings
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Switch between different AI video generation providers
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Active Provider */}
        <div>
          <h4 className="font-medium mb-2">Active Provider</h4>
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg border">
            <Check className="w-4 h-4 text-green-600" />
            <span className="font-medium">{getProviderDisplayName(config.activeProvider)}</span>
            <Badge variant="secondary">Active</Badge>
          </div>
        </div>

        {/* Provider Selector */}
        {enabledProviders.length > 1 && (
          <div>
            <h4 className="font-medium mb-2">Switch Provider</h4>
            <div className="flex gap-2">
              <Select 
                value={config.activeProvider} 
                onValueChange={switchProvider}
                disabled={switching}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {enabledProviders.map(([provider, status]) => (
                    <SelectItem key={provider} value={provider}>
                      <div className="flex items-center gap-2">
                        {getProviderDisplayName(provider)}
                        {status.isActive && <Check className="w-3 h-3" />}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Available Providers */}
        <div>
          <h4 className="font-medium mb-3">Available Providers</h4>
          <div className="space-y-3">
            {enabledProviders.map(([provider, status]) => (
              <div key={provider} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{getProviderDisplayName(provider)}</span>
                    {status.isActive && <Badge variant="default">Active</Badge>}
                    <Badge variant="outline">Max: {status.maxDuration}s</Badge>
                  </div>
                  {!status.isActive && enabledProviders.length > 1 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => switchProvider(provider)}
                      disabled={switching}
                    >
                      {switching ? 'Switching...' : 'Use This'}
                    </Button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {getProviderDescription(provider)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Disabled Providers */}
        {disabledProviders.length > 0 && (
          <div>
            <h4 className="font-medium mb-3">Unavailable Providers</h4>
            <div className="space-y-2">
              {disabledProviders.map(([provider, status]) => (
                <div key={provider} className="border rounded-lg p-3 opacity-50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{getProviderDisplayName(provider)}</span>
                    <Badge variant="secondary">API Key Required</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {getProviderDescription(provider)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fallback Order */}
        <div>
          <h4 className="font-medium mb-2">Fallback Order</h4>
          <div className="flex flex-wrap gap-2">
            {config.fallbackOrder.map((provider, index) => {
              const isEnabled = config.providers[provider]?.enabled;
              return (
                <div key={provider} className="flex items-center gap-1">
                  <Badge variant={isEnabled ? "outline" : "secondary"}>
                    {index + 1}. {getProviderDisplayName(provider)}
                  </Badge>
                  {index < config.fallbackOrder.length - 1 && (
                    <span className="text-muted-foreground">→</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}