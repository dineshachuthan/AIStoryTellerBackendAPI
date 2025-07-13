# Multi-Language Relationship Schema Design

## Problem Statement
Users speak different languages with different people and use different conversation styles:
- English with colleagues (business style)
- Tamil with parents (respectful style)  
- Hindi with spouse (intimate style)
- Mix of languages with kids (playful style)

## Proposed Schema Architecture

### 1. User Language Preferences Table
```sql
CREATE TABLE user_language_preferences (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR REFERENCES users(id),
  language VARCHAR(10) NOT NULL, -- 'en', 'ta', 'hi', 'te', etc.
  proficiency_level VARCHAR(20) DEFAULT 'native', -- 'native', 'fluent', 'intermediate', 'basic'
  is_preferred BOOLEAN DEFAULT false, -- Primary language for UI
  use_contexts TEXT[], -- ['family', 'work', 'friends', 'formal']
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. User Relationships Table
```sql
CREATE TABLE user_relationships (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR REFERENCES users(id),
  relationship_type VARCHAR(50) NOT NULL, -- 'spouse', 'parent', 'child', 'sibling', 'colleague', 'friend', 'boss'
  relationship_label VARCHAR(100), -- "My Mom", "My Boss", "College Friend"
  preferred_language VARCHAR(10) NOT NULL, -- Language used with this relationship
  conversation_style VARCHAR(50) NOT NULL, -- 'respectful', 'business', 'intimate', 'playful'
  intimacy_level INTEGER DEFAULT 5, -- 1-10 scale for customization
  contact_info JSONB, -- Optional: email, phone for direct sharing
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3. Language-Specific Voice Profiles
```sql
CREATE TABLE user_language_voice_profiles (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR REFERENCES users(id),
  language VARCHAR(10) NOT NULL,
  profile_name VARCHAR(100) NOT NULL, -- "Tamil Narrator", "English Business Voice"
  elevenlabs_voice_id TEXT,
  voice_characteristics JSONB, -- Language-specific voice settings
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, language, profile_name)
);
```

### 4. Conversation Style Configurations per Language
```sql
CREATE TABLE language_conversation_styles (
  id SERIAL PRIMARY KEY,
  language VARCHAR(10) NOT NULL,
  style_key VARCHAR(50) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  voice_parameters JSONB, -- Language-specific voice modifications
  cultural_context TEXT, -- Language-specific cultural considerations
  sample_phrases TEXT[], -- Example phrases in this language/style
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(language, style_key)
);
```

### 5. Story Sharing Contexts
```sql
CREATE TABLE story_sharing_contexts (
  id SERIAL PRIMARY KEY,
  story_id INTEGER REFERENCES stories(id),
  author_id VARCHAR REFERENCES users(id),
  recipient_relationship_id INTEGER REFERENCES user_relationships(id),
  language VARCHAR(10) NOT NULL,
  conversation_style VARCHAR(50) NOT NULL,
  narration_url TEXT, -- Cached narration for this specific context
  cache_key VARCHAR(255), -- User.Story.Language.Style.Relationship
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(story_id, recipient_relationship_id, language, conversation_style)
);
```

## Example Data Flow

### User Setup:
```sql
-- User speaks 3 languages
INSERT INTO user_language_preferences VALUES
(1, 'user123', 'en', 'native', true, ['work', 'friends']),
(2, 'user123', 'ta', 'native', false, ['family', 'elders']),
(3, 'user123', 'hi', 'fluent', false, ['spouse', 'in-laws']);

-- User's relationships
INSERT INTO user_relationships VALUES
(1, 'user123', 'spouse', 'My Wife', 'hi', 'intimate', 9),
(2, 'user123', 'parent', 'My Dad', 'ta', 'respectful', 8),
(3, 'user123', 'colleague', 'My Boss', 'en', 'business', 4),
(4, 'user123', 'child', 'My Kid', 'en', 'playful', 10);
```

### Story Sharing:
```sql
-- Same story, different contexts
INSERT INTO story_sharing_contexts VALUES
(1, 101, 'user123', 1, 'hi', 'intimate', '/narration/hindi_intimate_101.mp3'),
(2, 101, 'user123', 2, 'ta', 'respectful', '/narration/tamil_respectful_101.mp3'),
(3, 101, 'user123', 3, 'en', 'business', '/narration/english_business_101.mp3'),
(4, 101, 'user123', 4, 'en', 'playful', '/narration/english_playful_101.mp3');
```

## Cache Key Structure
```
{userId}.{storyId}.{language}.{conversationStyle}.{relationshipType}
```

Examples:
- `user123.101.hi.intimate.spouse` - Hindi intimate narration for spouse
- `user123.101.ta.respectful.parent` - Tamil respectful narration for parent
- `user123.101.en.business.colleague` - English business narration for colleague

## Benefits

1. **Multi-Language Support**: Each language has its own voice profiles and conversation styles
2. **Relationship-Aware**: Different narration based on who will receive the story
3. **Cultural Context**: Language-specific conversation styles respect cultural nuances
4. **Efficient Caching**: Multi-dimensional cache keys prevent regeneration
5. **Scalable**: Easy to add new languages, relationships, and conversation styles
6. **Personalized**: Users can define their own relationships and preferred languages

## Implementation Priority

1. **Phase 1**: Basic user_relationships table with language/style mapping
2. **Phase 2**: Language-specific voice profiles and conversation styles
3. **Phase 3**: Story sharing contexts with multi-dimensional caching
4. **Phase 4**: Cultural context and advanced personalization