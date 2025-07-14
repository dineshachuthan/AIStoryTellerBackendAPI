# Database Scripts

This directory contains all database scripts for the storytelling platform.

## Directory Structure

```
DB_SCRIPTS/
├── DDL/                    # Data Definition Language (table creation)
│   ├── 00-core-tables.sql                 # Core database tables
│   └── 01-additional-tables.sql           # Supporting tables and constraints
├── DML/                    # Data Manipulation Language (updates)
├── REFERENCE_DATA/         # Initial reference data
│   └── 01-esm-reference-data.sql          # ESM data (emotions, sounds, modulations)
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
1. `00-core-tables.sql` - Core database tables (users, stories, sessions, esm_ref, etc.)
2. `01-additional-tables.sql` - Supporting tables (user_esm, story_characters, roles) and constraints

### Reference Data Scripts
1. `01-esm-reference-data.sql` - ESM data (30 emotions, sounds, and voice modulations)

## Important Notes

### Schema Compatibility
These DDL scripts are generated from the actual database schema on January 13, 2025 to ensure 100% compatibility with Drizzle ORM schemas. Key features:

- All primary keys and sequences properly configured
- Foreign key constraints for data integrity
- Proper indexes for performance optimization
- Mixed timestamp column naming (`created_at`/`updated_at` and `created_date`)
- JSONB columns for flexible data storage (character/emotion extraction)
- Array columns for tags and permissions

### Reference Data
Reference data includes:
- 30 ESM entries (10 emotions, 10 sounds, 10 voice modulations)
- Each entry includes sample text, intensity levels, and AI variations
- All data taken from actual production database content

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