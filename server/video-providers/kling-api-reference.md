# Kling AI Video Generation API Reference

Based on the documentation analysis, here's what I understand about Kling's capabilities:

## API Endpoints
- **Base URL**: `https://api.piapi.ai/api/kling`
- **Text-to-Video**: `/v1/videos/text2video`
- **Image-to-Video**: `/v1/videos/image2video` (if supported)
- **Task Status**: `/v1/videos/{task_id}`

## Authentication
- Uses Bearer token authentication
- Requires both KLING_ACCESS_KEY and KLING_SECRET_KEY combined as API key

## Video Generation Parameters

### Basic Parameters
- `model`: 'kling-v1' or 'kling-v1-5' (Pro version)
- `prompt`: Text description for video generation
- `aspect_ratio`: '16:9', '9:16', '1:1'
- `duration`: Up to 10-20 seconds depending on model
- `mode`: 'std' (standard) or 'pro' (professional quality)

### Advanced Features
- **Character Consistency**: Detailed character descriptions in prompts
- **Scene Backgrounds**: Rich environmental descriptions
- **Camera Controls**: Movement and framing instructions
- **Style Controls**: Cinematic, artistic, realistic styles

## Character Integration
For character consistency:
1. Include detailed physical descriptions
2. Specify personality traits that affect movement/expression
3. Reference character roles and relationships
4. Use consistent naming throughout scenes

## Scene Backgrounds
For rich environments:
1. Specify location details (indoor/outdoor, specific places)
2. Include time of day and lighting conditions
3. Describe atmospheric elements (weather, mood)
4. Add visual details (colors, textures, props)

## Voice Integration Notes
- Kling primarily generates video content
- Audio/voice would typically be added post-generation
- For lip-sync, character dialogue should be included in prompts
- Voice samples would be handled separately in our audio pipeline

## Content Policies
- Avoid violence, explicit content, inappropriate themes
- Focus on positive, creative, artistic content
- Use euphemisms for any potentially sensitive themes
- Emphasize storytelling and cinematic quality

## Cost Optimization
- Use 'std' mode for testing (lower cost)
- Limit duration to minimize API usage
- Cache successful generations
- Use detailed prompts to reduce regeneration needs