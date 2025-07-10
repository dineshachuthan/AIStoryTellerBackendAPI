#!/usr/bin/env node
/**
 * Interactive API Test Runner
 * Allows ad-hoc selection and execution of specific tests
 * 
 * Usage: tsx test-suites/api-tests/interactive-runner.ts
 */

import * as readline from 'readline';
import { testRunner } from './test-runner';
import { authEndpoints } from './endpoints/auth.test';
import { storyEndpoints } from './endpoints/stories.test';
import { narrationEndpoints } from './endpoints/narration.test';
import { roleplayEndpoints } from './endpoints/roleplay.test';
import { videoEndpoints } from './endpoints/video.test';
import { subscriptionEndpoints } from './endpoints/subscription.test';
import { notificationEndpoints } from './endpoints/notification.test';
import { referenceDataEndpoints } from './endpoints/reference-data.test';
import chalk from 'chalk';

// All test endpoints organized by category
const testCategories = {
  auth: authEndpoints,
  stories: storyEndpoints,
  narration: narrationEndpoints,
  roleplay: roleplayEndpoints,
  video: videoEndpoints,
  subscription: subscriptionEndpoints,
  notification: notificationEndpoints,
  'reference-data': referenceDataEndpoints,
};

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

// Display menu
function showMenu() {
  console.clear();
  console.log(chalk.cyan('\n🔧 Interactive API Test Runner\n'));
  console.log(chalk.gray('Select an option:\n'));
  console.log('1. Run all tests');
  console.log('2. Run tests by category');
  console.log('3. Run specific endpoint test');
  console.log('4. Run single test case');
  console.log('5. View all available endpoints');
  console.log('6. Exit\n');
}

// Show categories
function showCategories() {
  console.log(chalk.yellow('\nAvailable Categories:\n'));
  Object.keys(testCategories).forEach((category, index) => {
    console.log(`${index + 1}. ${category}`);
  });
}

// Show endpoints for a category
function showEndpoints(category: string) {
  const endpoints = testCategories[category as keyof typeof testCategories];
  if (!endpoints) {
    console.log(chalk.red('Invalid category'));
    return;
  }
  
  console.log(chalk.yellow(`\nEndpoints in ${category}:\n`));
  endpoints.forEach((endpoint, index) => {
    console.log(`${index + 1}. ${endpoint.method} ${endpoint.path} - ${endpoint.name}`);
  });
}

// Show test cases for an endpoint
function showTestCases(endpoint: any) {
  console.log(chalk.yellow(`\nTest cases for ${endpoint.name}:\n`));
  endpoint.tests.forEach((test: any, index: number) => {
    console.log(`${index + 1}. ${test.name} - ${test.description}`);
  });
}

// Run specific endpoint
async function runEndpoint(category: string, endpointIndex: number) {
  const endpoints = testCategories[category as keyof typeof testCategories];
  const endpoint = endpoints[endpointIndex];
  
  if (!endpoint) {
    console.log(chalk.red('Invalid endpoint'));
    return;
  }
  
  console.log(chalk.cyan(`\n🧪 Testing: ${endpoint.name}`));
  console.log(chalk.gray(`   ${endpoint.method} ${endpoint.path}\n`));
  
  // Run only this endpoint
  const results = await testRunner.runEndpoint(endpoint);
  
  // Show results
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(chalk.cyan('\n📊 Results:'));
  console.log(`   Total: ${results.length}`);
  console.log(`   ${chalk.green(`Passed: ${passed}`)}`);
  console.log(`   ${chalk.red(`Failed: ${failed}`)}`);
  
  if (failed > 0) {
    console.log(chalk.red('\n❌ Failed tests:'));
    results.filter(r => !r.success).forEach(r => {
      console.log(`   - ${r.testName}: ${r.error}`);
    });
  }
}

// Run single test case
async function runTestCase(category: string, endpointIndex: number, testIndex: number) {
  const endpoints = testCategories[category as keyof typeof testCategories];
  const endpoint = endpoints[endpointIndex];
  const testCase = endpoint?.tests[testIndex];
  
  if (!testCase) {
    console.log(chalk.red('Invalid test case'));
    return;
  }
  
  console.log(chalk.cyan(`\n🧪 Running: ${testCase.name}`));
  console.log(chalk.gray(`   ${testCase.description}\n`));
  
  // Run only this test
  const result = await testRunner.runSingleTest(endpoint, testCase);
  
  if (result.success) {
    console.log(chalk.green('✅ Test passed'));
    console.log(`   Duration: ${result.duration}ms`);
  } else {
    console.log(chalk.red('❌ Test failed'));
    console.log(`   Error: ${result.error}`);
  }
  
  if (result.response) {
    console.log(chalk.gray('\n📄 Response:'));
    console.log(JSON.stringify(result.response, null, 2));
  }
}

// Main interactive loop
async function main() {
  showMenu();
  
  while (true) {
    const choice = await ask(chalk.cyan('\nEnter your choice: '));
    
    switch (choice) {
      case '1':
        // Run all tests
        console.log(chalk.cyan('\n🚀 Running all tests...\n'));
        await testRunner.runAllTests();
        break;
        
      case '2':
        // Run by category
        showCategories();
        const catIndex = await ask(chalk.cyan('\nSelect category (number): '));
        const categories = Object.keys(testCategories);
        const selectedCategory = categories[parseInt(catIndex) - 1];
        
        if (selectedCategory) {
          console.log(chalk.cyan(`\n🚀 Running ${selectedCategory} tests...\n`));
          await testRunner.runAllTests(selectedCategory);
        } else {
          console.log(chalk.red('Invalid selection'));
        }
        break;
        
      case '3':
        // Run specific endpoint
        showCategories();
        const cat1 = await ask(chalk.cyan('\nSelect category (number): '));
        const category1 = Object.keys(testCategories)[parseInt(cat1) - 1];
        
        if (category1) {
          showEndpoints(category1);
          const endpointNum = await ask(chalk.cyan('\nSelect endpoint (number): '));
          await runEndpoint(category1, parseInt(endpointNum) - 1);
        }
        break;
        
      case '4':
        // Run single test case
        showCategories();
        const cat2 = await ask(chalk.cyan('\nSelect category (number): '));
        const category2 = Object.keys(testCategories)[parseInt(cat2) - 1];
        
        if (category2) {
          showEndpoints(category2);
          const endpointNum2 = await ask(chalk.cyan('\nSelect endpoint (number): '));
          const endpoint = testCategories[category2 as keyof typeof testCategories][parseInt(endpointNum2) - 1];
          
          if (endpoint) {
            showTestCases(endpoint);
            const testNum = await ask(chalk.cyan('\nSelect test case (number): '));
            await runTestCase(category2, parseInt(endpointNum2) - 1, parseInt(testNum) - 1);
          }
        }
        break;
        
      case '5':
        // View all endpoints
        console.log(chalk.yellow('\n📋 All Available Endpoints:\n'));
        Object.entries(testCategories).forEach(([category, endpoints]) => {
          console.log(chalk.cyan(`\n${category.toUpperCase()}:`));
          endpoints.forEach(endpoint => {
            console.log(`  ${endpoint.method.padEnd(6)} ${endpoint.path.padEnd(50)} ${endpoint.name}`);
          });
        });
        break;
        
      case '6':
        // Exit
        console.log(chalk.green('\n👋 Goodbye!\n'));
        rl.close();
        process.exit(0);
        
      default:
        console.log(chalk.red('Invalid choice'));
    }
    
    await ask(chalk.gray('\nPress Enter to continue...'));
    showMenu();
  }
}

// Handle errors
process.on('unhandledRejection', (err) => {
  console.error(chalk.red('\n❌ Error:'), err);
  rl.close();
  process.exit(1);
});

// Start the interactive runner
main().catch(err => {
  console.error(chalk.red('Fatal error:'), err);
  rl.close();
  process.exit(1);
});