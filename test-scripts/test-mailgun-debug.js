/**
 * Debug MailGun email sending
 */

const API_BASE = 'http://localhost:5000';

async function testMailgunDebug() {
  console.log('🔍 Testing MailGun email delivery...\n');
  
  try {
    // Test the notification service directly
    const response = await fetch(`${API_BASE}/api/test/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: 'test@example.com', // Use your verified email
        subject: 'Test Email from Storytelling Platform',
        content: 'This is a test email to verify MailGun integration.'
      })
    });
    
    const result = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response body:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('\n✅ Test email request successful!');
    } else {
      console.log('\n❌ Test email request failed:', result.message);
    }
    
  } catch (error) {
    console.error('❌ Error testing email:', error);
  }
}

// Run the test
testMailgunDebug();