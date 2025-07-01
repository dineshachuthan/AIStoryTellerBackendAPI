-- ESM Reference Data Architecture Schema - MVP1 Implementation
-- Single Sample + AI Enhancement + Progressive Quality Approach
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
    
    -- AI Enhancement support
    ai_variations JSONB NULL, -- store AI-generated text variations for single samples
    min_samples_for_basic INTEGER DEFAULT 1, -- minimum samples needed for basic quality
    min_samples_for_good INTEGER DEFAULT 2, -- minimum samples needed for good quality
    min_samples_for_excellent INTEGER DEFAULT 4, -- minimum samples needed for excellent quality
    
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
    sample_count INTEGER DEFAULT 0, -- track samples for quality tiers
    total_duration INTEGER DEFAULT 0, -- total seconds recorded
    is_locked BOOLEAN DEFAULT FALSE, -- locked during/after voice cloning
    locked_at TIMESTAMP NULL,
    
    -- Progressive Quality Support
    quality_tier VARCHAR(20) DEFAULT 'none', -- none, basic, good, excellent
    last_quality_assessment TIMESTAMP NULL,
    auto_retrain_needed BOOLEAN DEFAULT FALSE, -- flag for when user adds more samples
    
    -- Voice cloning status and results (supports ElevenLabs, Kling, future providers)
    voice_cloning_status VARCHAR(50) DEFAULT 'not_started', -- not_started, training, completed, failed
    voice_cloning_provider VARCHAR(50) NULL, -- elevenlabs, kling, future providers
    voice_cloning_triggered_at TIMESTAMP NULL,
    voice_cloning_completed_at TIMESTAMP NULL,
    elevenlabs_voice_id VARCHAR(255) NULL,
    kling_voice_id VARCHAR(255) NULL, -- for future Kling support
    quality_score NUMERIC(3,2) NULL, -- 0.00 to 1.00 quality score from provider
    
    -- AI Enhancement tracking
    ai_enhanced_samples_generated INTEGER DEFAULT 0, -- how many AI variations were created
    last_ai_enhancement_date TIMESTAMP NULL,
    enhancement_method VARCHAR(50) NULL, -- track which AI enhancement method was used
    
    -- Standard metadata
    created_by VARCHAR(255) NOT NULL, -- user_id or 'system'
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(user_id, esm_ref_id), -- one record per user per ESM
    FOREIGN KEY (esm_ref_id) REFERENCES esm_ref(esm_ref_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Check constraints
    CHECK (sample_count >= 0),
    CHECK (total_duration >= 0),
    CHECK (quality_score IS NULL OR (quality_score >= 0 AND quality_score <= 1)),
    CHECK (ai_enhanced_samples_generated >= 0)
);

-- Indexes for performance
CREATE INDEX idx_user_esm_user_id ON user_esm(user_id);
CREATE INDEX idx_user_esm_status ON user_esm(voice_cloning_status);
CREATE INDEX idx_user_esm_quality_tier ON user_esm(quality_tier);
CREATE INDEX idx_user_esm_sample_count ON user_esm(sample_count DESC);
CREATE INDEX idx_user_esm_locked ON user_esm(is_locked);
CREATE INDEX idx_user_esm_retrain_needed ON user_esm(auto_retrain_needed);

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

-- Migration triggers to update sample_count, total_duration, and quality_tier
CREATE OR REPLACE FUNCTION update_user_esm_stats()
RETURNS TRIGGER AS $$
DECLARE
    new_sample_count INTEGER;
    quality_thresholds RECORD;
    new_quality_tier VARCHAR(20);
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Update sample count and duration
        UPDATE user_esm 
        SET sample_count = sample_count + 1,
            total_duration = total_duration + NEW.duration,
            auto_retrain_needed = CASE 
                WHEN voice_cloning_status = 'completed' THEN TRUE 
                ELSE auto_retrain_needed 
            END
        WHERE user_esm_id = NEW.user_esm_id;
        
        -- Get updated sample count
        SELECT sample_count INTO new_sample_count 
        FROM user_esm 
        WHERE user_esm_id = NEW.user_esm_id;
        
        -- Get quality thresholds from esm_ref
        SELECT min_samples_for_basic, min_samples_for_good, min_samples_for_excellent 
        INTO quality_thresholds
        FROM esm_ref e
        JOIN user_esm u ON e.esm_ref_id = u.esm_ref_id
        WHERE u.user_esm_id = NEW.user_esm_id;
        
        -- Determine new quality tier
        IF new_sample_count >= quality_thresholds.min_samples_for_excellent THEN
            new_quality_tier := 'excellent';
        ELSIF new_sample_count >= quality_thresholds.min_samples_for_good THEN
            new_quality_tier := 'good';
        ELSIF new_sample_count >= quality_thresholds.min_samples_for_basic THEN
            new_quality_tier := 'basic';
        ELSE
            new_quality_tier := 'none';
        END IF;
        
        -- Update quality tier
        UPDATE user_esm 
        SET quality_tier = new_quality_tier,
            last_quality_assessment = CURRENT_TIMESTAMP
        WHERE user_esm_id = NEW.user_esm_id;
        
    ELSIF TG_OP = 'DELETE' THEN
        -- Update sample count and duration on deletion
        UPDATE user_esm 
        SET sample_count = GREATEST(sample_count - 1, 0),
            total_duration = GREATEST(total_duration - OLD.duration, 0)
        WHERE user_esm_id = OLD.user_esm_id;
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
    u.sample_count,
    u.total_duration,
    u.quality_tier,
    u.voice_cloning_status,
    u.voice_cloning_provider,
    u.is_locked,
    u.elevenlabs_voice_id,
    u.kling_voice_id,
    u.quality_score,
    u.auto_retrain_needed,
    u.ai_enhanced_samples_generated
FROM user_esm u
JOIN esm_ref e ON u.esm_ref_id = e.esm_ref_id;

CREATE VIEW v_esm_ref_stats AS
SELECT 
    e.*,
    COUNT(u.user_esm_id) as total_users,
    SUM(u.sample_count) as total_samples,
    AVG(u.quality_score) as avg_quality,
    COUNT(CASE WHEN u.quality_tier = 'excellent' THEN 1 END) as excellent_users,
    COUNT(CASE WHEN u.quality_tier = 'good' THEN 1 END) as good_users,
    COUNT(CASE WHEN u.quality_tier = 'basic' THEN 1 END) as basic_users
FROM esm_ref e
LEFT JOIN user_esm u ON e.esm_ref_id = u.esm_ref_id
GROUP BY e.esm_ref_id;

-- Quality summary view for users
CREATE VIEW v_user_quality_summary AS
SELECT 
    user_id,
    COUNT(*) as total_emotions,
    COUNT(CASE WHEN quality_tier = 'excellent' THEN 1 END) as excellent_count,
    COUNT(CASE WHEN quality_tier = 'good' THEN 1 END) as good_count,
    COUNT(CASE WHEN quality_tier = 'basic' THEN 1 END) as basic_count,
    COUNT(CASE WHEN voice_cloning_status = 'completed' THEN 1 END) as completed_voice_clones,
    SUM(ai_enhanced_samples_generated) as total_ai_enhancements
FROM user_esm
GROUP BY user_id;