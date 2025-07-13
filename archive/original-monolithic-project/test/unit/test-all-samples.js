const fetch = require('node-fetch');

async function testAllSamples() {
  try {
    const response = await fetch('http://localhost:5000/api/voice-cloning/test-all-samples/75', {
      method: 'POST',
      headers: {
        'Cookie': 'connect.sid=s%3ASDkqGfJXr0DfgZsjDHJ77gBzXelCe8Ow.FcQo90u7jdXXjx3U6QkLqQIyUxbdtShK65VaJJaOD8s',
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Status: SUCCESS');
      console.log('Total Samples:', data.totalSamples);
      console.log('\nSample Details:');
      data.samplesDetails.forEach(sample => {
        console.log(`- ${sample.name} (Category ${sample.category}): ${sample.duration}s`);
      });
      console.log('\nResult:', JSON.stringify(data.result, null, 2));
    } else {
      console.log('Status:', response.status);
      const error = await response.text();
      console.log('Error:', error);
    }
  } catch (error) {
    console.error('Request failed:', error);
  }
}

testAllSamples();