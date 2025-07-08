# Collaborative Storytelling Design Document

## Overview
A comprehensive system for story collaboration where authors can invite others to narrate stories with their own voices, creating a multi-voice storytelling experience.

## Core Features

### 1. Invitation System
- **Popup Interface**: When "Collaborate" is clicked, show modal to collect:
  - Email addresses or phone numbers
  - Optional personalized message
  - Character assignment (if story has multiple characters)
- **Bulk Invitations**: Send up to 10 invitations per story
- **Tracking**: Monitor invitation status (sent, accepted, completed)

### 2. Invitee Landing Page
- **Public Access**: Works for both logged-in and unregistered users
- **Key Features**:
  - Play original story with author's voice
  - View story summary and characters
  - Record voice samples interface
  - Generate personal narrator voice
  - Play story with own voice
  - View other participants' narrations

### 3. Voice Sample Collection Strategy

#### Standard Voice Library (10-20 samples)
**Universal Emotions** (Always collected):
1. Happy - "I can't believe this wonderful surprise!"
2. Sad - "Everything feels so heavy today"
3. Angry - "This is completely unacceptable!"
4. Excited - "This is the best day ever!"
5. Scared - "What was that sound?"
6. Calm - "Let's take a deep breath and think"
7. Surprised - "I never expected to see you here!"
8. Confused - "I don't understand what's happening"
9. Confident - "I know exactly what needs to be done"
10. Tired - "I can barely keep my eyes open"

**Common Sounds** (Optional but recommended):
11. Laughter - Natural laughing sound
12. Crying - Emotional crying/sobbing
13. Sighing - Deep sigh of relief/frustration
14. Gasping - Sharp intake of breath
15. Humming - Gentle humming tune

**Character Types** (Context-specific):
16. Child voice - Higher pitch narration
17. Elder voice - Aged, wise tone
18. Whisper - Secretive, quiet speech
19. Shouting - Loud, projected voice
20. Narrator - Neutral storytelling voice

### 4. User Flows

#### Author Flow:
1. Click "Collaborate" on story
2. Add invitee emails/phones in popup
3. System generates unique invitation links
4. Monitor invitation status dashboard
5. View all narrated versions
6. Share favorite versions publicly

#### Invitee Flow (Registered User):
1. Receive invitation link
2. Click to view story landing page
3. Play original story
4. Access voice recording interface
5. Record standard voice samples
6. Generate narrator voice
7. Play story with own voice
8. View other participants' versions

#### Invitee Flow (Unregistered User):
1. Receive invitation link
2. Land on public story page
3. Enter name (no account required)
4. Record voice samples
5. Generate narrator voice
6. Play narrated story
7. Optionally create account to save

### 5. Technical Implementation

#### Database Schema Additions:
```sql
-- Story invitations
CREATE TABLE story_invitations (
  id SERIAL PRIMARY KEY,
  story_id INTEGER REFERENCES stories(id),
  inviter_id VARCHAR REFERENCES users(id),
  invitee_email VARCHAR,
  invitee_phone VARCHAR,
  invitation_token VARCHAR UNIQUE,
  status VARCHAR DEFAULT 'pending', -- pending, accepted, completed
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  accepted_at TIMESTAMP,
  completed_at TIMESTAMP
);

-- Participant narrations
CREATE TABLE participant_narrations (
  id SERIAL PRIMARY KEY,
  invitation_id INTEGER REFERENCES story_invitations(id),
  participant_name VARCHAR NOT NULL,
  participant_id VARCHAR REFERENCES users(id), -- NULL for guests
  narrator_voice_id VARCHAR, -- ElevenLabs voice ID
  narration_data JSONB, -- Cached narration segments
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Standard voice samples
CREATE TABLE standard_voice_samples (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  category VARCHAR NOT NULL, -- emotion, sound, character
  sample_text TEXT,
  display_order INTEGER,
  is_required BOOLEAN DEFAULT false
);
```

#### API Endpoints:
```
POST /api/stories/:id/collaborate
  - Create invitations and send emails/SMS

GET /api/invitations/:token
  - Get invitation details and story info

POST /api/invitations/:token/accept
  - Accept invitation (creates participant record)

POST /api/invitations/:token/voice-samples
  - Submit voice recordings

POST /api/invitations/:token/generate-narrator
  - Generate ElevenLabs voice

GET /api/invitations/:token/narrations
  - Get all participant narrations for story

POST /api/invitations/:token/play
  - Generate story narration with participant's voice
```

### 6. UI Components

#### Collaboration Modal:
- Email/phone input fields (add more button)
- Message textarea
- Character assignment dropdown (if applicable)
- Send invitations button
- Cost estimate (if using SMS)

#### Participant Dashboard:
- Story title and summary
- Progress indicator (samples recorded, voice generated, narration complete)
- Voice recording cards for standard samples
- Generate narrator voice button
- Play buttons for all versions
- Share/privacy toggle

#### Multi-Voice Player:
- Dropdown to select narrator
- Play/pause controls
- Timeline with speaker indicators
- Download option (if permitted)

### 7. Handling Edge Cases

#### Insufficient Voice Samples:
- If user records < 5 samples, show warning
- Suggest recording more emotions
- Allow fallback to AI voice for missing emotions

#### Guest User Limitations:
- Voice samples stored for 30 days
- Cannot save multiple stories
- Prompt to create account for persistence

#### Privacy Controls:
- Authors control story visibility
- Participants control their narration visibility
- Option to anonymize participant names

### 8. Future Enhancements
- Character-specific voice assignments
- Collaborative video generation
- Voice mixing (multiple voices in one story)
- Social sharing with attribution
- Narration voting/favorites system

## Implementation Priority
1. Basic invitation system with email
2. Guest user voice recording
3. Standard voice sample interface
4. Multi-narration playback
5. SMS invitations
6. Advanced privacy controls