import fetch from 'node-fetch';

async function testValidationEndpoint() {
  try {
    console.log('🔍 Testing validation endpoint directly...');
    
    // Test the validation endpoint that's causing 500 errors
    const response = await fetch('http://localhost:5000/api/voice-cloning/validation/1/emotions', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'test-script'
      }
    });
    
    console.log(`Status: ${response.status}`);
    console.log(`Headers:`, response.headers.raw());
    
    const text = await response.text();
    console.log(`Response body:`, text);
    
    if (response.status >= 400) {
      console.log('❌ Validation endpoint returning error');
      try {
        const json = JSON.parse(text);
        console.log('Error details:', json);
      } catch (e) {
        console.log('Could not parse error as JSON');
      }
    } else {
      console.log('✅ Validation endpoint working');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testValidationEndpoint();