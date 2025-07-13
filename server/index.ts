console.log('🚀 Starting Backend API from backend-project...');
console.log('Note: The monolithic project has been archived.');
console.log('Backend API is now running from: backend-project/');
console.log('===============================================');

import { spawn } from 'child_process';
import { join } from 'path';

const backendPath = join(process.cwd(), 'backend-project');
const backend = spawn('npm', ['run', 'dev'], { 
  cwd: backendPath,
  stdio: 'inherit' 
});

backend.on('error', (err) => {
  console.error('Failed to start backend:', err);
});

backend.on('exit', (code) => {
  console.log(`Backend process exited with code ${code}`);
});