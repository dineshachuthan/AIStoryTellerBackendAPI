import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, Shield, DollarSign } from "lucide-react";

interface VideoConfig {
  duration: {
    default: number;
    minimum: number;
    maximum: number;
    allowUserOverride: boolean;
  };
  supportedProviders: string[];
  activeProvider: string;
}

export function CostProtectionInfo() {
  const { data: config, isLoading } = useQuery<VideoConfig>({
    queryKey: ['/api/videos/config'],
    retry: false,
  });

  if (isLoading) {
    return (
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Cost Protection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading configuration...</div>
        </CardContent>
      </Card>
    );
  }

  if (!config) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Unable to load video configuration. Please refresh the page.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="mb-4 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
          <Shield className="h-4 w-4" />
          Cost Protection Active
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-orange-600" />
          <span className="text-sm font-medium">Duration Limits:</span>
          <Badge variant="outline" className="text-xs border-orange-300">
            Max: {config.duration.maximum}s
          </Badge>
          <Badge variant="outline" className="text-xs border-orange-300">
            Default: {config.duration.default}s
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-orange-600" />
          <span className="text-sm font-medium">Provider:</span>
          <Badge variant="secondary" className="text-xs">
            {config.activeProvider.toUpperCase()}
          </Badge>
        </div>

        <Alert className="border-orange-300 bg-orange-100 dark:border-orange-700 dark:bg-orange-900">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800 dark:text-orange-200">
            <strong>Important:</strong> Video generation is limited to {config.duration.maximum} seconds maximum 
            to control costs. This limit cannot be exceeded without administrator authorization.
          </AlertDescription>
        </Alert>

        <div className="text-xs text-muted-foreground mt-2">
          All video requests are automatically checked for cost protection before processing.
        </div>
      </CardContent>
    </Card>
  );
}