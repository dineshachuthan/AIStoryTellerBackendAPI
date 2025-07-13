import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Download } from 'lucide-react';

export function PWAUpdateNotification() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // Listen for service worker updates
    const handleUpdate = (event: CustomEvent<ServiceWorkerRegistration>) => {
      setRegistration(event.detail);
      setShowUpdate(true);
    };

    window.addEventListener('swUpdate' as any, handleUpdate);

    return () => {
      window.removeEventListener('swUpdate' as any, handleUpdate);
    };
  }, []);

  const handleUpdate = () => {
    if (registration && registration.waiting) {
      // Tell the service worker to skip waiting
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      // Reload once the new service worker is active
      registration.waiting.addEventListener('statechange', (e: any) => {
        if (e.target.state === 'activated') {
          window.location.reload();
        }
      });
    }
  };

  const handleDismiss = () => {
    setShowUpdate(false);
  };

  if (!showUpdate) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-card border rounded-lg shadow-lg p-4 flex items-center justify-between gap-4 z-50">
      <div className="flex items-center gap-3">
        <Download className="h-5 w-5 text-primary" />
        <div>
          <p className="font-medium text-sm">Update available!</p>
          <p className="text-xs text-muted-foreground">
            A new version of the app is ready to install.
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button 
          size="sm" 
          variant="default"
          onClick={handleUpdate}
        >
          Update
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={handleDismiss}
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}