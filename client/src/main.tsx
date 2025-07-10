import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

console.log("React app starting...");

// Simple test component to verify React is working
const TestComponent = () => {
  console.log("TestComponent rendering");
  return (
    <div style={{ 
      backgroundColor: '#4c1d95', 
      color: 'white', 
      padding: '20px',
      fontFamily: 'Arial, sans-serif' 
    }}>
      <h1>React is Working!</h1>
      <p>Loading main app...</p>
    </div>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  console.log("Root element found, creating React root");
  const root = ReactDOM.createRoot(rootElement);
  
  // First render test component, then switch to App after 2 seconds
  root.render(
    <React.StrictMode>
      <TestComponent />
    </React.StrictMode>
  );
  
  // After 2 seconds, switch to the main App
  setTimeout(() => {
    console.log("Switching to main App component");
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }, 2000);
  
  console.log("React app rendered");
} else {
  console.error("Root element not found");
}
