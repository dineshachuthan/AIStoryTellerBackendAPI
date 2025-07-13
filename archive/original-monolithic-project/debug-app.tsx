import React from 'react';

function DebugApp() {
  return (
    <div style={{ padding: '20px', backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
      <h1>Debug App Loading</h1>
      <p>If you see this, React is working!</p>
      <p>Current time: {new Date().toISOString()}</p>
    </div>
  );
}

export default DebugApp;