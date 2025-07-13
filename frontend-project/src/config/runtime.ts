// Runtime configuration that adapts to environment
export const getRuntimeConfig = () => {
  // Check if we're in a Replit environment
  const currentHost = window.location.hostname;
  const isReplit = currentHost.includes('.replit.dev');
  
  if (isReplit) {
    // Use current domain for Replit environments
    const protocol = window.location.protocol;
    const domain = `${protocol}//${currentHost}`;
    
    return {
      API_URL: domain,
      FRONTEND_URL: domain,
      IS_REPLIT: true,
      DOMAIN: currentHost
    };
  }
  
  // Fallback to environment variables (local development)
  return {
    API_URL: import.meta.env.VITE_API_URL || undefined,
    FRONTEND_URL: import.meta.env.VITE_FRONTEND_URL || undefined,
    IS_REPLIT: false,
    DOMAIN: currentHost
  };
};

// Export singleton instance
export const config = getRuntimeConfig();