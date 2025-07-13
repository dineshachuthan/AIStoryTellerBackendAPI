// Single Workflow Launcher - Runs both backend and frontend
import { spawn, exec } from 'child_process';
import { join } from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Function to kill processes on specific ports
async function killProcessOnPort(port: number) {
  try {
    // Try to find and kill processes on the port
    const { stdout } = await execAsync(`netstat -tulpn 2>/dev/null | grep :${port} | awk '{print $7}' | cut -d/ -f1 | head -1`);
    const pid = stdout.trim();
    
    if (pid && pid !== '' && !isNaN(Number(pid))) {
      console.log(`🔄 Killing existing process ${pid} on port ${port}`);
      await execAsync(`kill -9 ${pid}`);
      // Wait a moment for the process to actually die
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } catch (error) {
    // Port might not be in use, which is fine
    console.log(`📝 Port ${port} is available`);
  }
}

// Function to wait for port to be available
async function waitForPortAvailable(port: number, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await execAsync(`netstat -tulpn 2>/dev/null | grep :${port}`);
      // If we get here, port is still in use
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      // Port is available
      return;
    }
  }
  console.warn(`⚠️  Port ${port} may still be in use after ${maxAttempts} attempts`);
}

async function startApplication() {
  console.log('🚀 Full Stack Application Starting...');
  console.log('📦 Backend: http://localhost:3000');
  console.log('🌐 Frontend: http://localhost:5000 (Main Domain)');
  console.log('=========================================');

  // Kill existing processes on both ports
  await killProcessOnPort(3000);
  await killProcessOnPort(5000);
  
  // Wait for ports to be available
  await waitForPortAvailable(3000);
  await waitForPortAvailable(5000);
  
  console.log('✅ Ports cleaned up and ready');
  
  // Add health check monitoring
  const checkHealth = async () => {
    try {
      const frontendHealth = await execAsync('curl -s -o /dev/null -w "%{http_code}" http://localhost:5000');
      const backendHealth = await execAsync('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health');
      
      if (frontendHealth.stdout.trim() === '200' && backendHealth.stdout.trim() === '200') {
        console.log('🚀 APPLICATION READY FOR HTTP TRAFFIC');
        console.log('📱 Frontend: http://localhost:5000 (Status: Ready)');
        console.log('⚡ Backend: http://localhost:3000 (Status: Ready)');
        console.log('🔗 Health Check: http://localhost:3000/health');
        console.log('📚 API Docs: http://localhost:3000/api-docs');
        console.log('=========================================');
        return true;
      }
    } catch (error) {
      // Services not ready yet
    }
    return false;
  };
  
  // Monitor health every 2 seconds for first 30 seconds
  let healthCheckAttempts = 0;
  const healthCheckInterval = setInterval(async () => {
    healthCheckAttempts++;
    const isHealthy = await checkHealth();
    
    if (isHealthy) {
      clearInterval(healthCheckInterval);
    } else if (healthCheckAttempts >= 15) {
      console.log('⚠️  Services taking longer than expected to start');
      clearInterval(healthCheckInterval);
    }
  }, 2000);

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

  backend.on('exit', (code) => {
    console.log(`Backend exited: ${code}`);
  });

  // Enhanced process cleanup
  let frontend: any = null;
  
  // Start frontend after a brief delay
  setTimeout(() => {
    console.log('Starting frontend app...');
    frontend = spawn('npm', ['run', 'dev'], {
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

  // Enhanced shutdown handling
  const cleanup = async () => {
    console.log('🔄 Shutting down both projects...');
    
    if (backend) {
      backend.kill('SIGTERM');
    }
    if (frontend) {
      frontend.kill('SIGTERM');
    }
    
    // Force kill after timeout
    setTimeout(() => {
      if (backend) backend.kill('SIGKILL');
      if (frontend) frontend.kill('SIGKILL');
      process.exit(0);
    }, 5000);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('exit', cleanup);
}

// Start the application
startApplication().catch(console.error);