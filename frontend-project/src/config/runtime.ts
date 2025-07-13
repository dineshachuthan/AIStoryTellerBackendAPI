// Runtime configuration that adapts to environment
export const getRuntimeConfig = () => {
  // Check if we're in a Replit environment
  const currentHost = window.location.hostname;
  const isReplit = currentHost.includes('.replit.dev');
  
  // Dynamic configuration based on environment
  
  if (isReplit) {
    // Use current domain for Replit environments
    const protocol = window.location.protocol;
    const domain = `${protocol}//${currentHost}`;
    
    const config = {
      API_URL: '', // Use relative URLs - vite proxy handles routing to backend
      FRONTEND_URL: domain,
      IS_REPLIT: true,
      DOMAIN: currentHost
    };
    
    return config;
  }
  
  // Fallback to environment variables (local development)
  const config = {
    API_URL: import.meta.env.VITE_API_URL || undefined,
    FRONTEND_URL: import.meta.env.VITE_FRONTEND_URL || undefined,
    IS_REPLIT: false,
    DOMAIN: currentHost
  };
  
  return config;
};

// Export singleton instance
export const config = getRuntimeConfig();