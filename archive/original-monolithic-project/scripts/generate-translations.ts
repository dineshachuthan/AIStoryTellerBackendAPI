#!/usr/bin/env tsx
/**
 * Generate i18n translations for all supported languages using OpenAI
 * 
 * Usage: npm run generate-translations
 * 
 * This script will:
 * 1. Read the current English messages from i18n-hierarchical.ts
 * 2. Use OpenAI to translate them to all supported languages
 * 3. Save the result to shared/i18n-hierarchical-translated.ts
 * 4. You can then review and replace the original file
 */

import '../server/i18n-translation-service';