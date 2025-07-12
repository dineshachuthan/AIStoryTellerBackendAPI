-- ================================================
-- Run all DDL scripts in order
-- ================================================

-- Run this script to create all database tables
-- Usage: psql -U username -d storytelling_app -f run-all-ddl.sql

\echo 'Creating database schema...'
\i DDL/00-database-setup.sql

\echo 'Creating admin and notification tables...'
\i DDL/create-admin-and-notification-tables.sql

\echo 'Creating ESM schema...'
\i DDL/proposed_esm_schema.sql

\echo 'Adding soft delete columns...'
\i DDL/add-soft-delete-columns.sql

\echo 'Adding Stripe columns...'
\i DDL/add-stripe-columns.sql

\echo 'Altering story content to nullable...'
\i DDL/alter-story-content-nullable.sql

\echo 'Database schema creation complete!'