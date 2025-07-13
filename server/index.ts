// Backend API Redirect Script
// This script redirects the root workflow to the independent backend project

import { spawn } from 'child_process';
import { join } from 'path';

console.log('🚀 Backend API is running from: backend-project/');
console.log('📊 Health check: http://localhost:5000/health');
console.log('📖 API docs: http://localhost:5000/api/docs');

// Start the backend from the independent project
const backendPath = join(process.cwd(), 'backend-project');
const backend = spawn('npm', ['run', 'dev'], { 
  cwd: backendPath,
  stdio: 'inherit' 
});

backend.on('error', (err) => {
  console.error('Backend startup error:', err);
  process.exit(1);
});

backend.on('exit', (code) => {
  console.log(`Backend exited with code: ${code}`);
  process.exit(code || 0);
});