-- Additional Tables for Full System Functionality
-- Based on actual database schema analysis January 13, 2025

-- Missing tables that exist in the actual database but not in core schema

-- Create user_esm table (referenced by user_esm_recordings)
CREATE TABLE IF NOT EXISTS user_esm (
    user_esm_id INTEGER PRIMARY KEY,
    user_id VARCHAR NOT NULL REFERENCES users(id),
    esm_ref_id INTEGER NOT NULL REFERENCES esm_ref(esm_ref_id),
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Create story_characters table (referenced by story_invitations)
CREATE TABLE IF NOT EXISTS story_characters (
    id INTEGER PRIMARY KEY,
    story_id INTEGER NOT NULL REFERENCES stories(id),
    character_name VARCHAR NOT NULL,
    character_description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create roles table (referenced by users)
CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY,
    name VARCHAR NOT NULL,
    description TEXT,
    permissions TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraints that were missing
ALTER TABLE user_esm_recordings 
ADD CONSTRAINT IF NOT EXISTS user_esm_recordings_user_esm_id_fkey 
FOREIGN KEY (user_esm_id) REFERENCES user_esm(user_esm_id);

ALTER TABLE story_invitations 
ADD CONSTRAINT IF NOT EXISTS story_invitations_character_id_fkey 
FOREIGN KEY (character_id) REFERENCES story_characters(id);

ALTER TABLE users 
ADD CONSTRAINT IF NOT EXISTS users_role_id_fkey 
FOREIGN KEY (role_id) REFERENCES roles(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_esm_user_id ON user_esm(user_id);
CREATE INDEX IF NOT EXISTS idx_user_esm_esm_ref_id ON user_esm(esm_ref_id);
CREATE INDEX IF NOT EXISTS idx_story_characters_story_id ON story_characters(story_id);
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);

-- Insert default roles
INSERT INTO roles (id, name, description, permissions) VALUES
(1, 'user', 'Standard user role', ARRAY['read_stories', 'create_stories', 'update_own_stories']),
(2, 'admin', 'Administrator role', ARRAY['read_all', 'create_all', 'update_all', 'delete_all', 'manage_users']),
(3, 'moderator', 'Content moderator role', ARRAY['read_all', 'moderate_content', 'manage_reports'])
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    permissions = EXCLUDED.permissions;

-- Comments for documentation
COMMENT ON TABLE user_esm IS 'Links users to their ESM (emotion/sound/modulation) preferences';
COMMENT ON TABLE story_characters IS 'Character definitions for stories supporting collaborative features';
COMMENT ON TABLE roles IS 'Role-based access control system';

COMMENT ON COLUMN user_esm.user_esm_id IS 'Primary key for user ESM relationships';
COMMENT ON COLUMN story_characters.character_name IS 'Name of the character in the story';
COMMENT ON COLUMN roles.permissions IS 'Array of permission strings for the role';