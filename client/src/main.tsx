import React from 'react';
import ReactDOM from 'react-dom/client';

// Debug logging
console.log('main.tsx loading...');
console.log('React:', React);
console.log('ReactDOM:', ReactDOM);

function SimpleApp() {
  return React.createElement('div', {
    style: { padding: '20px', backgroundColor: '#e8f5e8', minHeight: '100vh' }
  }, [
    React.createElement('h1', { key: 'title' }, 'Simple Test App'),
    React.createElement('p', { key: 'desc' }, 'If you see this, React is working!'),
    React.createElement('p', { key: 'time' }, `Current time: ${new Date().toISOString()}`),
    React.createElement('button', { 
      key: 'btn', 
      onClick: () => alert('Button clicked!') 
    }, 'Test Button')
  ]);
}

try {
  console.log('Creating React root...');
  const root = ReactDOM.createRoot(document.getElementById('root')!);
  console.log('Rendering SimpleApp...');
  root.render(React.createElement(SimpleApp));
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
