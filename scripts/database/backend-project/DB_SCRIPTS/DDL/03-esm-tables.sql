-- ================================================
-- ESM (Emotion/Sound/Modulation) Tables DDL
-- Voice Recording and Training System
-- ================================================

-- Table: user_esm
CREATE TABLE IF NOT EXISTS user_esm (
    user_esm_id INTEGER NOT NULL DEFAULT nextval('user_esm_user_esm_id_seq'::regclass) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id),
    esm_ref_id INTEGER NOT NULL REFERENCES esm_ref(esm_ref_id),
    sample_count INTEGER DEFAULT 0,
    total_duration INTEGER DEFAULT 0,
    is_locked BOOLEAN DEFAULT false,
    locked_at TIMESTAMP,
    quality_tier VARCHAR(20) DEFAULT 'none'::character varying,
    last_quality_assessment TIMESTAMP,
    auto_retrain_needed BOOLEAN DEFAULT false,
    narrator_voice_id VARCHAR(255),
    kling_voice_id VARCHAR(255),
    quality_score NUMERIC(3,2),
    ai_enhanced_samples_generated INTEGER DEFAULT 0,
    last_ai_enhancement_date TIMESTAMP,
    enhancement_method VARCHAR(50),
    created_by VARCHAR(255) NOT NULL,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

CREATE UNIQUE INDEX user_esm_user_id_esm_ref_id_key ON public.user_esm USING btree (user_id, esm_ref_id);
CREATE INDEX idx_user_esm_user_id ON public.user_esm USING btree (user_id);
CREATE INDEX idx_user_esm_quality_tier ON public.user_esm USING btree (quality_tier);
CREATE INDEX idx_user_esm_sample_count ON public.user_esm USING btree (sample_count DESC);
CREATE INDEX idx_user_esm_locked ON public.user_esm USING btree (is_locked);
CREATE INDEX idx_user_esm_retrain_needed ON public.user_esm USING btree (auto_retrain_needed);
CREATE INDEX idx_user_esm_active ON public.user_esm USING btree (is_active);

-- Table: user_esm_recordings
CREATE TABLE IF NOT EXISTS user_esm_recordings (
    user_esm_recordings_id INTEGER NOT NULL DEFAULT nextval('user_esm_recordings_user_esm_recordings_id_seq'::regclass) PRIMARY KEY,
    user_esm_id INTEGER NOT NULL REFERENCES user_esm(user_esm_id),
    audio_url VARCHAR(500) NOT NULL,
    duration NUMERIC(10,6) NOT NULL,
    file_size INTEGER NOT NULL,
    audio_quality_score NUMERIC(3,2),
    transcribed_text TEXT,
    created_by VARCHAR(255) NOT NULL,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_locked BOOLEAN DEFAULT false,
    locked_at TIMESTAMP,
    narrator_voice_id VARCHAR(255),
    story_id INTEGER,
    is_active BOOLEAN DEFAULT true,
    voice_type VARCHAR(50)
);

CREATE INDEX idx_user_esm_recordings_user_esm ON public.user_esm_recordings USING btree (user_esm_id);
CREATE INDEX idx_user_esm_recordings_created ON public.user_esm_recordings USING btree (created_date DESC);
CREATE INDEX idx_user_esm_recordings_active ON public.user_esm_recordings USING btree (is_active);
CREATE INDEX idx_user_esm_recordings_voice_type ON public.user_esm_recordings USING btree (voice_type) WHERE (is_active = true);

-- Table: esm_ref
CREATE TABLE IF NOT EXISTS esm_ref (
    esm_ref_id INTEGER NOT NULL DEFAULT nextval('esm_ref_esm_ref_id_seq'::regclass) PRIMARY KEY,
    category INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    display_name VARCHAR(150) NOT NULL,
    sample_text TEXT NOT NULL,
    intensity INTEGER DEFAULT 5,
    description TEXT,
    ai_variations JSONB,
    min_samples_for_basic INTEGER DEFAULT 1,
    min_samples_for_good INTEGER DEFAULT 2,
    min_samples_for_excellent INTEGER DEFAULT 4,
    created_by VARCHAR(255) NOT NULL,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

CREATE UNIQUE INDEX esm_ref_category_name_key ON public.esm_ref USING btree (category, name);
CREATE INDEX idx_esm_ref_category ON public.esm_ref USING btree (category);
CREATE INDEX idx_esm_ref_created_date ON public.esm_ref USING btree (created_date DESC);
CREATE INDEX idx_esm_ref_active ON public.esm_ref USING btree (is_active);

