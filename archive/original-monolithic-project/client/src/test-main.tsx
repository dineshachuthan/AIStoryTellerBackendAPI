import React from 'react';
import ReactDOM from 'react-dom/client';

// Debug logging for test entry point
console.log('=== TEST ENTRY POINT LOADING ===');
console.log('React:', React);
console.log('ReactDOM:', ReactDOM);

function TestApp() {
  return React.createElement('div', {
    style: { 
      padding: '20px', 
      backgroundColor: '#FFE5B4', 
      minHeight: '100vh',
      fontFamily: 'Arial, sans-serif'
    }
  }, [
    React.createElement('h1', { key: 'title' }, '🎯 TEST ENTRY POINT SUCCESS'),
    React.createElement('p', { key: 'desc' }, 'This is a completely new entry point - no QueryClientProvider!'),
    React.createElement('p', { key: 'time' }, `Current time: ${new Date().toISOString()}`),
    React.createElement('button', { 
      key: 'btn', 
      onClick: () => alert('Test button works!'),
      style: { 
        padding: '10px 20px', 
        backgroundColor: '#4CAF50', 
        color: 'white', 
        border: 'none', 
        borderRadius: '4px',
        cursor: 'pointer'
      }
    }, 'Click to Test')
  ]);
}

console.log('=== RENDERING TEST APP ===');
const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(React.createElement(TestApp));
console.log('=== TEST APP RENDERED ===');