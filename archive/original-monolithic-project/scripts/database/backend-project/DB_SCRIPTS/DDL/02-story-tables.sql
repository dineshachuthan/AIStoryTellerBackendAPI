-- ================================================
-- Story and Content Tables DDL
-- Stories, Characters, Emotions, Narrations
-- ================================================

-- Table: user_character_preferences
CREATE TABLE IF NOT EXISTS user_character_preferences (
    id INTEGER NOT NULL DEFAULT nextval('user_character_preferences_id_seq'::regclass) PRIMARY KEY,
    user_id VARCHAR NOT NULL REFERENCES users(id),
    archetype_id INTEGER REFERENCES character_archetypes(id),
    character_pattern VARCHAR NOT NULL,
    preferred_voice VARCHAR NOT NULL,
    speed_modifier DOUBLE PRECISION DEFAULT 1.0,
    reason_for_preference TEXT,
    times_used INTEGER DEFAULT 0,
    last_used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Table: stories
CREATE TABLE IF NOT EXISTS stories (
    id INTEGER NOT NULL DEFAULT nextval('stories_id_seq'::regclass) PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    summary TEXT,
    category TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}'::text[],
    voice_sample_url TEXT,
    cover_image_url TEXT,
    author_id VARCHAR REFERENCES users(id),
    copyright_info TEXT,
    license_type TEXT DEFAULT 'all_rights_reserved'::text,
    is_published BOOLEAN DEFAULT false,
    is_adult_content BOOLEAN DEFAULT false,
    view_count INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    extracted_characters JSONB DEFAULT '[]'::jsonb,
    extracted_emotions JSONB DEFAULT '[]'::jsonb,
    upload_type TEXT NOT NULL,
    original_audio_url TEXT,
    processing_status TEXT DEFAULT 'pending'::text,
    genre TEXT,
    sub_genre TEXT,
    emotional_tags TEXT[],
    mood_category TEXT,
    age_rating TEXT DEFAULT 'general'::text,
    reading_time INTEGER,
    published_at TIMESTAMP,
    status TEXT DEFAULT 'draft'::text,
    narrator_voice TEXT,
    narrator_voice_type TEXT,
    language VARCHAR(10) DEFAULT 'en-US'::character varying
);


-- Table: story_analyses
CREATE TABLE IF NOT EXISTS story_analyses (
    id INTEGER NOT NULL DEFAULT nextval('story_analyses_id_seq'::regclass) PRIMARY KEY,
    story_id INTEGER NOT NULL REFERENCES stories(id),
    analysis_type VARCHAR(50) NOT NULL,
    analysis_data JSONB NOT NULL,
    generated_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    content_hash VARCHAR(64)
);

CREATE UNIQUE INDEX story_analyses_story_id_analysis_type_key ON public.story_analyses USING btree (story_id, analysis_type);

-- Table: story_analysis_cache
CREATE TABLE IF NOT EXISTS story_analysis_cache (
    id INTEGER NOT NULL DEFAULT nextval('story_analysis_cache_id_seq'::regclass) PRIMARY KEY,
    story_content_hash VARCHAR(255) NOT NULL,
    analysis_data JSONB NOT NULL,
    characters_extracted JSONB,
    emotions_detected JSONB,
    api_cost NUMERIC,
    generated_at TIMESTAMP DEFAULT now(),
    reuse_count INTEGER DEFAULT 1
);

CREATE UNIQUE INDEX story_analysis_cache_story_content_hash_key ON public.story_analysis_cache USING btree (story_content_hash);

-- Table: story_characters
CREATE TABLE IF NOT EXISTS story_characters (
    id INTEGER NOT NULL DEFAULT nextval('story_characters_id_seq'::regclass) PRIMARY KEY,
    story_id INTEGER REFERENCES stories(id),
    name TEXT NOT NULL,
    description TEXT,
    personality TEXT,
    role TEXT,
    image_url TEXT,
    is_generated BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_voice TEXT,
    voice_sample_id INTEGER
);


-- Table: story_collaborations
CREATE TABLE IF NOT EXISTS story_collaborations (
    id INTEGER NOT NULL DEFAULT nextval('story_collaborations_id_seq'::regclass) PRIMARY KEY,
    story_id INTEGER NOT NULL REFERENCES stories(id),
    invited_user_id VARCHAR NOT NULL REFERENCES users(id),
    invited_by_user_id VARCHAR NOT NULL REFERENCES users(id),
    assigned_character_id INTEGER REFERENCES story_characters(id),
    status VARCHAR NOT NULL DEFAULT 'pending'::character varying,
    permissions VARCHAR NOT NULL DEFAULT 'voice_only'::character varying,
    invited_at TIMESTAMP DEFAULT now(),
    responded_at TIMESTAMP
);


-- Table: story_customizations
CREATE TABLE IF NOT EXISTS story_customizations (
    id INTEGER NOT NULL DEFAULT nextval('story_customizations_id_seq'::regclass) PRIMARY KEY,
    original_story_id INTEGER NOT NULL REFERENCES stories(id),
    customized_by_user_id VARCHAR NOT NULL REFERENCES users(id),
    custom_title TEXT,
    custom_character_images JSONB,
    custom_voice_assignments JSONB,
    custom_emotion_mappings JSONB,
    is_private BOOLEAN DEFAULT true,
    play_count INTEGER DEFAULT 0,
    last_played_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Table: story_emotions
CREATE TABLE IF NOT EXISTS story_emotions (
    id INTEGER NOT NULL DEFAULT nextval('story_emotions_id_seq'::regclass) PRIMARY KEY,
    story_id INTEGER REFERENCES stories(id),
    emotion TEXT NOT NULL,
    intensity INTEGER DEFAULT 5,
    context TEXT,
    voice_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Table: story_group_members
CREATE TABLE IF NOT EXISTS story_group_members (
    id INTEGER NOT NULL DEFAULT nextval('story_group_members_id_seq'::regclass) PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES story_groups(id),
    user_id VARCHAR NOT NULL REFERENCES users(id),
    assigned_character_id INTEGER REFERENCES story_characters(id),
    role VARCHAR NOT NULL DEFAULT 'member'::character varying,
    joined_at TIMESTAMP DEFAULT now()
);


-- Table: story_groups
CREATE TABLE IF NOT EXISTS story_groups (
    id INTEGER NOT NULL DEFAULT nextval('story_groups_id_seq'::regclass) PRIMARY KEY,
    story_id INTEGER NOT NULL REFERENCES stories(id),
    name VARCHAR NOT NULL,
    description TEXT,
    visibility VARCHAR NOT NULL DEFAULT 'private'::character varying,
    created_by_user_id VARCHAR NOT NULL REFERENCES users(id),
    invite_code VARCHAR,
    max_members INTEGER DEFAULT 10,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX story_groups_invite_code_unique ON public.story_groups USING btree (invite_code);

-- Table: story_invitations
CREATE TABLE IF NOT EXISTS story_invitations (
    id INTEGER NOT NULL DEFAULT nextval('story_invitations_id_seq'::regclass) PRIMARY KEY,
    story_id INTEGER NOT NULL REFERENCES stories(id),
    inviter_id VARCHAR NOT NULL REFERENCES users(id),
    invitee_email VARCHAR,
    invitee_phone VARCHAR,
    invitation_token VARCHAR NOT NULL,
    status VARCHAR NOT NULL DEFAULT 'pending'::character varying,
    message TEXT,
    character_id INTEGER REFERENCES story_characters(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP,
    completed_at TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX story_invitations_invitation_token_key ON public.story_invitations USING btree (invitation_token);
CREATE INDEX idx_story_invitations_story ON public.story_invitations USING btree (story_id);
CREATE INDEX idx_story_invitations_token ON public.story_invitations USING btree (invitation_token);

-- Table: story_modulation_requirements
CREATE TABLE IF NOT EXISTS story_modulation_requirements (
    id INTEGER NOT NULL DEFAULT nextval('story_modulation_requirements_id_seq'::regclass) PRIMARY KEY,
    story_id INTEGER NOT NULL,
    modulation_type VARCHAR NOT NULL,
    modulation_key VARCHAR NOT NULL,
    template_id INTEGER,
    is_required BOOLEAN DEFAULT true,
    context_usage TEXT,
    detected_by VARCHAR DEFAULT 'ai'::character varying,
    confidence DOUBLE PRECISION DEFAULT 1.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Table: story_narrations
CREATE TABLE IF NOT EXISTS story_narrations (
    id INTEGER NOT NULL DEFAULT nextval('story_narrations_id_seq'::regclass) PRIMARY KEY,
    story_id INTEGER NOT NULL REFERENCES stories(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    narrator_voice VARCHAR(255) NOT NULL,
    narrator_voice_type VARCHAR(20) NOT NULL,
    segments JSONB NOT NULL,
    total_duration INTEGER NOT NULL,
    audio_file_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    conversation_style VARCHAR,
    relationship_id INTEGER,
    shared_with_identifier TEXT,
    narrator_profile VARCHAR DEFAULT 'neutral'::character varying
);


-- Table: story_playbacks
CREATE TABLE IF NOT EXISTS story_playbacks (
    id INTEGER NOT NULL DEFAULT nextval('story_playbacks_id_seq'::regclass) PRIMARY KEY,
    story_id INTEGER NOT NULL REFERENCES stories(id),
    narration_data JSONB NOT NULL,
    created_by_user_id VARCHAR NOT NULL REFERENCES users(id),
    visibility VARCHAR NOT NULL DEFAULT 'private'::character varying,
    play_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Table: story_scenes
CREATE TABLE IF NOT EXISTS story_scenes (
    id INTEGER NOT NULL DEFAULT nextval('story_scenes_id_seq'::regclass) PRIMARY KEY,
    story_id INTEGER NOT NULL,
    scene_number INTEGER NOT NULL,
    title VARCHAR NOT NULL,
    content TEXT,
    background_data JSONB,
    dialogue_data JSONB,
    stage_directions TEXT[],
    estimated_duration INTEGER,
    emotional_tone VARCHAR,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT,
    dialogues JSONB NOT NULL DEFAULT '[]'::jsonb,
    background_prompt TEXT,
    background_image_url TEXT,
    pacing VARCHAR DEFAULT 'normal'::character varying,
    background_generation_status VARCHAR DEFAULT 'pending'::character varying,
    last_processed_at TIMESTAMP
);

CREATE INDEX idx_story_scenes_story_id ON public.story_scenes USING btree (story_id);

-- Table: story_user_confidence
CREATE TABLE IF NOT EXISTS story_user_confidence (
    id INTEGER NOT NULL DEFAULT nextval('story_user_confidence_id_seq'::regclass) PRIMARY KEY,
    story_id INTEGER NOT NULL REFERENCES stories(id),
    user_id VARCHAR NOT NULL REFERENCES users(id),
    total_interactions INTEGER DEFAULT 0,
    voice_recordings_completed INTEGER DEFAULT 0,
    emotions_recorded INTEGER DEFAULT 0,
    playbacks_completed INTEGER DEFAULT 0,
    time_spent_seconds INTEGER DEFAULT 0,
    voice_confidence INTEGER DEFAULT 0,
    story_engagement INTEGER DEFAULT 0,
    overall_confidence INTEGER DEFAULT 0,
    last_interaction_at TIMESTAMP DEFAULT now(),
    first_interaction_at TIMESTAMP DEFAULT now(),
    session_count INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX story_user_confidence_story_id_user_id_key ON public.story_user_confidence USING btree (story_id, user_id);

-- Table: character_archetypes
CREATE TABLE IF NOT EXISTS character_archetypes (
    id INTEGER NOT NULL DEFAULT nextval('character_archetypes_id_seq'::regclass) PRIMARY KEY,
    name VARCHAR NOT NULL,
    category VARCHAR NOT NULL,
    gender VARCHAR,
    age_group VARCHAR,
    personality VARCHAR,
    recommended_voice VARCHAR NOT NULL,
    description TEXT,
    keywords TEXT[],
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


