import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Debug logging
console.log('main.tsx loading...');
console.log('React:', React);
console.log('ReactDOM:', ReactDOM);

try {
  console.log('Creating React root...');
  const root = ReactDOM.createRoot(document.getElementById('root')!);
  console.log('Rendering App...');
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log('App rendered successfully');
} catch (error) {
  console.error('Error during React initialization:', error);
  // Fallback rendering
  document.getElementById('root')!.innerHTML = `
    <div style="padding: 20px; background: #ffebee; border: 1px solid #f44336; margin: 20px;">
      <h2>React Loading Error</h2>
      <p>Error: ${error instanceof Error ? error.message : 'Unknown error'}</p>
      <p>Stack: ${error instanceof Error ? error.stack : 'No stack trace'}</p>
    </div>
  `;
}
