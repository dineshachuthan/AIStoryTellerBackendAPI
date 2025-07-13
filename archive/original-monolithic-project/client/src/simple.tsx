console.log('=== SIMPLE.TSX LOADING ===');
document.getElementById('root')!.innerHTML = `
  <div style="padding: 20px; background: #90EE90; min-height: 100vh; font-family: Arial;">
    <h1>✅ SIMPLE PAGE LOADED</h1>
    <p>No React, No hooks, No errors!</p>
    <p>Time: ${new Date().toISOString()}</p>
    <button onclick="alert('Button works!')">Test Button</button>
  </div>
`;
console.log('=== SIMPLE.TSX COMPLETE ===');