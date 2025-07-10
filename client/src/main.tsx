import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

console.log("React app starting...");

const rootElement = document.getElementById('root');
if (rootElement) {
  console.log("Root element found, creating React root");
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log("React app rendered");
} else {
  console.error("Root element not found");
}
