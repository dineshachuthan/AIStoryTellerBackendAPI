# Database Scripts

This directory contains all database scripts for the storytelling platform.

## Directory Structure

```
DB_SCRIPTS/
├── DDL/                    # Data Definition Language (table creation)
│   ├── 00-database-setup.sql
│   ├── create-admin-and-notification-tables.sql
│   ├── proposed_esm_schema.sql
│   ├── add-soft-delete-columns.sql
│   ├── add-stripe-columns.sql
│   └── alter-story-content-nullable.sql
├── DML/                    # Data Manipulation Language (updates)
├── REFERENCE_DATA/         # Initial reference data
│   ├── 01-app-states.sql
│   ├── 02-esm-reference.sql
│   └── 03-notification-campaigns.sql
├── run-all-ddl.sql        # Execute all DDL scripts
└── run-all-reference-data.sql  # Execute all reference data scripts
```

## Setup Instructions

### 1. Create Database
```bash
createdb storytelling_app
```

### 2. Run DDL Scripts
```bash
cd DB_SCRIPTS
psql -U your_username -d storytelling_app -f run-all-ddl.sql
```

### 3. Load Reference Data
```bash
psql -U your_username -d storytelling_app -f run-all-reference-data.sql
```

## Script Execution Order

### DDL Scripts (Must run in order)
1. `00-database-setup.sql` - Core tables (users, stories, etc.)
2. `create-admin-and-notification-tables.sql` - Admin and notification system
3. `proposed_esm_schema.sql` - ESM (Emotion/Sound/Modulation) tables
4. `add-soft-delete-columns.sql` - Soft delete functionality
5. `add-stripe-columns.sql` - Payment integration columns
6. `alter-story-content-nullable.sql` - Allow draft stories

### Reference Data Scripts
1. `01-app-states.sql` - Application state machine configuration
2. `02-esm-reference.sql` - Emotions, sounds, and modulations
3. `03-notification-campaigns.sql` - Notification templates

## Important Notes

### Schema Compatibility
These DDL scripts are generated from the actual production database to ensure 100% compatibility with Drizzle ORM schemas. Key differences from standard conventions:

- `user_esm` table uses `user_esm_id` instead of `id`
- `user_esm_recordings` table uses `user_esm_recording_id` instead of `id`
- Timestamp columns use `created_date`/`updated_date` instead of `created_at`/`updated_at`

### Soft Deletes
Most tables support soft deletes with:
- `deleted_at` timestamp
- `deleted_by` user reference

### Reference Data
Reference data includes:
- 30+ application states for workflow management
- 30 ESM entries (10 emotions, 10 sounds, 10 voice modulations)
- 17 notification campaigns with templates

## Maintenance

### Adding New Tables
1. Create new DDL script in `DDL/` directory
2. Update `run-all-ddl.sql` to include new script
3. Run migration in development first
4. Update Drizzle schema files accordingly

### Updating Reference Data
1. Create or update scripts in `REFERENCE_DATA/`
2. Use `ON CONFLICT DO UPDATE` for idempotent inserts
3. Test in development environment first

## Troubleshooting

### Common Issues

1. **Permission Denied**
   ```bash
   GRANT ALL PRIVILEGES ON DATABASE storytelling_app TO your_user;
   ```

2. **Schema Already Exists**
   Drop and recreate:
   ```bash
   DROP DATABASE storytelling_app;
   CREATE DATABASE storytelling_app;
   ```

3. **Foreign Key Violations**
   Ensure scripts run in correct order using `run-all-*.sql` files