-- ================================================
-- Run all reference data scripts in order
-- ================================================

-- Run this script to insert all reference data
-- Usage: psql -U username -d storytelling_app -f run-all-reference-data.sql

\echo 'Inserting application states...'
\i REFERENCE_DATA/01-app-states.sql

\echo 'Inserting ESM reference data...'
\i REFERENCE_DATA/02-esm-reference.sql

\echo 'Inserting notification campaigns...'
\i REFERENCE_DATA/03-notification-campaigns.sql

\echo 'Reference data insertion complete!'