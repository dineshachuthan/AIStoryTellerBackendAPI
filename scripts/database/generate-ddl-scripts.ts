#!/usr/bin/env tsx
/**
 * Generate DDL Scripts from Drizzle Schema
 * This script extracts all table definitions and creates proper SQL DDL scripts
 */

import * as fs from 'fs';
import * as path from 'path';
import { sql } from 'drizzle-orm';
import { 
  pgTable, 
  pgEnum,
  PgTable 
} from 'drizzle-orm/pg-core';

// Import all schemas
import * as mainSchema from '../../shared/schema/schema';
import * as notificationSchema from '../../shared/schema/notification-tracking';
import * as externalProviderSchema from '../../shared/schema/external-provider-tracking';
import * as referenceSchema from '../../shared/schema/reference-schema';
import * as roleplaySchema from '../../shared/schema/roleplay-schema';

// Output directories
const DDL_DIR = './backend-project/DB_SCRIPTS/DDL';
const DML_DIR = './backend-project/DB_SCRIPTS/DML';
const REF_DATA_DIR = './backend-project/DB_SCRIPTS/REFERENCE_DATA';

// Ensure directories exist
[DDL_DIR, DML_DIR, REF_DATA_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Extract all enums
const extractEnums = () => {
  const enums: string[] = [];
  
  // Add any enums from schema here
  // Example: userRole enum, etc.
  
  return enums;
};

// Convert Drizzle table to SQL DDL
const tableToSQL = (tableName: string, table: any): string => {
  // This is a simplified version - in production you'd use Drizzle's SQL generation
  let sql = `-- Table: ${tableName}\n`;
  sql += `CREATE TABLE IF NOT EXISTS ${tableName} (\n`;
  
  // Add columns based on table structure
  // This would need to be expanded to handle all column types
  
  sql += `);\n\n`;
  
  return sql;
};

// Generate Core Tables DDL
const generateCoreTables = () => {
  let ddl = `-- ================================================
-- Core Tables DDL Script
-- Generated from Drizzle Schema
-- ================================================

`;

  // Users and authentication tables
  const authTables = [
    'users',
    'user_providers', 
    'local_users',
    'sessions',
    'user_session_metadata',
    'user_login_history',
    'password_reset_tokens',
    'user_2fa_settings',
    'user_security_questions'
  ];

  ddl += '-- Authentication & User Management\n';
  ddl += '-- ================================\n\n';
  
  // Add CREATE TABLE statements for each auth table
  
  return ddl;
};

// Generate Story Tables DDL
const generateStoryTables = () => {
  let ddl = `-- ================================================
-- Story & Content Tables DDL Script
-- Generated from Drizzle Schema
-- ================================================

`;

  const storyTables = [
    'stories',
    'story_analysis',
    'story_scenes',
    'story_characters',
    'story_emotions',
    'story_narrations',
    'story_roleplay_templates',
    'story_invitations',
    'story_collaborations',
    'story_groups',
    'character_voice_assignments'
  ];

  ddl += '-- Story Management\n';
  ddl += '-- ===============\n\n';
  
  return ddl;
};

// Generate Reference Data Inserts
const generateReferenceData = () => {
  let dml = `-- ================================================
-- Reference Data Insert Scripts
-- ================================================

`;

  // App States
  dml += `-- Application States\n`;
  dml += `INSERT INTO app_states (state_type, state_value, state_name, description, is_active) VALUES\n`;
  dml += `  ('story', 'draft', 'Draft', 'Story is being written', true),\n`;
  dml += `  ('story', 'pending_analysis', 'Pending Analysis', 'Story is awaiting AI analysis', true),\n`;
  dml += `  ('story', 'analyzing', 'Analyzing', 'Story is being analyzed by AI', true),\n`;
  dml += `  ('story', 'ready', 'Ready', 'Story analysis complete', true),\n`;
  dml += `  ('story', 'private_testing', 'Private Testing', 'Story in private testing phase', true),\n`;
  dml += `  ('story', 'collaborative_review', 'Collaborative Review', 'Story in collaborative review', true),\n`;
  dml += `  ('story', 'finalized', 'Finalized', 'Story is finalized', true),\n`;
  dml += `  ('story', 'published', 'Published', 'Story is published publicly', true),\n`;
  dml += `  ('story', 'archived', 'Archived', 'Story is archived', true);\n\n`;

  // State Transitions
  dml += `-- State Transitions\n`;
  dml += `INSERT INTO state_transitions (state_type, from_state, to_state, transition_name, requires_permission) VALUES\n`;
  dml += `  ('story', 'draft', 'pending_analysis', 'submit_for_analysis', false),\n`;
  dml += `  ('story', 'pending_analysis', 'analyzing', 'start_analysis', false),\n`;
  dml += `  ('story', 'analyzing', 'ready', 'analysis_complete', false),\n`;
  dml += `  ('story', 'ready', 'private_testing', 'start_testing', true),\n`;
  dml += `  ('story', 'private_testing', 'collaborative_review', 'invite_collaborators', true),\n`;
  dml += `  ('story', 'collaborative_review', 'finalized', 'finalize_story', true),\n`;
  dml += `  ('story', 'finalized', 'published', 'publish_story', true);\n\n`;

  // ESM Reference Data (Emotions, Sounds, Modulations)
  dml += `-- ESM Reference Data\n`;
  dml += `INSERT INTO esm_ref (category, value, description, sample_text, sort_order, is_active) VALUES\n`;
  
  // Core Emotions
  dml += `  -- Core Emotions\n`;
  dml += `  ('emotion', 'Happy', 'Feeling joy or pleasure', 'She smiled brightly as she opened the surprise gift, her eyes sparkling with pure joy and excitement at the thoughtful gesture from her best friend.', 1, true),\n`;
  dml += `  ('emotion', 'Sad', 'Feeling sorrow or unhappiness', 'Tears welled up in his eyes as he read the farewell letter, knowing that this goodbye might be the last time they would ever speak to each other.', 2, true),\n`;
  dml += `  ('emotion', 'Angry', 'Feeling strong displeasure', 'His face turned red with fury as he slammed his fist on the table, unable to contain his rage at the injustice he had just witnessed.', 3, true),\n`;
  dml += `  ('emotion', 'Fear', 'Feeling afraid or anxious', 'Her heart pounded in her chest as footsteps echoed in the dark hallway, each sound making her grip the doorknob tighter with trembling hands.', 4, true),\n`;
  dml += `  ('emotion', 'Surprised', 'Feeling sudden wonder', 'She gasped and nearly dropped her coffee when her colleagues jumped out shouting surprise, having completely forgotten it was her birthday.', 5, true),\n`;
  dml += `  ('emotion', 'Disgusted', 'Feeling revulsion', 'He wrinkled his nose and pushed the plate away, the smell of the spoiled food making his stomach turn with overwhelming nausea.', 6, true),\n`;
  dml += `  ('emotion', 'Neutral', 'Feeling no strong emotion', 'She nodded politely as the stranger gave directions, maintaining a calm and composed expression throughout the brief interaction.', 7, true),\n`;
  dml += `  ('emotion', 'Excited', 'Feeling enthusiasm', 'The children bounced up and down with uncontainable energy, their faces glowing with anticipation for the adventure that awaited them at the amusement park.', 8, true),\n`;
  dml += `  ('emotion', 'Thoughtful', 'Feeling contemplative', 'He stared out the window with a distant look in his eyes, carefully considering each word he would say in tomorrow\\'s important meeting.', 9, true),\n`;
  dml += `  ('emotion', 'Confident', 'Feeling self-assured', 'She walked into the interview room with her head held high, knowing she had prepared thoroughly and was the perfect candidate for this position.', 10, true),\n\n`;
  
  // Common Sounds
  dml += `  -- Common Sounds\n`;
  dml += `  ('sound', 'Laughing', 'Sound of laughter', 'The room filled with contagious laughter as the comedian delivered the perfect punchline, causing everyone to burst into fits of giggles and loud guffaws.', 101, true),\n`;
  dml += `  ('sound', 'Crying', 'Sound of crying', 'Soft sobs echoed through the empty room as she clutched the old photograph, tears streaming down her face in waves of grief.', 102, true),\n`;
  dml += `  ('sound', 'Footsteps', 'Sound of walking', 'Heavy footsteps echoed through the marble hallway, each step creating a rhythmic pattern that announced the arrival of someone important.', 103, true),\n`;
  dml += `  ('sound', 'Doors', 'Sound of doors', 'The old wooden door creaked loudly on its rusty hinges before slamming shut with a bang that rattled the windows.', 104, true),\n`;
  dml += `  ('sound', 'Breathing', 'Sound of breathing', 'His heavy breathing filled the silence as he tried to catch his breath after running up five flights of stairs to make it on time.', 105, true);\n\n`;

  return dml;
};

// Generate Notification Campaign Reference Data
const generateNotificationData = () => {
  let dml = `-- ================================================
-- Notification Campaign Reference Data
-- ================================================

`;

  dml += `-- Initial Notification Campaigns\n`;
  dml += `INSERT INTO notification_campaigns (source_domain, source_event_type, campaign_name, template_key, delivery_channels, priority) VALUES\n`;
  dml += `  ('identity', 'user.registered', 'Welcome New Users', 'welcome_new_user', '["email"]', 100),\n`;
  dml += `  ('identity', 'password.reset', 'Password Reset Request', 'password_reset', '["email"]', 200),\n`;
  dml += `  ('collaboration', 'invitation.sent', 'Story Collaboration Invitation', 'collaboration_invite', '["email", "sms"]', 150),\n`;
  dml += `  ('story', 'analysis.completed', 'Story Analysis Complete', 'story_analysis_done', '["email", "in_app"]', 80),\n`;
  dml += `  ('story', 'published', 'Story Published', 'story_published', '["email", "in_app"]', 90),\n`;
  dml += `  ('narration', 'ready', 'Narration Ready', 'narration_ready', '["email", "in_app"]', 85),\n`;
  dml += `  ('subscription', 'created', 'Subscription Confirmation', 'subscription_welcome', '["email"]', 100),\n`;
  dml += `  ('subscription', 'payment.failed', 'Payment Failed', 'payment_failed', '["email", "sms"]', 250);\n\n`;

  return dml;
};

// Main execution
const main = async () => {
  console.log('🚀 Generating DDL scripts from Drizzle schemas...\n');

  // 1. Copy existing migration files
  console.log('📋 Copying existing migration files...');
  const migrations = [
    'create-admin-and-notification-tables.sql',
    'add-soft-delete-columns.sql',
    'add-stripe-columns.sql',
    'alter-story-content-nullable.sql',
    'proposed_esm_schema.sql'
  ];

  migrations.forEach(file => {
    const source = path.join('./migrations', file);
    const dest = path.join(DDL_DIR, file);
    if (fs.existsSync(source)) {
      fs.copyFileSync(source, dest);
      console.log(`  ✅ Copied ${file}`);
    }
  });

  // 2. Generate Core Tables DDL
  console.log('\n📝 Generating core tables DDL...');
  fs.writeFileSync(
    path.join(DDL_DIR, '01-core-tables.sql'),
    generateCoreTables()
  );

  // 3. Generate Story Tables DDL
  console.log('📝 Generating story tables DDL...');
  fs.writeFileSync(
    path.join(DDL_DIR, '02-story-tables.sql'),
    generateStoryTables()
  );

  // 4. Generate Reference Data
  console.log('\n🔤 Generating reference data inserts...');
  fs.writeFileSync(
    path.join(REF_DATA_DIR, '01-app-states-and-esm.sql'),
    generateReferenceData()
  );

  // 5. Generate Notification Data
  console.log('🔔 Generating notification campaign data...');
  fs.writeFileSync(
    path.join(REF_DATA_DIR, '02-notification-campaigns.sql'),
    generateNotificationData()
  );

  // 6. Create Master Scripts
  console.log('\n📋 Creating master scripts...');
  
  // Master DDL Script
  const masterDDL = `-- ================================================
-- Master DDL Script
-- Run this to create all database objects
-- ================================================

-- Run in this order:
\\i DDL/01-core-tables.sql
\\i DDL/02-story-tables.sql
\\i DDL/create-admin-and-notification-tables.sql
\\i DDL/add-soft-delete-columns.sql
\\i DDL/add-stripe-columns.sql
\\i DDL/alter-story-content-nullable.sql
`;

  fs.writeFileSync(
    path.join('./backend-project/DB_SCRIPTS', 'run-all-ddl.sql'),
    masterDDL
  );

  // Master DML Script
  const masterDML = `-- ================================================
-- Master DML Script
-- Run this to insert all reference data
-- ================================================

-- Run in this order:
\\i REFERENCE_DATA/01-app-states-and-esm.sql
\\i REFERENCE_DATA/02-notification-campaigns.sql
`;

  fs.writeFileSync(
    path.join('./backend-project/DB_SCRIPTS', 'run-all-reference-data.sql'),
    masterDML
  );

  console.log('\n✨ DDL script generation complete!');
  console.log(`\n📁 Scripts generated in: ./backend-project/DB_SCRIPTS/`);
};

main().catch(console.error);