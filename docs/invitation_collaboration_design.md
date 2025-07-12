# Invitation Collaboration Design Document

## Overview
This document outlines the design decisions for the invitation collaboration system, specifically focusing on conversation style handling and schema design for relationship-aware narration.

## Current Architecture

### Database Tables
- **story_invitations**: Stores invitation metadata (email, phone, characterId, token)
- **story_narrations**: Stores narration cache metadata (storyId, userId, conversationStyle, narratorProfile, segments)

### Frontend Components
- **InviteCollaboratorsDialog**: UI for sending invitations with conversation style selection
- **8 Conversation Styles**: respectful, business, jovial, playful, close_friends, parent_to_child, child_to_parent, siblings

## Design Challenge
**Problem**: Conversation style needs to be available in two contexts:
1. When invitation is sent (inviter selects style for relationship)
2. When narration is generated (system needs style for cache key and ElevenLabs parameters)

**Current State**: 
- Frontend sends conversationStyle to apiClient.sendStoryInvitations()
- story_narrations table has conversation_style column
- story_invitations table may need conversation_style column

## Schema Design Options

### Option 1: Dual Storage
```sql
-- Store conversation style in both tables for different purposes:

story_invitations:
- conversation_style (what inviter selected for this relationship)
- Purpose: UI default when recipient lands on invitation page

story_narrations: 
- conversation_style (what was actually used for narration generation)
- Purpose: Cache key and narration metadata
```

### Option 2: Pre-create Narration Rows (RECOMMENDED)
```sql
-- When invitation is sent, create default story_narration row:
story_narrations:
- storyId, userId (invitation recipient), conversation_style
- segments: NULL (empty until generated)
- Purpose: Ready for immediate ElevenLabs generation when user lands
```

## Recommended Approach: Pre-creation Strategy

### Benefits
1. **Immediate Generation**: When user lands on invitation page, narration row already exists
2. **No Database Writes During Narration**: Just update existing row with segments
3. **Cache Key Ready**: Multi-dimensional cache key already established
4. **Conversation Style Locked**: Prevents confusion about which style to use

### User Flow
1. **Invitation Sent**: 
   - Process all invitations to identify unique conversation styles
   - Create one story_narration row per unique conversation style (segments = NULL)
   - Store invitation records with conversation_style reference
2. **Recipient Clicks Link**: 
   - Find existing narration row by storyId + conversation_style
   - Generate segments if not already cached → Update row
3. **Subsequent Visits**: Load existing narration from cache

### Key Design Insight: One-to-Many Relationship
**Critical Optimization**: 10 invitations may share only 1 narration row if they have the same conversation style.

**Example Scenario**:
- User invites 10 people: 5 with "respectful" style, 3 with "business" style, 2 with "jovial" style
- **Result**: Only 3 narration rows created (one per unique conversation style)
- **Benefit**: Efficient storage and narration generation

## Implementation Questions
- ✅ **DECIDED**: Create narration rows for ALL invitations sent (pre-creation strategy)
- ✅ **DECIDED**: One narration row per unique conversation style (not per invitation)
- ❌ How to handle conversation style changes after invitation is sent?
- ❌ Should invitation table also store conversation_style for reference?

## Current Implementation Status
- ✅ Frontend UI includes conversation style selection
- ✅ Frontend sends conversationStyle to API
- ❌ Backend endpoint needs to handle conversation style data
- ❌ Schema changes needed (either dual storage or pre-creation)

## Next Steps
1. Finalize schema approach (dual storage vs pre-creation)
2. Update database schema accordingly
3. Modify backend API endpoint to handle conversation style
4. Test invitation flow with conversation style integration

## Decision Log
- **Date**: 2025-01-12
- **Decision**: Pre-creation strategy with one-to-many optimization
- **Reasoning**: 
  - Enables immediate narration generation when recipient visits invitation page
  - Optimizes storage: 10 invitations may share 1 narration row if same conversation style
  - Reduces ElevenLabs API calls through intelligent caching
- **Status**: ✅ **FINALIZED**

## Implementation Algorithm
```
When sending invitations:
1. Collect all invitation data with conversation styles
2. Group invitations by unique conversation style
3. For each unique conversation style:
   - Create story_narration row (storyId, userId=null, conversationStyle, segments=null)
4. Store each invitation record with conversation_style reference
5. Send emails/SMS with invitation tokens

When recipient visits:
1. Extract conversation style from invitation
2. Find existing story_narration row by storyId + conversationStyle
3. Generate segments if segments=null
4. Update story_narration row with generated segments
5. Serve narration to user
```

## Database Schema Requirements
- **story_invitations**: Add conversation_style column
- **story_narrations**: Keep existing conversation_style column (used for cache key)
- **Relationship**: Many invitations → One narration (grouped by conversation style)