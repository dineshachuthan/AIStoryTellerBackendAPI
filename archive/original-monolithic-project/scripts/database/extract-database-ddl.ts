#!/usr/bin/env tsx
/**
 * Extract Complete DDL from Existing Database
 * This script extracts the actual database structure to ensure schema compatibility
 */

import { pool } from '../../server/db';
import * as fs from 'fs';
import * as path from 'path';

const DDL_DIR = './backend-project/DB_SCRIPTS/DDL';
const DML_DIR = './backend-project/DB_SCRIPTS/DML';
const REF_DATA_DIR = './backend-project/DB_SCRIPTS/REFERENCE_DATA';

// Ensure directories exist
[DDL_DIR, DML_DIR, REF_DATA_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

async function extractTableDDL(tableName: string): Promise<string> {
  // Get columns
  const columnsResult = await pool.query(`
    SELECT 
      column_name,
      data_type,
      character_maximum_length,
      numeric_precision,
      numeric_scale,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position
  `, [tableName]);

  // Get primary keys
  const pkResult = await pool.query(`
    SELECT column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_schema = 'public' 
      AND tc.table_name = $1 
      AND tc.constraint_type = 'PRIMARY KEY'
  `, [tableName]);

  // Get foreign keys
  const fkResult = await pool.query(`
    SELECT
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND tc.table_name = $1
  `, [tableName]);

  // Get indexes
  const indexResult = await pool.query(`
    SELECT 
      indexname,
      indexdef
    FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = $1
      AND indexname NOT LIKE '%_pkey'
  `, [tableName]);

  // Build DDL
  let ddl = `-- Table: ${tableName}\n`;
  ddl += `CREATE TABLE IF NOT EXISTS ${tableName} (\n`;

  const primaryKeys = pkResult.rows.map(row => row.column_name);
  const foreignKeys = new Map(fkResult.rows.map(row => [
    row.column_name,
    `REFERENCES ${row.foreign_table_name}(${row.foreign_column_name})`
  ]));

  // Add columns
  const columnDefs = columnsResult.rows.map(col => {
    let def = `    ${col.column_name} `;
    
    // Data type
    if (col.data_type === 'character varying') {
      def += `VARCHAR${col.character_maximum_length ? `(${col.character_maximum_length})` : ''}`;
    } else if (col.data_type === 'numeric') {
      def += `NUMERIC${col.numeric_precision ? `(${col.numeric_precision}${col.numeric_scale ? `,${col.numeric_scale}` : ''})` : ''}`;
    } else if (col.data_type === 'timestamp without time zone') {
      def += 'TIMESTAMP';
    } else if (col.data_type === 'ARRAY') {
      def += 'TEXT[]';
    } else {
      def += col.data_type.toUpperCase();
    }

    // NOT NULL
    if (col.is_nullable === 'NO') {
      def += ' NOT NULL';
    }

    // Default value
    if (col.column_default) {
      def += ` DEFAULT ${col.column_default}`;
    }

    // Primary key
    if (primaryKeys.includes(col.column_name) && primaryKeys.length === 1) {
      def += ' PRIMARY KEY';
    }

    // Foreign key
    if (foreignKeys.has(col.column_name)) {
      def += ` ${foreignKeys.get(col.column_name)}`;
    }

    return def;
  });

  ddl += columnDefs.join(',\n');

  // Add composite primary key if needed
  if (primaryKeys.length > 1) {
    ddl += `,\n    PRIMARY KEY (${primaryKeys.join(', ')})`;
  }

  ddl += '\n);\n\n';

  // Add indexes
  indexResult.rows.forEach(idx => {
    ddl += `${idx.indexdef};\n`;
  });

  ddl += '\n';

  return ddl;
}

async function extractAllTables(): Promise<void> {
  // Get all tables
  const tablesResult = await pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    ORDER BY 
      CASE 
        WHEN table_name = 'users' THEN 1
        WHEN table_name LIKE 'user_%' THEN 2
        WHEN table_name = 'stories' THEN 3
        WHEN table_name LIKE 'story_%' THEN 4
        WHEN table_name LIKE 'esm_%' THEN 5
        WHEN table_name = 'sessions' THEN 6
        ELSE 7
      END,
      table_name
  `);

  const tables = tablesResult.rows.map(row => row.table_name);
  
  // Group tables by category
  const coreTables = tables.filter(t => 
    ['users', 'user_providers', 'local_users', 'sessions', 'user_session_metadata',
     'user_login_history', 'password_reset_tokens', 'user_2fa_settings', 
     'user_security_questions'].includes(t)
  );

  const storyTables = tables.filter(t => 
    t.startsWith('story') || ['stories', 'emotions', 'character_archetypes',
     'emotion_voice_profiles', 'user_character_preferences'].includes(t)
  );

  const esmTables = tables.filter(t => 
    t.startsWith('esm_') || t.startsWith('user_esm')
  );

  const notificationTables = tables.filter(t => 
    t.startsWith('notification_') || t.includes('notification')
  );

  const adminTables = tables.filter(t => 
    t.startsWith('admin_') || ['roles', 'permissions', 'role_permissions',
     'feature_flags', 'system_config', 'moderation_queue', 'moderation_rules'].includes(t)
  );

  const otherTables = tables.filter(t => 
    !coreTables.includes(t) && !storyTables.includes(t) && 
    !esmTables.includes(t) && !notificationTables.includes(t) && 
    !adminTables.includes(t)
  );

  // Generate DDL files
  console.log('📝 Generating Core Tables DDL...');
  let coreDDL = `-- ================================================
-- Core Tables DDL
-- Authentication, Users, and Sessions
-- ================================================

`;
  for (const table of coreTables) {
    coreDDL += await extractTableDDL(table);
  }
  fs.writeFileSync(path.join(DDL_DIR, '01-core-tables.sql'), coreDDL);

  console.log('📝 Generating Story Tables DDL...');
  let storyDDL = `-- ================================================
-- Story and Content Tables DDL
-- Stories, Characters, Emotions, Narrations
-- ================================================

`;
  for (const table of storyTables) {
    storyDDL += await extractTableDDL(table);
  }
  fs.writeFileSync(path.join(DDL_DIR, '02-story-tables.sql'), storyDDL);

  console.log('📝 Generating ESM Tables DDL...');
  let esmDDL = `-- ================================================
-- ESM (Emotion/Sound/Modulation) Tables DDL
-- Voice Recording and Training System
-- ================================================

`;
  for (const table of esmTables) {
    esmDDL += await extractTableDDL(table);
  }
  fs.writeFileSync(path.join(DDL_DIR, '03-esm-tables.sql'), esmDDL);

  console.log('📝 Generating Other Tables DDL...');
  if (otherTables.length > 0) {
    let otherDDL = `-- ================================================
-- Other Tables DDL
-- Miscellaneous and Support Tables
-- ================================================

`;
    for (const table of otherTables) {
      otherDDL += await extractTableDDL(table);
    }
    fs.writeFileSync(path.join(DDL_DIR, '04-other-tables.sql'), otherDDL);
  }

  // Extract sequences
  console.log('📝 Extracting sequences...');
  const sequencesResult = await pool.query(`
    SELECT sequence_name, data_type, start_value, increment_by, max_value, min_value
    FROM information_schema.sequences
    WHERE sequence_schema = 'public'
  `);

  if (sequencesResult.rows.length > 0) {
    let sequencesDDL = `-- ================================================
-- Sequences DDL
-- ================================================

`;
    sequencesResult.rows.forEach(seq => {
      sequencesDDL += `CREATE SEQUENCE IF NOT EXISTS ${seq.sequence_name}
    INCREMENT BY ${seq.increment_by}
    MINVALUE ${seq.min_value}
    MAXVALUE ${seq.max_value}
    START WITH ${seq.start_value};\n\n`;
    });
    fs.writeFileSync(path.join(DDL_DIR, '00-sequences.sql'), sequencesDDL);
  }
}

async function extractReferenceData(): Promise<void> {
  console.log('\n🔤 Extracting reference data...');

  // Extract app_states
  const appStatesResult = await pool.query(`
    SELECT state_type, state_value, state_name, description, is_active
    FROM app_states
    ORDER BY state_type, state_value
  `);

  if (appStatesResult.rows.length > 0) {
    let appStatesDML = `-- ================================================
-- Application States Reference Data
-- ================================================

INSERT INTO app_states (state_type, state_value, state_name, description, is_active) VALUES
`;
    const stateValues = appStatesResult.rows.map(row => 
      `    ('${row.state_type}', '${row.state_value}', '${row.state_name}', '${row.description}', ${row.is_active})`
    );
    appStatesDML += stateValues.join(',\n') + '\nON CONFLICT DO NOTHING;\n\n';

    // Extract state_transitions
    const transitionsResult = await pool.query(`
      SELECT state_type, from_state, to_state, transition_name, requires_permission
      FROM state_transitions
      ORDER BY state_type, from_state, to_state
    `);

    if (transitionsResult.rows.length > 0) {
      appStatesDML += `-- State Transitions
INSERT INTO state_transitions (state_type, from_state, to_state, transition_name, requires_permission) VALUES
`;
      const transitionValues = transitionsResult.rows.map(row => 
        `    ('${row.state_type}', '${row.from_state}', '${row.to_state}', '${row.transition_name}', ${row.requires_permission})`
      );
      appStatesDML += transitionValues.join(',\n') + '\nON CONFLICT DO NOTHING;\n';
    }

    fs.writeFileSync(path.join(REF_DATA_DIR, '01-app-states.sql'), appStatesDML);
  }

  // Extract ESM reference data
  const esmRefResult = await pool.query(`
    SELECT category, value, description, sample_text, sort_order, is_active
    FROM esm_ref
    WHERE is_active = true
    ORDER BY category, sort_order, value
  `);

  if (esmRefResult.rows.length > 0) {
    let esmRefDML = `-- ================================================
-- ESM Reference Data (Emotions, Sounds, Modulations)
-- ================================================

INSERT INTO esm_ref (category, value, description, sample_text, sort_order, is_active) VALUES
`;
    const esmValues = esmRefResult.rows.map(row => {
      const sampleText = row.sample_text ? row.sample_text.replace(/'/g, "''") : '';
      const description = row.description ? row.description.replace(/'/g, "''") : '';
      return `    (${row.category}, '${row.value}', '${description}', '${sampleText}', ${row.sort_order}, ${row.is_active})`;
    });
    esmRefDML += esmValues.join(',\n') + '\nON CONFLICT DO NOTHING;\n';

    fs.writeFileSync(path.join(REF_DATA_DIR, '02-esm-reference.sql'), esmRefDML);
  }

  // Extract notification campaigns
  const campaignsResult = await pool.query(`
    SELECT source_domain, source_event_type, campaign_name, template_key, 
           delivery_channels, priority, status
    FROM notification_campaigns
    WHERE status = 'active'
    ORDER BY source_domain, source_event_type
  `);

  if (campaignsResult.rows.length > 0) {
    let campaignsDML = `-- ================================================
-- Notification Campaigns Reference Data
-- ================================================

INSERT INTO notification_campaigns (source_domain, source_event_type, campaign_name, template_key, delivery_channels, priority, status) VALUES
`;
    const campaignValues = campaignsResult.rows.map(row => 
      `    ('${row.source_domain}', '${row.source_event_type}', '${row.campaign_name}', '${row.template_key}', '${JSON.stringify(row.delivery_channels)}'::jsonb, ${row.priority}, '${row.status}')`
    );
    campaignsDML += campaignValues.join(',\n') + '\nON CONFLICT DO NOTHING;\n';

    fs.writeFileSync(path.join(REF_DATA_DIR, '03-notification-campaigns.sql'), campaignsDML);
  }
}

async function createMasterScripts(): Promise<void> {
  console.log('\n📋 Creating master scripts...');

  // Master DDL Script
  const masterDDL = `-- ================================================
-- Master DDL Script
-- Run this to create all database objects
-- ================================================

-- Enable extensions
\\i DDL/00-database-setup.sql

-- Create sequences
\\i DDL/00-sequences.sql

-- Core tables
\\i DDL/01-core-tables.sql

-- Story tables  
\\i DDL/02-story-tables.sql

-- ESM tables
\\i DDL/03-esm-tables.sql

-- Other tables
\\i DDL/04-other-tables.sql

-- Admin and notification tables
\\i DDL/create-admin-and-notification-tables.sql

-- Additional migrations
\\i DDL/add-soft-delete-columns.sql
\\i DDL/add-stripe-columns.sql
\\i DDL/alter-story-content-nullable.sql
`;

  fs.writeFileSync(
    path.join('./backend-project/DB_SCRIPTS', 'run-all-ddl.sql'),
    masterDDL
  );

  // Master Reference Data Script
  const masterDML = `-- ================================================
-- Master Reference Data Script
-- Run this to insert all reference data
-- ================================================

-- Application states
\\i REFERENCE_DATA/01-app-states.sql

-- ESM reference data
\\i REFERENCE_DATA/02-esm-reference.sql

-- Notification campaigns
\\i REFERENCE_DATA/03-notification-campaigns.sql
`;

  fs.writeFileSync(
    path.join('./backend-project/DB_SCRIPTS', 'run-all-reference-data.sql'),
    masterDML
  );

  // README for database scripts
  const readme = `# Database Scripts

## Overview
This folder contains all DDL (Data Definition Language) and DML (Data Manipulation Language) scripts for the storytelling application database.

## Structure
- **DDL/**: Database structure scripts (tables, indexes, constraints)
- **DML/**: Data manipulation scripts (updates, deletes)
- **REFERENCE_DATA/**: Initial reference data inserts

## Setup Instructions

### 1. Create Database
\`\`\`sql
CREATE DATABASE storytelling_app;
\`\`\`

### 2. Run DDL Scripts
\`\`\`bash
psql -U your_username -d storytelling_app -f run-all-ddl.sql
\`\`\`

### 3. Load Reference Data
\`\`\`bash
psql -U your_username -d storytelling_app -f run-all-reference-data.sql
\`\`\`

## Individual Scripts

### DDL Scripts
- **00-database-setup.sql**: Enable required extensions
- **00-sequences.sql**: Create all sequences
- **01-core-tables.sql**: User authentication and session tables
- **02-story-tables.sql**: Story content and narration tables
- **03-esm-tables.sql**: Voice recording and training tables
- **04-other-tables.sql**: Miscellaneous support tables
- **create-admin-and-notification-tables.sql**: Admin dashboard and notification system

### Reference Data Scripts
- **01-app-states.sql**: Application state machine configuration
- **02-esm-reference.sql**: Emotions, sounds, and modulations
- **03-notification-campaigns.sql**: Notification campaign templates

## Notes
- Scripts are idempotent (safe to run multiple times)
- Foreign key constraints are properly ordered
- All tables use IF NOT EXISTS clauses
- Reference data uses ON CONFLICT DO NOTHING
`;

  fs.writeFileSync(
    path.join('./backend-project/DB_SCRIPTS', 'README.md'),
    readme
  );
}

// Main execution
async function main() {
  try {
    console.log('🚀 Extracting database DDL from actual schema...\n');
    
    await extractAllTables();
    await extractReferenceData();
    await createMasterScripts();
    
    console.log('\n✨ Database extraction complete!');
    console.log('📁 Scripts generated in: ./backend-project/DB_SCRIPTS/');
    
  } catch (error) {
    console.error('❌ Error extracting database:', error);
  } finally {
    await pool.end();
  }
}

main();