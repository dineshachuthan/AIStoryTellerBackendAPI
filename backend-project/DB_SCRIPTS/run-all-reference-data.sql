-- ================================================
-- Run all reference data scripts in order
-- Updated January 13, 2025 to match actual database schema
-- ================================================

-- Run this script to insert all reference data
-- Usage: psql -U username -d storytelling_app -f run-all-reference-data.sql

\echo 'Inserting ESM reference data (emotions, sounds, modulations)...'
\i REFERENCE_DATA/01-esm-reference-data.sql

\echo 'Reference data insertion complete!'
\echo 'Database setup is now complete and ready for use.'