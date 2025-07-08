/**
 * API Test Runner
 * Executes all endpoint tests and generates comprehensive reports
 */

import fetch from 'node-fetch';
import { TestEndpoint, TestCase, TEST_CONFIG, ApiResponse } from './test-config';
import { testData, testAuth } from './test-data';

// Import all endpoint test definitions
import { authEndpoints } from './endpoints/auth.test';
import { storyEndpoints } from './endpoints/stories.test';
import { narrationEndpoints } from './endpoints/narration.test';
import { roleplayEndpoints } from './endpoints/roleplay.test';
import { videoEndpoints } from './endpoints/video.test';
import { subscriptionEndpoints } from './endpoints/subscription.test';
import { notificationEndpoints } from './endpoints/notification.test';
import { referenceDataEndpoints } from './endpoints/reference-data.test';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

interface TestResult {
  endpoint: string;
  method: string;
  testCase: string;
  success: boolean;
  status: number;
  message: string;
  duration: number;
  response?: any;
}

interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  duration: number;
  categories: Record<string, { total: number; passed: number; failed: number }>;
  failures: TestResult[];
}

class ApiTestRunner {
  private results: TestResult[] = [];
  private sessionCookie: string = '';
  
  /**
   * Run all API tests
   */
  async runAllTests(category?: string): Promise<TestSummary> {
    console.log(`${colors.cyan}${colors.bright}🚀 Starting API Test Suite${colors.reset}`);
    console.log(`${colors.cyan}═══════════════════════════════════${colors.reset}\n`);
    
    const startTime = Date.now();
    
    // Authenticate first to get session cookie
    await this.authenticate();
    
    // Collect all endpoints
    const allEndpoints = [
      ...authEndpoints,
      ...storyEndpoints,
      ...narrationEndpoints,
      ...roleplayEndpoints,
      ...videoEndpoints,
      ...subscriptionEndpoints,
      ...notificationEndpoints,
      ...referenceDataEndpoints,
    ];
    
    // Filter by category if specified
    const endpoints = category 
      ? allEndpoints.filter(e => e.category === category)
      : allEndpoints;
    
    // Run tests for each endpoint
    for (const endpoint of endpoints) {
      await this.testEndpoint(endpoint);
    }
    
    // Generate summary
    const summary = this.generateSummary(Date.now() - startTime);
    this.printSummary(summary);
    
    return summary;
  }
  
  /**
   * Authenticate and get session cookie
   */
  private async authenticate(): Promise<void> {
    try {
      console.log(`${colors.yellow}🔐 Authenticating test user...${colors.reset}`);
      
      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/auth/user`, {
        method: 'GET',
        headers: {
          ...TEST_CONFIG.headers,
          Cookie: testAuth.validSessionCookie,
        },
      });
      
      if (response.ok) {
        const setCookie = response.headers.get('set-cookie');
        if (setCookie) {
          this.sessionCookie = setCookie.split(';')[0];
        } else {
          this.sessionCookie = testAuth.validSessionCookie;
        }
        console.log(`${colors.green}✅ Authentication successful${colors.reset}\n`);
      } else {
        console.log(`${colors.yellow}⚠️  Using default test session cookie${colors.reset}\n`);
        this.sessionCookie = testAuth.validSessionCookie;
      }
    } catch (error: any) {
      console.log(`${colors.red}❌ Authentication failed: ${error.message}${colors.reset}\n`);
      this.sessionCookie = testAuth.validSessionCookie;
    }
  }
  
  /**
   * Test a single endpoint with all its test cases
   */
  private async testEndpoint(endpoint: TestEndpoint): Promise<void> {
    console.log(`${colors.blue}📋 Testing: ${endpoint.name}${colors.reset}`);
    console.log(`   ${endpoint.method} ${endpoint.path}`);
    
    for (const testCase of endpoint.testCases) {
      await this.runTestCase(endpoint, testCase);
    }
    
    console.log(''); // Empty line between endpoints
  }
  
  /**
   * Run a single test case
   */
  private async runTestCase(endpoint: TestEndpoint, testCase: TestCase): Promise<void> {
    const startTime = Date.now();
    const path = testCase.path || endpoint.path;
    const url = `${TEST_CONFIG.baseUrl}${path}`;
    
    try {
      // Prepare headers
      const headers: any = {
        ...TEST_CONFIG.headers,
        ...testCase.headers,
      };
      
      // Add auth cookie if required
      if (endpoint.requiresAuth && !headers.Cookie) {
        headers.Cookie = this.sessionCookie;
      }
      
      // Handle FormData
      let body: any;
      if (testCase.input instanceof FormData) {
        delete headers['Content-Type']; // Let fetch set it for FormData
        body = testCase.input;
      } else if (testCase.input && endpoint.method !== 'GET') {
        body = JSON.stringify(testCase.input);
      }
      
      // Make request
      const response = await fetch(url, {
        method: endpoint.method,
        headers,
        body,
        timeout: TEST_CONFIG.timeout,
      });
      
      const responseData = await response.json().catch(() => null);
      const duration = Date.now() - startTime;
      
      // Validate response
      const expectedStatus = testCase.expectedStatus || 200;
      const statusMatch = response.status === expectedStatus;
      const responseValid = testCase.validateResponse 
        ? testCase.validateResponse(responseData)
        : true;
      
      const success = statusMatch && responseValid;
      
      // Record result
      const result: TestResult = {
        endpoint: endpoint.name,
        method: endpoint.method,
        testCase: testCase.name,
        success,
        status: response.status,
        message: success ? 'Passed' : `Expected status ${expectedStatus}, got ${response.status}`,
        duration,
        response: responseData,
      };
      
      this.results.push(result);
      
      // Print result
      const icon = success ? '✅' : '❌';
      const color = success ? colors.green : colors.red;
      console.log(`   ${color}${icon} ${testCase.name}${colors.reset} (${duration}ms)`);
      
      if (!success && responseData) {
        console.log(`      ${colors.red}Response: ${JSON.stringify(responseData, null, 2)}${colors.reset}`);
      }
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      const result: TestResult = {
        endpoint: endpoint.name,
        method: endpoint.method,
        testCase: testCase.name,
        success: false,
        status: 0,
        message: `Request failed: ${error.message}`,
        duration,
      };
      
      this.results.push(result);
      
      console.log(`   ${colors.red}❌ ${testCase.name}${colors.reset} (${duration}ms)`);
      console.log(`      ${colors.red}Error: ${error.message}${colors.reset}`);
    }
  }
  
  /**
   * Generate test summary
   */
  private generateSummary(totalDuration: number): TestSummary {
    const categories: Record<string, { total: number; passed: number; failed: number }> = {};
    const failures: TestResult[] = [];
    
    for (const result of this.results) {
      // Update category stats
      const endpoint = [...authEndpoints, ...storyEndpoints, ...narrationEndpoints, 
        ...roleplayEndpoints, ...videoEndpoints, ...subscriptionEndpoints, 
        ...notificationEndpoints, ...referenceDataEndpoints].find(e => e.name === result.endpoint);
      
      if (endpoint) {
        if (!categories[endpoint.category]) {
          categories[endpoint.category] = { total: 0, passed: 0, failed: 0 };
        }
        
        categories[endpoint.category].total++;
        if (result.success) {
          categories[endpoint.category].passed++;
        } else {
          categories[endpoint.category].failed++;
          failures.push(result);
        }
      }
    }
    
    const total = this.results.length;
    const passed = this.results.filter(r => r.success).length;
    const failed = total - passed;
    
    return {
      total,
      passed,
      failed,
      duration: totalDuration,
      categories,
      failures,
    };
  }
  
  /**
   * Print test summary
   */
  private printSummary(summary: TestSummary): void {
    console.log(`\n${colors.cyan}${colors.bright}📊 Test Summary${colors.reset}`);
    console.log(`${colors.cyan}═══════════════════════════════════${colors.reset}\n`);
    
    // Overall stats
    const passRate = ((summary.passed / summary.total) * 100).toFixed(1);
    const passColor = summary.failed === 0 ? colors.green : summary.failed > 5 ? colors.red : colors.yellow;
    
    console.log(`Total Tests: ${colors.bright}${summary.total}${colors.reset}`);
    console.log(`${colors.green}Passed: ${summary.passed}${colors.reset}`);
    console.log(`${colors.red}Failed: ${summary.failed}${colors.reset}`);
    console.log(`${passColor}Pass Rate: ${passRate}%${colors.reset}`);
    console.log(`Duration: ${colors.cyan}${(summary.duration / 1000).toFixed(2)}s${colors.reset}\n`);
    
    // Category breakdown
    console.log(`${colors.magenta}Category Breakdown:${colors.reset}`);
    for (const [category, stats] of Object.entries(summary.categories)) {
      const categoryPassRate = ((stats.passed / stats.total) * 100).toFixed(0);
      const color = stats.failed === 0 ? colors.green : colors.yellow;
      console.log(`  ${color}${category}: ${stats.passed}/${stats.total} (${categoryPassRate}%)${colors.reset}`);
    }
    
    // Failures
    if (summary.failures.length > 0) {
      console.log(`\n${colors.red}${colors.bright}Failed Tests:${colors.reset}`);
      for (const failure of summary.failures) {
        console.log(`  ${colors.red}• ${failure.endpoint} - ${failure.testCase}${colors.reset}`);
        console.log(`    ${failure.message}`);
      }
    }
    
    // Final result
    console.log(`\n${colors.cyan}═══════════════════════════════════${colors.reset}`);
    if (summary.failed === 0) {
      console.log(`${colors.green}${colors.bright}✅ All tests passed!${colors.reset}`);
    } else {
      console.log(`${colors.red}${colors.bright}❌ ${summary.failed} tests failed${colors.reset}`);
    }
  }
}

// Export for use in npm scripts
export const testRunner = new ApiTestRunner();

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const category = process.argv[2];
  testRunner.runAllTests(category)
    .then(summary => {
      process.exit(summary.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error(`${colors.red}Test suite failed: ${error.message}${colors.reset}`);
      process.exit(1);
    });
}