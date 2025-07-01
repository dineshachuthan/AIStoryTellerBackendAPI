-- ESM Reference Data Architecture Schema
-- Replaces current voice_modulation_templates and improves user_emotion_voices

-- 1. ESM_Ref Table - Master reference data for emotions, sounds, modulations
CREATE TABLE esm_ref (
    esm_ref_id SERIAL PRIMARY KEY,
    category INTEGER NOT NULL, -- 1=emotions, 2=sounds, 3=modulations
    name VARCHAR(100) NOT NULL, -- emotion/sound/modulation name
    display_name VARCHAR(150) NOT NULL, -- user-friendly display name
    sample_text TEXT NOT NULL, -- text for voice recording sample
    intensity INTEGER DEFAULT 5, -- 1-10 scale for emotions
    description TEXT, -- additional context or description
    created_by VARCHAR(255) NOT NULL, -- user_id or 'system' for auto-discovered
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure uniqueness per category
    UNIQUE(category, name)
);

-- Indexes for performance
CREATE INDEX idx_esm_ref_category ON esm_ref(category);
CREATE INDEX idx_esm_ref_created_date ON esm_ref(created_date DESC);

-- 2. User_ESM Table - User-specific ESM recordings and voice cloning status
CREATE TABLE user_esm (
    user_esm_id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    esm_ref_id INTEGER NOT NULL,
    total_duration INTEGER DEFAULT 0, -- total seconds recorded
    is_locked BOOLEAN DEFAULT FALSE, -- locked during/after voice cloning
    locked_at TIMESTAMP NULL,
    
    -- Voice cloning status and results (supports ElevenLabs, Kling, future providers)
    voice_cloning_status VARCHAR(50) DEFAULT 'not_started', -- not_started, training, completed, failed
    voice_cloning_provider VARCHAR(50) NULL, -- elevenlabs, kling, future providers
    voice_cloning_triggered_at TIMESTAMP NULL,
    voice_cloning_completed_at TIMESTAMP NULL,
    elevenlabs_voice_id VARCHAR(255) NULL,
    kling_voice_id VARCHAR(255) NULL, -- for future Kling support
    quality_score NUMERIC(3,2) NULL, -- 0.00 to 1.00 quality score from provider
    
    -- Standard metadata
    created_by VARCHAR(255) NOT NULL, -- user_id or 'system'
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(user_id, esm_ref_id), -- one record per user per ESM
    FOREIGN KEY (esm_ref_id) REFERENCES esm_ref(esm_ref_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Check constraints
    CHECK (total_duration >= 0),
    CHECK (quality_score IS NULL OR (quality_score >= 0 AND quality_score <= 1))
);

-- Indexes for performance
CREATE INDEX idx_user_esm_user_id ON user_esm(user_id);
CREATE INDEX idx_user_esm_status ON user_esm(voice_cloning_status);
CREATE INDEX idx_user_esm_count ON user_esm(recording_count DESC);
CREATE INDEX idx_user_esm_locked ON user_esm(is_locked);

-- 3. User_ESM_Recordings Table - Individual recording files
CREATE TABLE user_esm_recordings (
    id SERIAL PRIMARY KEY,
    user_esm_id INTEGER NOT NULL,
    audio_url VARCHAR(500) NOT NULL, -- path to audio file
    duration INTEGER NOT NULL, -- duration in seconds
    file_size INTEGER NOT NULL, -- file size in bytes
    recording_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Quality metrics
    audio_quality_score NUMERIC(3,2) NULL, -- 0.00 to 1.00
    transcribed_text TEXT NULL, -- what the audio actually says
    
    FOREIGN KEY (user_esm_id) REFERENCES user_esm(id) ON DELETE CASCADE,
    CHECK (duration > 0),
    CHECK (file_size > 0)
);

CREATE INDEX idx_user_esm_recordings_user_esm ON user_esm_recordings(user_esm_id);
CREATE INDEX idx_user_esm_recordings_timestamp ON user_esm_recordings(recording_timestamp DESC);

-- Migration triggers to update recording_count and total_duration
CREATE OR REPLACE FUNCTION update_user_esm_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE user_esm 
        SET recording_count = recording_count + 1,
            total_duration = total_duration + NEW.duration,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.user_esm_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE user_esm 
        SET recording_count = recording_count - 1,
            total_duration = total_duration - OLD.duration,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = OLD.user_esm_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_esm_stats
    AFTER INSERT OR DELETE ON user_esm_recordings
    FOR EACH ROW EXECUTE FUNCTION update_user_esm_stats();

-- Sample data for category reference
-- Category 1: Emotions
-- Category 2: Sounds  
-- Category 3: Modulations

-- Views for easier querying
CREATE VIEW v_user_esm_summary AS
SELECT 
    u.user_id,
    u.esm_ref_id,
    e.category,
    e.name as esm_name,
    e.display_name,
    u.recording_count,
    u.total_duration,
    u.voice_cloning_status,
    u.is_locked,
    u.elevenlabs_voice_id,
    u.quality_score
FROM user_esm u
JOIN esm_ref e ON u.esm_ref_id = e.id;

CREATE VIEW v_esm_ref_stats AS
SELECT 
    e.*,
    COUNT(u.id) as total_users,
    SUM(u.recording_count) as total_recordings,
    AVG(u.quality_score) as avg_quality
FROM esm_ref e
LEFT JOIN user_esm u ON e.id = u.esm_ref_id
GROUP BY e.id;