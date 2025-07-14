-- Core Database Schema for AI Storytelling Platform
-- Generated from actual database schema on January 13, 2025
-- This script creates all core tables with accurate schema

-- Drop existing tables if they exist (in dependency order)
DROP TABLE IF EXISTS story_invitations CASCADE;
DROP TABLE IF EXISTS story_narrations CASCADE;
DROP TABLE IF EXISTS user_esm_recordings CASCADE;
DROP TABLE IF EXISTS esm_ref CASCADE;
DROP TABLE IF EXISTS stories CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create sequences
CREATE SEQUENCE IF NOT EXISTS stories_id_seq;
CREATE SEQUENCE IF NOT EXISTS esm_ref_esm_ref_id_seq;
CREATE SEQUENCE IF NOT EXISTS user_esm_recordings_user_esm_recordings_id_seq;
CREATE SEQUENCE IF NOT EXISTS story_narrations_id_seq;
CREATE SEQUENCE IF NOT EXISTS story_invitations_id_seq;

-- Users table - Core user management
CREATE TABLE users (
    id VARCHAR PRIMARY KEY NOT NULL,
    email VARCHAR UNIQUE,
    first_name VARCHAR,
    last_name VARCHAR,
    display_name VARCHAR,
    profile_image_url VARCHAR,
    provider VARCHAR,
    provider_id VARCHAR,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_email_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP,
    external_id VARCHAR UNIQUE,
    language VARCHAR DEFAULT 'en',
    locale VARCHAR,
    native_language VARCHAR,
    stripe_customer_id VARCHAR,
    stripe_subscription_id VARCHAR,
    subscription_status VARCHAR,
    role_id INTEGER,
    is_super_admin BOOLEAN DEFAULT FALSE
);

-- Sessions table - Session management
CREATE TABLE sessions (
    sid VARCHAR PRIMARY KEY NOT NULL,
    sess JSON NOT NULL,
    expire TIMESTAMP NOT NULL
);

-- Stories table - Main content storage
CREATE TABLE stories (
    id INTEGER PRIMARY KEY DEFAULT nextval('stories_id_seq'),
    title TEXT NOT NULL,
    content TEXT,
    summary TEXT,
    category TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    voice_sample_url TEXT,
    cover_image_url TEXT,
    author_id VARCHAR REFERENCES users(id),
    copyright_info TEXT,
    license_type TEXT DEFAULT 'all_rights_reserved',
    is_published BOOLEAN DEFAULT FALSE,
    is_adult_content BOOLEAN DEFAULT FALSE,
    view_count INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    extracted_characters JSONB DEFAULT '[]',
    extracted_emotions JSONB DEFAULT '[]',
    upload_type TEXT NOT NULL,
    original_audio_url TEXT,
    processing_status TEXT DEFAULT 'pending',
    genre TEXT,
    sub_genre TEXT,
    emotional_tags TEXT[],
    mood_category TEXT,
    age_rating TEXT DEFAULT 'general',
    reading_time INTEGER,
    published_at TIMESTAMP,
    status TEXT DEFAULT 'draft',
    narrator_voice TEXT,
    narrator_voice_type TEXT,
    language VARCHAR DEFAULT 'en-US',
    is_public BOOLEAN DEFAULT FALSE
);

-- ESM Reference table - Emotions, Sounds, Modulations
CREATE TABLE esm_ref (
    esm_ref_id INTEGER PRIMARY KEY DEFAULT nextval('esm_ref_esm_ref_id_seq'),
    category INTEGER NOT NULL,
    name VARCHAR NOT NULL,
    display_name VARCHAR NOT NULL,
    sample_text TEXT NOT NULL,
    intensity INTEGER DEFAULT 5,
    description TEXT,
    ai_variations JSONB,
    min_samples_for_basic INTEGER DEFAULT 1,
    min_samples_for_good INTEGER DEFAULT 2,
    min_samples_for_excellent INTEGER DEFAULT 4,
    created_by VARCHAR NOT NULL,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(category, name)
);

-- User ESM Recordings table - User voice recordings
CREATE TABLE user_esm_recordings (
    user_esm_recordings_id INTEGER PRIMARY KEY DEFAULT nextval('user_esm_recordings_user_esm_recordings_id_seq'),
    user_esm_id INTEGER NOT NULL,
    audio_url VARCHAR NOT NULL,
    duration NUMERIC NOT NULL CHECK (duration > 0),
    file_size INTEGER NOT NULL CHECK (file_size > 0),
    audio_quality_score NUMERIC,
    transcribed_text TEXT,
    created_by VARCHAR NOT NULL,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_locked BOOLEAN DEFAULT FALSE,
    locked_at TIMESTAMP,
    narrator_voice_id VARCHAR,
    story_id INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    voice_type VARCHAR
);

-- Story Narrations table - Generated narrations
CREATE TABLE story_narrations (
    id INTEGER PRIMARY KEY DEFAULT nextval('story_narrations_id_seq'),
    story_id INTEGER NOT NULL REFERENCES stories(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    narrator_voice VARCHAR NOT NULL,
    narrator_voice_type VARCHAR NOT NULL,
    segments JSONB NOT NULL,
    total_duration INTEGER NOT NULL,
    audio_file_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    conversation_style VARCHAR,
    relationship_id INTEGER,
    shared_with_identifier TEXT,
    narrator_profile VARCHAR DEFAULT 'neutral'
);

-- Story Invitations table - Collaborative features
CREATE TABLE story_invitations (
    id INTEGER PRIMARY KEY DEFAULT nextval('story_invitations_id_seq'),
    story_id INTEGER NOT NULL REFERENCES stories(id),
    inviter_id VARCHAR NOT NULL REFERENCES users(id),
    invitee_email VARCHAR,
    invitee_phone VARCHAR,
    invitation_token VARCHAR NOT NULL UNIQUE,
    status VARCHAR NOT NULL DEFAULT 'pending',
    message TEXT,
    character_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP,
    completed_at TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_sessions_expire ON sessions(expire);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_stories_author ON stories(author_id);
CREATE INDEX idx_stories_status ON stories(status);
CREATE INDEX idx_stories_created ON stories(created_at DESC);
CREATE INDEX idx_stories_published ON stories(is_published);
CREATE INDEX idx_esm_ref_category ON esm_ref(category);
CREATE INDEX idx_esm_ref_active ON esm_ref(is_active);
CREATE INDEX idx_esm_ref_created_date ON esm_ref(created_date DESC);
CREATE INDEX idx_user_esm_recordings_user_esm ON user_esm_recordings(user_esm_id);
CREATE INDEX idx_user_esm_recordings_created ON user_esm_recordings(created_date DESC);
CREATE INDEX idx_user_esm_recordings_active ON user_esm_recordings(is_active);
CREATE INDEX idx_user_esm_recordings_voice_type ON user_esm_recordings(voice_type) WHERE is_active = TRUE;
CREATE INDEX idx_story_narrations_story ON story_narrations(story_id);
CREATE INDEX idx_story_narrations_user ON story_narrations(user_id);
CREATE INDEX idx_story_invitations_story ON story_invitations(story_id);
CREATE INDEX idx_story_invitations_token ON story_invitations(invitation_token);
CREATE INDEX idx_story_invitations_status ON story_invitations(status);

-- Grant permissions (adjust as needed)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

-- Comments for documentation
COMMENT ON TABLE users IS 'Core user management with authentication and profile data';
COMMENT ON TABLE sessions IS 'Session storage for authentication management';
COMMENT ON TABLE stories IS 'Main content storage with metadata and processing status';
COMMENT ON TABLE esm_ref IS 'Reference data for emotions, sounds, and voice modulations';
COMMENT ON TABLE user_esm_recordings IS 'User voice recordings for personalization';
COMMENT ON TABLE story_narrations IS 'Generated audio narrations for stories';
COMMENT ON TABLE story_invitations IS 'Collaborative storytelling invitation system';

COMMENT ON COLUMN users.id IS 'Primary key - supports both OAuth and local auth';
COMMENT ON COLUMN users.external_id IS 'External provider ID for OAuth users';
COMMENT ON COLUMN stories.extracted_characters IS 'AI-extracted character data as JSON';
COMMENT ON COLUMN stories.extracted_emotions IS 'AI-extracted emotion data as JSON';
COMMENT ON COLUMN stories.upload_type IS 'Type of story upload: text, audio, etc.';
COMMENT ON COLUMN esm_ref.category IS 'Category ID: 1=emotions, 2=sounds, 3=modulations';
COMMENT ON COLUMN esm_ref.ai_variations IS 'AI-generated variations for reference';
COMMENT ON COLUMN story_narrations.segments IS 'Narration segments with timing and audio data';
COMMENT ON COLUMN story_invitations.invitation_token IS 'Unique token for secure invitation links';