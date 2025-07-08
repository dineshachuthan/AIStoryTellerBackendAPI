# API Test Suite

Comprehensive REST API endpoint testing suite that validates all endpoints against the `api-client.ts` interface.

## Features

- **Complete Coverage**: Tests all API endpoints defined in `api-client.ts`
- **Success & Failure Testing**: Validates both success and error conditions
- **Test Data Management**: Hardcoded test data with database refresh capability
- **Category-Based Testing**: Run tests by functional category
- **Detailed Reporting**: Color-coded terminal output with pass/fail statistics
- **Interface Validation**: Ensures API responses match frontend expectations

## Quick Start

```bash
# Run all API tests
npm run test:api

# Run tests for specific category
npm run test:api auth
npm run test:api stories
npm run test:api narration

# Show help
npm run test:api help
```

## Test Categories

- **auth**: Authentication endpoints (login, register, profile)
- **stories**: Story CRUD operations and analysis
- **narration**: Voice recording and ElevenLabs narration
- **roleplay**: Collaborative roleplay and invitations
- **video**: Video generation with multiple providers
- **subscription**: Payment plans and usage tracking
- **notification**: Email/SMS notifications
- **emotion**: Reference data for emotions, sounds, modulations

## Test Data

Test data is stored in `test-data.ts` with real values from the database:
- User IDs
- Story IDs
- Voice sample IDs
- Invitation tokens

### Refreshing Test Data

To pull fresh test data from the database:

```bash
npm run generate-test-data
```

This updates `test-data.ts` with current database values.

## Writing New Tests

1. Add endpoint definition to appropriate file in `endpoints/` directory
2. Define test cases with success and failure scenarios
3. Include response validation logic
4. Import in `test-runner.ts`

### Example Test Case

```typescript
{
  name: 'Should create story',
  description: 'Tests story creation',
  input: {
    title: 'Test Story',
    content: 'Story content',
    storyType: 'text'
  },
  expectedStatus: 201,
  validateResponse: (response) => {
    return response.id && response.title === 'Test Story';
  }
}
```

## Test Results

The test runner provides:
- Total test count
- Pass/fail statistics
- Category breakdown
- Failed test details
- Execution time

### Sample Output

```
🚀 Starting API Test Suite
═══════════════════════════════════

📋 Testing: Get Current User
   GET /api/auth/user
   ✅ Should return current user when authenticated (125ms)
   ❌ Should return 401 when not authenticated (23ms)

📊 Test Summary
═══════════════════════════════════
Total Tests: 48
Passed: 45
Failed: 3
Pass Rate: 93.8%
Duration: 12.45s

Category Breakdown:
  auth: 8/8 (100%)
  stories: 12/13 (92%)
  narration: 9/10 (90%)
```

## Architecture

- **test-config.ts**: Core interfaces and configuration
- **test-data.ts**: Hardcoded test values
- **test-runner.ts**: Main test execution engine
- **endpoints/**: Individual endpoint test definitions
- **run-tests.ts**: CLI entry point

## Integration with Frontend

All tests validate that API responses match the interfaces expected by `api-client.ts`, ensuring:
- Correct response structure
- Proper error format
- Expected data types
- Required fields presence

This guarantees frontend-backend compatibility.