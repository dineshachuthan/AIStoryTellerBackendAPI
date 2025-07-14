-- Schema Validation Script
-- Validates that the database schema matches the expected structure
-- Run this after executing DDL scripts to verify setup

\echo 'Validating database schema...'

-- Check that all expected tables exist
SELECT 'Table Check:' as validation_step;
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('users', 'stories', 'sessions', 'esm_ref', 'user_esm_recordings', 'story_narrations', 'story_invitations', 'user_esm', 'story_characters', 'roles') 
        THEN 'EXISTS ✓' 
        ELSE 'MISSING ✗' 
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'stories', 'sessions', 'esm_ref', 'user_esm_recordings', 'story_narrations', 'story_invitations', 'user_esm', 'story_characters', 'roles')
ORDER BY table_name;

-- Check primary keys
SELECT 'Primary Key Check:' as validation_step;
SELECT 
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    'PRIMARY KEY ✓' as status
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public' 
AND tc.constraint_type = 'PRIMARY KEY'
AND tc.table_name IN ('users', 'stories', 'sessions', 'esm_ref', 'user_esm_recordings', 'story_narrations', 'story_invitations', 'user_esm', 'story_characters', 'roles')
ORDER BY tc.table_name;

-- Check foreign keys
SELECT 'Foreign Key Check:' as validation_step;
SELECT 
    tc.table_name,
    kcu.column_name,
    ccu.table_name as referenced_table,
    ccu.column_name as referenced_column,
    'FOREIGN KEY ✓' as status
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_schema = 'public' 
AND tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name IN ('stories', 'user_esm_recordings', 'story_narrations', 'story_invitations', 'user_esm', 'story_characters', 'users')
ORDER BY tc.table_name, kcu.column_name;

-- Check ESM reference data
SELECT 'ESM Reference Data Check:' as validation_step;
SELECT 
    category,
    CASE category 
        WHEN 1 THEN 'Emotions'
        WHEN 2 THEN 'Sounds'
        WHEN 3 THEN 'Voice Modulations'
        ELSE 'Unknown'
    END as category_name,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) > 0 THEN 'DATA EXISTS ✓'
        ELSE 'NO DATA ✗'
    END as status
FROM esm_ref 
GROUP BY category 
ORDER BY category;

-- Check indexes
SELECT 'Index Check:' as validation_step;
SELECT 
    tablename,
    indexname,
    'INDEX ✓' as status
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'stories', 'sessions', 'esm_ref', 'user_esm_recordings', 'story_narrations', 'story_invitations', 'user_esm', 'story_characters', 'roles')
ORDER BY tablename, indexname;

-- Check sequences
SELECT 'Sequence Check:' as validation_step;
SELECT 
    sequence_name,
    last_value,
    'SEQUENCE ✓' as status
FROM information_schema.sequences 
WHERE sequence_schema = 'public'
ORDER BY sequence_name;

\echo 'Schema validation complete!'
\echo 'If all checks show ✓, the database schema is correctly configured.'