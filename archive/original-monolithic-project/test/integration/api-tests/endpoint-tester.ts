#!/usr/bin/env node
/**
 * Ad-hoc Endpoint Tester
 * Allows testing any API endpoint with custom data
 * 
 * Usage: tsx test-suites/api-tests/endpoint-tester.ts
 */

import * as readline from 'readline';
import chalk from 'chalk';
import { testData } from './test-data';

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Helper to ask questions
function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

// Authentication state
let authCookie: string | null = null;

// Authenticate user
async function authenticate() {
  console.log(chalk.cyan('\n🔐 Authenticating...\n'));
  
  try {
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testData.users.existing.email,
        password: testData.users.existing.password,
      }),
    });
    
    if (response.ok) {
      const cookie = response.headers.get('set-cookie');
      if (cookie) {
        authCookie = cookie.split(';')[0];
        console.log(chalk.green('✅ Authentication successful'));
        return true;
      }
    }
    
    console.log(chalk.red('❌ Authentication failed'));
    return false;
  } catch (error) {
    console.log(chalk.red('❌ Authentication error:', error));
    return false;
  }
}

// Parse JSON input
function parseJson(input: string): any {
  if (!input || input.trim() === '') {
    return undefined;
  }
  
  try {
    return JSON.parse(input);
  } catch (error) {
    console.log(chalk.red('Invalid JSON. Using as plain text.'));
    return input;
  }
}

// Make API request
async function makeRequest(method: string, url: string, body?: any, headers?: any) {
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...headers,
    },
  };
  
  // Add authentication
  if (authCookie) {
    options.headers!['Cookie'] = authCookie;
  }
  
  // Add body for non-GET requests
  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(url, options);
    const duration = Date.now() - startTime;
    
    const responseData = await response.text();
    let parsedData;
    
    try {
      parsedData = JSON.parse(responseData);
    } catch {
      parsedData = responseData;
    }
    
    return {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data: parsedData,
      duration,
    };
  } catch (error: any) {
    return {
      error: error.message,
      duration: Date.now() - startTime,
    };
  }
}

// Display response
function displayResponse(response: any) {
  console.log(chalk.cyan('\n📄 Response:\n'));
  
  if (response.error) {
    console.log(chalk.red(`❌ Error: ${response.error}`));
    console.log(chalk.gray(`Duration: ${response.duration}ms`));
    return;
  }
  
  // Status
  const statusColor = response.status >= 200 && response.status < 300 ? chalk.green : chalk.red;
  console.log(statusColor(`Status: ${response.status} ${response.statusText}`));
  console.log(chalk.gray(`Duration: ${response.duration}ms\n`));
  
  // Headers
  console.log(chalk.yellow('Headers:'));
  Object.entries(response.headers).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });
  
  // Body
  console.log(chalk.yellow('\nBody:'));
  if (typeof response.data === 'object') {
    console.log(JSON.stringify(response.data, null, 2));
  } else {
    console.log(response.data);
  }
}

// Show common endpoints
function showCommonEndpoints() {
  console.log(chalk.yellow('\n📋 Common Endpoints:\n'));
  console.log('Auth:');
  console.log('  GET    /api/auth/user');
  console.log('  POST   /api/auth/login');
  console.log('  POST   /api/auth/logout');
  console.log('  POST   /api/auth/register\n');
  
  console.log('Stories:');
  console.log('  GET    /api/stories');
  console.log('  GET    /api/stories/:id');
  console.log('  POST   /api/stories');
  console.log('  PATCH  /api/stories/:id');
  console.log('  DELETE /api/stories/:id\n');
  
  console.log('Narration:');
  console.log('  POST   /api/stories/:id/analyze');
  console.log('  POST   /api/stories/:id/generate-narration');
  console.log('  GET    /api/stories/:id/play\n');
  
  console.log('Voice:');
  console.log('  GET    /api/voice/samples');
  console.log('  POST   /api/voice/record');
  console.log('  POST   /api/voice/generate-narrator\n');
}

// Show test data
function showTestData() {
  console.log(chalk.yellow('\n📊 Available Test Data:\n'));
  console.log(JSON.stringify(testData, null, 2));
}

// Main menu
async function showMenu() {
  console.clear();
  console.log(chalk.cyan('\n🔧 Ad-hoc API Endpoint Tester\n'));
  console.log(chalk.gray('Test any API endpoint with custom data\n'));
  
  console.log('1. Test an endpoint');
  console.log('2. Authenticate');
  console.log('3. Show common endpoints');
  console.log('4. Show test data');
  console.log('5. Exit\n');
}

// Test endpoint
async function testEndpoint() {
  console.log(chalk.cyan('\n🧪 Test Endpoint\n'));
  
  // Get method
  const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
  console.log('Methods: ' + methods.join(', '));
  const method = (await ask(chalk.cyan('Method: '))).toUpperCase();
  
  if (!methods.includes(method)) {
    console.log(chalk.red('Invalid method'));
    return;
  }
  
  // Get path
  const path = await ask(chalk.cyan('Path (e.g., /api/stories): '));
  
  // Build full URL
  let url = `http://localhost:5000${path}`;
  
  // Path parameters
  const hasParams = await ask(chalk.cyan('Has path parameters? (y/n): '));
  if (hasParams.toLowerCase() === 'y') {
    console.log(chalk.gray('Example: For /api/stories/:id, enter id=75'));
    const params = await ask(chalk.cyan('Parameters (key=value, comma separated): '));
    
    params.split(',').forEach(param => {
      const [key, value] = param.trim().split('=');
      url = url.replace(`:${key}`, value);
    });
  }
  
  // Query parameters
  const hasQuery = await ask(chalk.cyan('Has query parameters? (y/n): '));
  if (hasQuery.toLowerCase() === 'y') {
    const query = await ask(chalk.cyan('Query params (key=value, comma separated): '));
    const queryParams = new URLSearchParams();
    
    query.split(',').forEach(param => {
      const [key, value] = param.trim().split('=');
      queryParams.append(key, value);
    });
    
    url += `?${queryParams.toString()}`;
  }
  
  // Request body
  let body;
  if (method !== 'GET') {
    const hasBody = await ask(chalk.cyan('Has request body? (y/n): '));
    if (hasBody.toLowerCase() === 'y') {
      console.log(chalk.gray('Enter JSON or leave empty for interactive mode'));
      const bodyInput = await ask(chalk.cyan('Body JSON: '));
      
      if (bodyInput) {
        body = parseJson(bodyInput);
      } else {
        // Interactive body builder
        body = {};
        console.log(chalk.gray('Enter fields one by one. Type "done" when finished.'));
        
        while (true) {
          const field = await ask(chalk.cyan('Field name (or "done"): '));
          if (field.toLowerCase() === 'done') break;
          
          const value = await ask(chalk.cyan(`Value for ${field}: `));
          body[field] = parseJson(value) || value;
        }
      }
    }
  }
  
  // Custom headers
  const hasHeaders = await ask(chalk.cyan('Add custom headers? (y/n): '));
  const headers: any = {};
  
  if (hasHeaders.toLowerCase() === 'y') {
    console.log(chalk.gray('Enter headers one by one. Type "done" when finished.'));
    
    while (true) {
      const header = await ask(chalk.cyan('Header name (or "done"): '));
      if (header.toLowerCase() === 'done') break;
      
      const value = await ask(chalk.cyan(`Value for ${header}: `));
      headers[header] = value;
    }
  }
  
  // Make request
  console.log(chalk.cyan(`\n🚀 Making request to ${url}...\n`));
  const response = await makeRequest(method, url, body, headers);
  
  // Display response
  displayResponse(response);
}

// Main loop
async function main() {
  console.log(chalk.cyan('🔧 Ad-hoc API Endpoint Tester'));
  console.log(chalk.gray('Test any API endpoint with custom data\n'));
  
  // Check if authenticated
  if (!authCookie) {
    const needAuth = await ask(chalk.cyan('Need authentication? (y/n): '));
    if (needAuth.toLowerCase() === 'y') {
      await authenticate();
    }
  }
  
  while (true) {
    await showMenu();
    const choice = await ask(chalk.cyan('Enter your choice: '));
    
    switch (choice) {
      case '1':
        await testEndpoint();
        break;
        
      case '2':
        await authenticate();
        break;
        
      case '3':
        showCommonEndpoints();
        break;
        
      case '4':
        showTestData();
        break;
        
      case '5':
        console.log(chalk.green('\n👋 Goodbye!\n'));
        rl.close();
        process.exit(0);
        
      default:
        console.log(chalk.red('Invalid choice'));
    }
    
    await ask(chalk.gray('\nPress Enter to continue...'));
  }
}

// Handle errors
process.on('unhandledRejection', (err) => {
  console.error(chalk.red('\n❌ Error:'), err);
  rl.close();
  process.exit(1);
});

// Start the tester
main().catch(err => {
  console.error(chalk.red('Fatal error:'), err);
  rl.close();
  process.exit(1);
});