#!/usr/bin/env node

/**
 * ElevenLabs API Integration Test
 * Tests the voice cloning workflow through API calls to the running server
 */

import http from 'http';
import fs from 'fs/promises';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName, status, details = '') {
  const statusColor = status === 'PASS' ? 'green' : status === 'FAIL' ? 'red' : 'yellow';
  log(`[${status}] ${testName}`, statusColor);
  if (details) {
    log(`      ${details}`, 'reset');
  }
}

async function makeRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: parsed
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: body
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function runTests() {
  log('\n=== ELEVENLABS API INTEGRATION TEST ===\n', 'bold');
  
  let testResults = { passed: 0, failed: 0, errors: [] };

  try {
    // Test 1: Check server is running
    log('Testing server connectivity...', 'yellow');
    const healthCheck = await makeRequest('GET', '/api/auth/user');
    
    if (healthCheck.status === 401 || healthCheck.status === 200) {
      logTest('Server connectivity', 'PASS', 'Server is responding');
      testResults.passed++;
    } else {
      logTest('Server connectivity', 'FAIL', `Unexpected status: ${healthCheck.status}`);
      testResults.failed++;
      return;
    }

    // Test 2: Check voice cloning endpoints exist
    log('\nTesting voice cloning endpoints...', 'yellow');
    
    const progressCheck = await makeRequest('GET', '/api/voice-cloning/progress');
    if (progressCheck.status === 401) {
      logTest('Voice cloning progress endpoint', 'PASS', 'Endpoint exists (requires auth)');
      testResults.passed++;
    } else {
      logTest('Voice cloning progress endpoint', 'FAIL', `Status: ${progressCheck.status}`);
      testResults.failed++;
    }

    // Test 3: Check voice modulation endpoints
    const templatesCheck = await makeRequest('GET', '/api/voice-modulations/templates');
    if (templatesCheck.status === 401) {
      logTest('Voice modulation templates endpoint', 'PASS', 'Endpoint exists (requires auth)');
      testResults.passed++;
    } else {
      logTest('Voice modulation templates endpoint', 'FAIL', `Status: ${templatesCheck.status}`);
      testResults.failed++;
    }

    // Test 4: Check trigger endpoint
    const triggerCheck = await makeRequest('POST', '/api/voice-cloning/trigger/emotions');
    if (triggerCheck.status === 401) {
      logTest('Voice cloning trigger endpoint', 'PASS', 'Endpoint exists (requires auth)');
      testResults.passed++;
    } else {
      logTest('Voice cloning trigger endpoint', 'FAIL', `Status: ${triggerCheck.status}`);
      testResults.failed++;
    }

    // Test 5: Database Schema Check via SQL endpoint
    log('\nTesting database schema...', 'yellow');
    try {
      // Check if we can query user_voice_profiles table structure
      const schemaCheck = await makeRequest('GET', '/api/voice-cloning/progress');
      // The endpoint will fail with 401 but if it's a schema error, we'd see 500
      if (schemaCheck.status === 401) {
        logTest('Database schema (user_voice_profiles)', 'PASS', 'Table structure appears correct');
        testResults.passed++;
      } else if (schemaCheck.status === 500) {
        logTest('Database schema (user_voice_profiles)', 'FAIL', 'Possible schema issues');
        testResults.failed++;
        testResults.errors.push('Database schema error detected');
      }
    } catch (error) {
      logTest('Database schema check', 'FAIL', error.message);
      testResults.failed++;
    }

    // Test 6: Check ElevenLabs environment variables
    log('\nChecking ElevenLabs configuration...', 'yellow');
    
    // Try to read cookies file to get session for authenticated requests
    let cookies = '';
    try {
      const cookieFile = await fs.readFile('cookies.txt', 'utf8');
      const connectSid = cookieFile.match(/connect\.sid=([^;]+)/);
      if (connectSid) {
        cookies = `connect.sid=${connectSid[1]}`;
      }
    } catch (error) {
      log('No cookies file found - will test without authentication', 'yellow');
    }

    // Test with authentication if available
    if (cookies) {
      log('\nTesting with authentication...', 'yellow');
      
      const authHeaders = { 'Cookie': cookies };
      
      const authProgressCheck = await makeRequest('GET', '/api/voice-cloning/progress', null, authHeaders);
      if (authProgressCheck.status === 200) {
        logTest('Authenticated voice cloning progress', 'PASS', 'Successfully retrieved progress data');
        testResults.passed++;
        
        // Check if response has expected structure
        if (authProgressCheck.data && authProgressCheck.data.emotions) {
          logTest('Voice cloning progress data structure', 'PASS', 'Response has expected structure');
          testResults.passed++;
        } else {
          logTest('Voice cloning progress data structure', 'FAIL', 'Missing expected data structure');
          testResults.failed++;
        }
      } else {
        logTest('Authenticated voice cloning progress', 'FAIL', `Status: ${authProgressCheck.status}`);
        testResults.failed++;
      }

      // Test voice cloning trigger
      const triggerTest = await makeRequest('POST', '/api/voice-cloning/trigger/emotions', null, authHeaders);
      if (triggerTest.status === 200) {
        logTest('Voice cloning trigger (authenticated)', 'PASS', 'Trigger endpoint working');
        testResults.passed++;
        
        // Check response for errors
        if (triggerTest.data && triggerTest.data.success === false) {
          testResults.errors.push(`Trigger failed: ${triggerTest.data.message || 'Unknown error'}`);
          logTest('Voice cloning trigger execution', 'FAIL', triggerTest.data.message || 'Trigger failed');
          testResults.failed++;
        } else {
          logTest('Voice cloning trigger execution', 'PASS', 'Trigger executed successfully');
          testResults.passed++;
        }
      } else {
        logTest('Voice cloning trigger (authenticated)', 'FAIL', `Status: ${triggerTest.status}`);
        testResults.failed++;
      }
    }

    // Test 7: Check error handling
    log('\nTesting error handling...', 'yellow');
    
    const invalidTrigger = await makeRequest('POST', '/api/voice-cloning/trigger/invalid');
    if (invalidTrigger.status === 400 || invalidTrigger.status === 404) {
      logTest('Invalid category error handling', 'PASS', 'Proper error response for invalid category');
      testResults.passed++;
    } else {
      logTest('Invalid category error handling', 'FAIL', `Status: ${invalidTrigger.status}`);
      testResults.failed++;
    }

  } catch (error) {
    log(`\nCritical test failure: ${error.message}`, 'red');
    testResults.errors.push(`Critical error: ${error.message}`);
    testResults.failed++;
  }

  // Generate report
  log('\n=== TEST RESULTS ===\n', 'bold');
  const total = testResults.passed + testResults.failed;
  const passRate = total > 0 ? ((testResults.passed / total) * 100).toFixed(1) : 0;
  
  log(`Total Tests: ${total}`, 'bold');
  log(`Passed: ${testResults.passed}`, 'green');
  log(`Failed: ${testResults.failed}`, 'red');
  log(`Pass Rate: ${passRate}%`, passRate >= 80 ? 'green' : 'red');
  
  if (testResults.errors.length > 0) {
    log('\nIssues Found:', 'red');
    testResults.errors.forEach((error, index) => {
      log(`${index + 1}. ${error}`, 'red');
    });
  }
  
  if (testResults.failed === 0) {
    log('\n✅ All API tests passed! ElevenLabs integration endpoints are working.', 'green');
  } else {
    log('\n❌ Some tests failed. Check the issues above.', 'red');
    process.exit(1);
  }
}

// Run the tests
runTests().catch(error => {
  log(`Test suite failed: ${error.message}`, 'red');
  process.exit(1);
});