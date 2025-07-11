import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

// Debug logging
console.log('main.tsx loading...');
console.log('React:', React);
console.log('ReactDOM:', ReactDOM);

function SimpleApp() {
  return (
    <div style={{ padding: '20px', backgroundColor: '#e8f5e8', minHeight: '100vh' }}>
      <h1>Simple Test App</h1>
      <p>If you see this, React is working!</p>
      <p>Current time: {new Date().toISOString()}</p>
      <button onClick={() => alert('Button clicked!')}>Test Button</button>
    </div>
  );
}

try {
  console.log('Creating React root...');
  const root = ReactDOM.createRoot(document.getElementById('root')!);
  console.log('Rendering SimpleApp...');
  root.render(
    <React.StrictMode>
      <SimpleApp />
    </React.StrictMode>
  );
  console.log('SimpleApp rendered successfully');
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
