-- ================================================
-- Run all DDL scripts in order
-- Updated January 13, 2025 to match actual database schema
-- ================================================

-- Run this script to create all database tables
-- Usage: psql -U username -d storytelling_app -f run-all-ddl.sql

\echo 'Creating core database tables...'
\i DDL/00-core-tables.sql

\echo 'Creating additional support tables...'
\i DDL/01-additional-tables.sql

\echo 'Database schema creation complete!'
\echo 'Next step: Run run-all-reference-data.sql to populate reference data'