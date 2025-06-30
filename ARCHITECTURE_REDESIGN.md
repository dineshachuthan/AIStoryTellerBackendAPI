# Database Architecture Redesign - Reference Data vs User Instances

## Current Problem
The database treats stories as user-owned entities, which is fundamentally wrong. Stories should be reference data that multiple users can create narrations from.

## Correct Architecture

### Reference Data (Shared across all users)
1. **stories** - Published story content becomes reference data
2. **story_analyses** - AI analysis of stories (characters, emotions) becomes reference data  
3. **voice_modulation_templates** - Extracted emotions/sounds/modulations from analyses

### User Instances (User-specific)
1. **user_story_narrations** - User's personalized narration of any reference story
2. **user_voice_samples** - User's recorded voice samples for emotions
3. **user_emotion_voices** - User's trained voice clones

## New Schema Design

### Reference Stories (stories table)
- Remove `authorId` → Replace with `originalAuthorId` 
- Remove `narratorVoice`/`narratorVoiceType` (these belong to user narrations)
- Add `visibility`: draft/public/archived
- Published stories become reference data for everyone

### User Story Narrations (user_story_narrations table)
- `userId` - Who created this narration
- `referenceStoryId` - Which reference story this narrates
- `narratorVoice` - User's chosen narrator voice
- `segments` - User's personalized narration segments
- `voiceModifications` - User's voice customizations

### Story Analysis (story_analyses table)
- Stays mostly the same
- Analysis becomes reference data for voice templates

## Migration Strategy
1. Keep existing stories as-is during transition
2. Add new user_story_narrations table
3. Update narrative generation to use reference story + user instance pattern
4. Gradually migrate existing narrations to new model

## Benefits
- Stories become reusable reference content
- Multiple users can narrate the same story with their voices
- Clear separation between content (reference) and personalization (user instance)
- Scalable architecture for collaborative storytelling