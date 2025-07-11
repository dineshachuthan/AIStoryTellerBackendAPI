import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from './App';
import "./index.css";

// Create QueryClient instance outside of any component
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Wrap App with QueryClientProvider at the root level
function Root() {
  return (
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </React.StrictMode>
  );
}

// Render the root component
const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<Root />);