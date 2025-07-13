/**
 * Test invitation creation with the fixed backend
 */

const API_BASE = 'http://localhost:3000';

async function testInvitationCreation() {
  console.log('🚀 Testing invitation creation...\n');
  
  // Test data - using Story ID 1 (adjust if needed)
  const testData = {
    storyId: 1,
    invitations: [
      {
        email: 'test@example.com',
        characterId: 1
      },
      {
        phone: '+1234567890',
        characterId: 2
      }
    ],
    message: 'Please join our roleplay!'
  };
  
  try {
    // Make the API request
    const response = await fetch(`${API_BASE}/api/stories/${testData.storyId}/invitations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'connect.sid=...' // Add your session cookie here
      },
      body: JSON.stringify(testData)
    });
    
    const result = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response body:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('\n✅ Invitation creation successful!');
      console.log(`Created ${result.data.successful} invitations`);
      console.log(`Failed ${result.data.failed} invitations`);
    } else {
      console.log('\n❌ Invitation creation failed:', result.message);
    }
    
  } catch (error) {
    console.error('❌ Error testing invitation creation:', error);
  }
}

// Run the test
testInvitationCreation();
