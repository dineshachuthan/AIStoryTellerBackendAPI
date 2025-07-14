-- ESM Reference Data
-- Emotions, Sounds, and Voice Modulations
-- Generated from actual database on January 13, 2025

-- Clear existing data
DELETE FROM esm_ref;

-- Reset sequence
ALTER SEQUENCE esm_ref_esm_ref_id_seq RESTART WITH 1;

-- Insert ESM reference data
-- Category 1: Emotions
-- Category 2: Sounds  
-- Category 3: Voice Modulations

INSERT INTO esm_ref (category, name, display_name, sample_text, intensity, description, ai_variations, min_samples_for_basic, min_samples_for_good, min_samples_for_excellent, created_by, is_active) VALUES
-- Emotions (Category 1)
(1, 'joy', 'Joy', 'I feel so happy and excited about this wonderful day!', 7, 'A feeling of great pleasure and happiness', '["happiness", "delight", "elation", "bliss", "euphoria"]'::jsonb, 1, 2, 4, 'system', true),
(1, 'sadness', 'Sadness', 'I feel so down and melancholy about what happened.', 6, 'A feeling of sorrow and unhappiness', '["sorrow", "grief", "melancholy", "despair", "gloom"]'::jsonb, 1, 2, 4, 'system', true),
(1, 'anger', 'Anger', 'I am furious and outraged by this injustice!', 8, 'A strong feeling of displeasure and hostility', '["rage", "fury", "wrath", "indignation", "ire"]'::jsonb, 1, 2, 4, 'system', true),
(1, 'fear', 'Fear', 'I am terrified and anxious about what might happen.', 7, 'An unpleasant emotion caused by threat or danger', '["terror", "dread", "anxiety", "panic", "apprehension"]'::jsonb, 1, 2, 4, 'system', true),
(1, 'surprise', 'Surprise', 'Oh my! I did not expect this at all!', 6, 'A feeling of mild astonishment or shock', '["amazement", "astonishment", "shock", "wonder", "bewilderment"]'::jsonb, 1, 2, 4, 'system', true),
(1, 'disgust', 'Disgust', 'This is absolutely revolting and repugnant.', 7, 'A feeling of revulsion or strong disapproval', '["revulsion", "repugnance", "abhorrence", "loathing", "aversion"]'::jsonb, 1, 2, 4, 'system', true),
(1, 'contempt', 'Contempt', 'I have nothing but scorn for such behavior.', 6, 'A feeling of disdain and lack of respect', '["scorn", "disdain", "derision", "mockery", "sneering"]'::jsonb, 1, 2, 4, 'system', true),
(1, 'love', 'Love', 'I cherish and adore you with all my heart.', 8, 'A deep affection and care for someone or something', '["adoration", "devotion", "affection", "tenderness", "passion"]'::jsonb, 1, 2, 4, 'system', true),
(1, 'curiosity', 'Curiosity', 'I wonder what secrets this mystery holds.', 5, 'A strong desire to know or learn something', '["inquisitiveness", "interest", "wonder", "fascination", "inquiry"]'::jsonb, 1, 2, 4, 'system', true),
(1, 'excitement', 'Excitement', 'I can barely contain my enthusiasm for this!', 7, 'A feeling of great enthusiasm and eagerness', '["enthusiasm", "exhilaration", "thrill", "animation", "fervor"]'::jsonb, 1, 2, 4, 'system', true),

-- Sounds (Category 2)
(2, 'wind', 'Wind', 'The gentle breeze whispers through the trees.', 4, 'Sound of air movement through environment', '["breeze", "gust", "gale", "draft", "zephyr"]'::jsonb, 1, 2, 4, 'system', true),
(2, 'rain', 'Rain', 'Droplets patter softly against the window.', 5, 'Sound of water falling from the sky', '["drizzle", "downpour", "shower", "precipitation", "deluge"]'::jsonb, 1, 2, 4, 'system', true),
(2, 'ocean', 'Ocean Waves', 'The rhythmic crash of waves against the shore.', 6, 'Sound of sea waves and water movement', '["waves", "surf", "tide", "breakers", "swells"]'::jsonb, 1, 2, 4, 'system', true),
(2, 'fire', 'Fire Crackling', 'The warm crackle and pop of burning wood.', 5, 'Sound of combustion and burning materials', '["flames", "crackling", "burning", "sizzling", "roaring"]'::jsonb, 1, 2, 4, 'system', true),
(2, 'thunder', 'Thunder', 'A deep rumbling roar echoes across the sky.', 8, 'Sound of atmospheric electrical discharge', '["rumble", "boom", "crash", "clap", "roll"]'::jsonb, 1, 2, 4, 'system', true),
(2, 'footsteps', 'Footsteps', 'Measured steps echo down the empty hallway.', 4, 'Sound of walking or running movement', '["steps", "walking", "running", "pacing", "treading"]'::jsonb, 1, 2, 4, 'system', true),
(2, 'birds', 'Birds Singing', 'Sweet melodies fill the morning air.', 5, 'Sound of avian vocalizations', '["chirping", "singing", "tweeting", "warbling", "calling"]'::jsonb, 1, 2, 4, 'system', true),
(2, 'music', 'Music', 'Harmonious notes drift through the atmosphere.', 6, 'Sound of musical instruments or voices', '["melody", "harmony", "rhythm", "tune", "symphony"]'::jsonb, 1, 2, 4, 'system', true),
(2, 'machinery', 'Machinery', 'The steady hum and whir of mechanical operation.', 5, 'Sound of mechanical devices and equipment', '["humming", "whirring", "grinding", "clanking", "buzzing"]'::jsonb, 1, 2, 4, 'system', true),
(2, 'silence', 'Silence', 'A profound quiet settles over everything.', 2, 'Absence of sound or very quiet ambient noise', '["quiet", "stillness", "hush", "calm", "peace"]'::jsonb, 1, 2, 4, 'system', true),

-- Voice Modulations (Category 3)
(3, 'whisper', 'Whisper', 'Speaking in soft, hushed tones.', 3, 'Very quiet, soft speaking style', '["murmur", "breathe", "hush", "soft", "gentle"]'::jsonb, 1, 2, 4, 'system', true),
(3, 'shout', 'Shout', 'Speaking loudly with great volume and force!', 9, 'Very loud, forceful speaking style', '["yell", "bellow", "roar", "boom", "holler"]'::jsonb, 1, 2, 4, 'system', true),
(3, 'rapid', 'Rapid', 'Speaking quickly with fast-paced delivery.', 6, 'Fast speaking tempo and pace', '["fast", "quick", "hurried", "rushed", "swift"]'::jsonb, 1, 2, 4, 'system', true),
(3, 'slow', 'Slow', 'Speaking... very... deliberately... and... slowly.', 4, 'Slow speaking tempo and pace', '["deliberate", "measured", "careful", "unhurried", "leisurely"]'::jsonb, 1, 2, 4, 'system', true),
(3, 'monotone', 'Monotone', 'Speaking in a flat, unchanging vocal tone.', 3, 'Flat, emotionless speaking style', '["flat", "unchanging", "robotic", "mechanical", "deadpan"]'::jsonb, 1, 2, 4, 'system', true),
(3, 'melodic', 'Melodic', 'Speaking with musical, flowing vocal patterns.', 6, 'Musical, flowing speaking style', '["musical", "lyrical", "flowing", "harmonious", "rhythmic"]'::jsonb, 1, 2, 4, 'system', true),
(3, 'gruff', 'Gruff', 'Speaking with a rough, harsh vocal quality.', 7, 'Rough, harsh speaking style', '["harsh", "rough", "gravelly", "coarse", "raspy"]'::jsonb, 1, 2, 4, 'system', true),
(3, 'smooth', 'Smooth', 'Speaking with a silky, refined vocal quality.', 5, 'Silky, refined speaking style', '["silky", "refined", "polished", "suave", "elegant"]'::jsonb, 1, 2, 4, 'system', true),
(3, 'breathy', 'Breathy', 'Speaking with noticeable breath and airiness.', 4, 'Airy, breath-heavy speaking style', '["airy", "soft", "intimate", "hushed", "gentle"]'::jsonb, 1, 2, 4, 'system', true),
(3, 'authoritative', 'Authoritative', 'Speaking with commanding presence and confidence.', 8, 'Commanding, confident speaking style', '["commanding", "confident", "powerful", "dominant", "assertive"]'::jsonb, 1, 2, 4, 'system', true);

-- Verify data was inserted
SELECT 
    category,
    CASE category 
        WHEN 1 THEN 'Emotions'
        WHEN 2 THEN 'Sounds'
        WHEN 3 THEN 'Voice Modulations'
        ELSE 'Unknown'
    END as category_name,
    COUNT(*) as count
FROM esm_ref 
GROUP BY category 
ORDER BY category;

-- Show sample data
SELECT esm_ref_id, category, name, display_name, intensity, is_active
FROM esm_ref 
ORDER BY category, esm_ref_id;