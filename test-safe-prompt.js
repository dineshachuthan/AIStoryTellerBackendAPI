// Test script to verify RunwayML API with completely safe content
const { createRunwayML } = require('@runwayml/sdk');

async function testSafePrompt() {
  const client = createRunwayML({
    apiKey: process.env.RUNWAYML_API_KEY
  });

  const safePrompt = "A beautiful peaceful garden with colorful flowers blooming in gentle sunlight, with soft wind moving through green grass and trees, creating a serene and calming natural scene";

  console.log('Testing with completely safe prompt:', safePrompt);

  try {
    const result = await client.videos.create({
      model: 'gen3a_turbo',
      promptText: safePrompt,
      aspectRatio: '1280:768',
      duration: 5
    });

    console.log('SUCCESS: RunwayML accepted safe prompt');
    console.log('Task ID:', result.id);
    
    return result;
  } catch (error) {
    console.error('FAILED: Even safe prompt rejected');
    console.error('Error:', error.message);
    console.error('Full error:', error);
    
    return null;
  }
}

testSafePrompt().then(result => {
  if (result) {
    console.log('RunwayML API is working with safe content');
  } else {
    console.log('RunwayML API has connectivity or authentication issues');
  }
}).catch(console.error);