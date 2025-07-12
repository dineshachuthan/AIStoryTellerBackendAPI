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
1. **Invitation Sent**: Create story_narration row with conversation_style (segments = NULL)
2. **Recipient Clicks Link**: Find existing narration row → Generate segments → Update row
3. **Subsequent Visits**: Load existing narration from cache

### Implementation Questions
- Should we create narration rows for ALL invitations sent, or only when recipient first visits?
- How to handle conversation style changes after invitation is sent?
- Should invitation table also store conversation_style for reference?

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
- **Decision**: Analyzing pre-creation strategy for story_narrations table
- **Reasoning**: Enables immediate narration generation when recipient visits invitation page
- **Status**: Under discussion