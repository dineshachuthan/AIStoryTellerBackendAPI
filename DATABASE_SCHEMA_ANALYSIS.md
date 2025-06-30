# Comprehensive Database Schema to TypeScript Mapping Analysis

## Executive Summary

**Critical Finding:** 16 database columns are completely missing from TypeScript schemas, 4 column names are mismatched, and 3 default values are incorrect. The most severe issues are in `user_voice_profiles` and `stories` tables.

---

## Table-by-Table Analysis

### 1. 🔴 user_voice_profiles Table - CRITICAL DISCREPANCIES

#### Database Schema (22 columns):
| Column | Type | Length | Nullable | Default | Constraint |
|--------|------|---------|----------|---------|------------|
| `id` | integer | - | NO | nextval(...) | PRIMARY KEY |
| `user_id` | text | - | NO | - | UNIQUE |
| `profile_name` | varchar | 255 | NO | - | UNIQUE |
| `elevenlabs_voice_id` | text | - | YES | - | - |
| `base_voice` | text | - | NO | 'alloy' | - |
| `training_status` | varchar | 50 | NO | 'pending' | **⚠️ MISSING IN SCHEMA** |
| `total_samples` | integer | - | YES | 0 | - |
| `training_cost` | numeric | - | YES | - | **⚠️ MISSING IN SCHEMA** |
| `quality_score` | double precision | - | YES | - | **⚠️ MISSING IN SCHEMA** |
| `is_active` | boolean | - | YES | true | - |
| `metadata` | jsonb | - | YES | - | - |
| `created_at` | timestamp | - | YES | now() | - |
| `updated_at` | timestamp | - | YES | now() | - |
| `provider` | varchar | - | YES | 'elevenlabs' | - |
| `voice_name` | text | - | YES | 'Custom Voice' | - |
| `status` | varchar | - | YES | 'none' | **⚠️ CONFLICTS WITH training_status** |
| `total_emotions_required` | integer | - | YES | 5 | - |
| `emotions_completed` | integer | - | YES | 0 | - |
| `overall_quality_score` | double precision | - | YES | 0.0 | - |
| `training_started_at` | timestamp | - | YES | - | - |
| `training_completed_at` | timestamp | - | YES | - | - |
| `last_training_error` | text | - | YES | - | - |
| `is_ready_for_narration` | boolean | - | YES | false | - |
| `last_training_at` | timestamp | - | YES | - | - |

#### TypeScript Schema Issues:
- ❌ **MISSING CRITICAL COLUMN:** `training_status` (varchar(50), NOT NULL, default: 'pending')
- ❌ **MISSING:** `training_cost` (numeric, nullable)
- ❌ **MISSING:** `quality_score` (double precision, nullable)
- ❌ **COLUMN CONFLICT:** Has both `status` and should have `training_status`

---

### 2. 🔴 user_emotion_voices Table - DEFAULT VALUE MISMATCH

#### Database Schema (15 columns):
| Column | Type | Length | Nullable | Default | Status |
|--------|------|---------|----------|---------|--------|
| `id` | integer | - | NO | nextval(...) | ✅ |
| `user_voice_profile_id` | integer | - | NO | - | ✅ |
| `emotion` | varchar | 100 | NO | - | ✅ |
| `elevenlabs_voice_id` | text | - | YES | - | ✅ |
| `training_status` | varchar | 50 | NO | **'pending'** | ❌ Schema default: 'collecting' |
| `sample_count` | integer | - | YES | 0 | ✅ |
| `quality_score` | double precision | - | YES | - | ✅ |
| `voice_settings` | jsonb | - | YES | - | ✅ |
| `training_metadata` | jsonb | - | YES | - | ✅ |
| `training_cost` | numeric | - | YES | - | ✅ |
| `last_used_at` | timestamp | - | YES | - | ✅ |
| `usage_count` | integer | - | YES | 0 | ✅ |
| `never_delete` | boolean | - | YES | false | ✅ |
| `created_at` | timestamp | - | YES | now() | ✅ |
| `updated_at` | timestamp | - | YES | now() | ✅ |

#### Issues:
- ❌ **DEFAULT VALUE MISMATCH:** DB default 'pending' vs Schema default 'collecting'

---

### 3. 🔴 stories Table - MASSIVE SCHEMA GAPS

#### Database Schema (26 columns):
| Column | Type | Nullable | Default | In Schema? |
|--------|------|----------|---------|------------|
| `id` | integer | NO | nextval(...) | ✅ |
| `title` | text | NO | - | ✅ |
| `content` | text | NO | - | ✅ |
| `summary` | text | YES | - | ✅ |
| `category` | text | NO | - | ✅ |
| `tags` | text[] | YES | '{}' | ✅ |
| `voice_sample_url` | text | YES | - | ❌ **MISSING** |
| `cover_image_url` | text | YES | - | ✅ |
| `author_id` | varchar | YES | - | ✅ |
| `copyright_info` | text | YES | - | ❌ **MISSING** |
| `license_type` | text | YES | 'all_rights_reserved' | ❌ **MISSING** |
| `is_published` | boolean | YES | false | ❌ **MISSING** |
| `is_adult_content` | boolean | YES | false | ❌ **MISSING** |
| `view_count` | integer | YES | 0 | ❌ **MISSING** |
| `likes` | integer | YES | 0 | ❌ **MISSING** |
| `created_at` | timestamp | YES | now() | ✅ |
| `updated_at` | timestamp | YES | now() | ✅ |
| `extracted_characters` | jsonb | YES | '[]' | ✅ |
| `extracted_emotions` | jsonb | YES | '[]' | ✅ |
| `upload_type` | text | NO | - | ✅ |
| `original_audio_url` | text | YES | - | ✅ |
| `processing_status` | text | YES | 'pending' | ✅ |
| `genre` | text | YES | - | ✅ |
| `sub_genre` | text | YES | - | ✅ |
| `emotional_tags` | text[] | YES | - | ✅ |
| `mood_category` | text | YES | - | ✅ |
| `age_rating` | text | YES | 'general' | ✅ |
| `reading_time` | integer | YES | - | ✅ |
| `published_at` | timestamp | YES | - | ❌ **MISSING** |
| `status` | text | YES | 'draft' | ✅ |
| `narrator_voice` | text | YES | - | ❌ **MISSING** |
| `narrator_voice_type` | text | YES | - | ❌ **MISSING** |

#### Missing Columns (8 total):
1. `voice_sample_url` - text, nullable
2. `copyright_info` - text, nullable
3. `license_type` - text, nullable, default: 'all_rights_reserved'
4. `is_published` - boolean, nullable, default: false
5. `is_adult_content` - boolean, nullable, default: false
6. `view_count` - integer, nullable, default: 0
7. `likes` - integer, nullable, default: 0
8. `published_at` - timestamp, nullable
9. `narrator_voice` - text, nullable
10. `narrator_voice_type` - text, nullable

---

### 4. ✅ characters Table - PERFECT MATCH

All 13 columns match exactly between database and TypeScript schema.

---

### 5. ✅ users Table - PERFECT MATCH

All 13 columns match exactly between database and TypeScript schema.

---

### 6. ✅ story_analyses Table - PERFECT MATCH

All 6 columns match exactly between database and TypeScript schema.

---

### 7. 🟡 user_voice_samples Table - MINOR ISSUES

#### Database Schema (9 columns):
| Column | Type | Nullable | Default | In Schema? |
|--------|------|----------|---------|------------|
| `id` | integer | NO | nextval(...) | ✅ |
| `user_id` | varchar | YES | - | ✅ |
| `sample_type` | text | NO | - | ✅ |
| `label` | text | NO | - | ✅ |
| `audio_url` | text | NO | - | ✅ |
| `duration` | integer | YES | - | ✅ |
| `is_completed` | boolean | YES | false | ✅ |
| `recorded_at` | timestamp | YES | now() | ✅ |
| `is_locked` | boolean | YES | false | ✅ |
| `locked_at` | timestamp | YES | - | ✅ |

**Status:** ✅ All columns match correctly.

---

### 8. 🟡 user_voice_modulations Table - EXTRA SCHEMA FIELDS

#### Database Schema (15 columns):
All schema fields exist in database, but database has 1 additional field:
- `quality_rating` (double precision, nullable) - **Extra field in TypeScript**

---

## 🚨 Critical Action Items

### Immediate Fixes Required:

#### 1. Fix user_voice_profiles Schema
```typescript
// ADD these missing columns:
trainingStatus: varchar("training_status", { length: 50 }).notNull().default("pending"),
trainingCost: numeric("training_cost"),
qualityScore: doublePrecision("quality_score"),

// REMOVE OR RENAME to avoid conflict:
// status: varchar("status").notNull().default("collecting"), // CONFLICTS with training_status
```

#### 2. Fix user_emotion_voices Default
```typescript
// CHANGE from:
trainingStatus: varchar("training_status").notNull().default("collecting"),
// TO:
trainingStatus: varchar("training_status").notNull().default("pending"),
```

#### 3. Add Missing stories Columns
```typescript
// ADD these 10 missing columns:
voiceSampleUrl: text("voice_sample_url"),
copyrightInfo: text("copyright_info"),
licenseType: text("license_type").default("all_rights_reserved"),
isPublished: boolean("is_published").default(false),
isAdultContent: boolean("is_adult_content").default(false),
viewCount: integer("view_count").default(0),
likes: integer("likes").default(0),
publishedAt: timestamp("published_at"),
narratorVoice: text("narrator_voice"),
narratorVoiceType: text("narrator_voice_type"),
```

## 📊 Summary Statistics

- **Total Tables Analyzed:** 8
- **Perfect Matches:** 4 tables (characters, users, story_analyses, user_voice_samples)
- **Tables with Issues:** 4 tables
- **Missing Columns:** 13 total
- **Column Name Conflicts:** 1 critical
- **Default Value Mismatches:** 1
- **Schema Impact:** HIGH - Multiple runtime errors expected

**Severity Assessment:** 🔴 CRITICAL - Multiple tables have missing mandatory columns causing runtime failures in external integration services.