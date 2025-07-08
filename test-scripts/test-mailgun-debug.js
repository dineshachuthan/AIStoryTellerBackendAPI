/**
 * Debug MailGun email sending
 */

const API_BASE = 'http://localhost:5000';

// Get email from command line argument or use default
const recipientEmail = process.argv[2] || 'test@example.com';

async function testMailgunDebug() {
  console.log('🔍 Testing MailGun email delivery...\n');
  console.log('📬 Sending to:', recipientEmail);
  console.log('ℹ️  Note: For sandbox domains, recipient must be added to "Authorized Recipients" in MailGun dashboard\n');
  
  try {
    // Test the notification service directly
    const response = await fetch(`${API_BASE}/api/test/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: recipientEmail,
        subject: 'Test Email from Storytelling Platform',
        content: 'This is a test email to verify MailGun integration. If you receive this, the email system is working correctly!'
      })
    });
    
    const result = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response body:', JSON.stringify(result, null, 2));
    
    if (response.ok && result.success) {
      console.log('\n✅ Email sent successfully!');
      console.log('Provider used:', result.provider);
    } else {
      console.log('\n❌ Email sending failed');
      if (result.details && result.details.includes('Sandbox subdomains')) {
        console.log('\n⚠️  SANDBOX RESTRICTION DETECTED:');
        console.log('   1. Go to your MailGun dashboard');
        console.log('   2. Navigate to "Sending" → "Overview"');
        console.log('   3. Click on "Authorized Recipients"');
        console.log(`   4. Add "${recipientEmail}" to the list`);
        console.log('   5. Verify the email address when you receive the confirmation');
        console.log('   6. Run this test again\n');
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing email:', error);
  }
}

// Show usage
if (process.argv.length < 3) {
  console.log('Usage: node test-mailgun-debug.js <your-email@example.com>\n');
}

// Run the test
testMailgunDebug();