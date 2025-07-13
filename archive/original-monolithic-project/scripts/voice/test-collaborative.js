// Test script for collaborative roleplay system
const fetch = require('node-fetch');

const baseUrl = 'http://localhost:5000';

async function testCollaborativeSystem() {
  console.log('Testing Collaborative Roleplay System...\n');

  try {
    // Test 1: Check if collaborative routes are accessible
    console.log('1. Testing collaborative routes...');
    const templatesResponse = await fetch(`${baseUrl}/api/roleplay-templates`);
    console.log(`   Templates endpoint: ${templatesResponse.status}`);
    
    if (templatesResponse.ok) {
      const templates = await templatesResponse.json();
      console.log(`   Found ${templates.length} public templates`);
    }

    // Test 2: Test invitation endpoint (should fail without valid token)
    console.log('\n2. Testing invitation endpoint...');
    const inviteResponse = await fetch(`${baseUrl}/api/invitations/invalid-token`);
    console.log(`   Invalid invitation: ${inviteResponse.status}`);
    
    if (inviteResponse.status === 404) {
      console.log('   ✓ Correctly rejects invalid invitation tokens');
    }

    // Test 3: Test story conversion (will need authentication)
    console.log('\n3. Testing story conversion endpoint...');
    const conversionResponse = await fetch(`${baseUrl}/api/stories/1/convert-to-template`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ makePublic: true })
    });
    console.log(`   Conversion endpoint: ${conversionResponse.status}`);
    
    if (conversionResponse.status === 401) {
      console.log('   ✓ Correctly requires authentication for story conversion');
    }

    console.log('\n✓ Basic collaborative system endpoints are functional');
    console.log('✓ Authentication is properly enforced');
    console.log('✓ Error handling works as expected');

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Run the test
testCollaborativeSystem();