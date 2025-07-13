// Single Workflow Launcher - Runs both backend and frontend
import { spawn } from 'child_process';
import { join } from 'path';

console.log('🚀 Full Stack Application Starting...');
console.log('📦 Backend: http://localhost:5000');
console.log('🌐 Frontend: http://localhost:5001 (External: port 3000)');
console.log('=========================================');

const cwd = process.cwd();

// Start backend
console.log('Starting backend API...');
const backend = spawn('npm', ['run', 'dev'], {
  cwd: join(cwd, 'backend-project'),
  stdio: ['pipe', 'pipe', 'pipe']
});

backend.stdout.on('data', (data) => {
  console.log('[Backend]', data.toString());
});

backend.stderr.on('data', (data) => {
  console.error('[Backend Error]', data.toString());
});

// Start frontend after a brief delay
setTimeout(() => {
  console.log('Starting frontend app...');
  const frontend = spawn('npm', ['run', 'dev'], {
    cwd: join(cwd, 'frontend-project'),
    stdio: ['pipe', 'pipe', 'pipe']
  });

  frontend.stdout.on('data', (data) => {
    console.log('[Frontend]', data.toString());
  });

  frontend.stderr.on('data', (data) => {
    console.error('[Frontend Error]', data.toString());
  });

  frontend.on('exit', (code) => {
    console.log(`Frontend exited: ${code}`);
  });
}, 2000);

backend.on('exit', (code) => {
  console.log(`Backend exited: ${code}`);
});

process.on('SIGINT', () => {
  console.log('Shutting down both projects...');
  backend.kill();
  process.exit(0);
});