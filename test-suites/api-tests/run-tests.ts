#!/usr/bin/env node
/**
 * API Test Suite Execution Script
 * Run with: npm run test:api
 */

import { testRunner } from './test-runner';

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];
const category = args[1];

// Show help
function showHelp() {
  console.log(`
API Test Suite Runner

Usage:
  npm run test:api                    Run all tests
  npm run test:api [category]         Run tests for specific category
  npm run test:api help               Show this help

Categories:
  auth          Authentication endpoints
  stories       Story management endpoints
  narration     Voice and narration endpoints
  roleplay      Collaborative roleplay endpoints
  video         Video generation endpoints
  subscription  Subscription and payment endpoints
  notification  Email/SMS notification endpoints
  emotion       Reference data endpoints

Examples:
  npm run test:api                    Run all API tests
  npm run test:api auth               Run only auth tests
  npm run test:api stories            Run only story tests
`);
}

// Main execution
async function main() {
  if (command === 'help') {
    showHelp();
    process.exit(0);
  }

  try {
    console.log('\n🚀 Starting API Test Suite...\n');
    
    // Run tests
    const summary = await testRunner.runAllTests(command);
    
    // Exit with appropriate code
    process.exit(summary.failed > 0 ? 1 : 0);
    
  } catch (error: any) {
    console.error(`\n❌ Test suite failed: ${error.message}\n`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test suite
main();