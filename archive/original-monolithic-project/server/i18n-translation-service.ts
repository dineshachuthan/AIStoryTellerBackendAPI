import OpenAI from "openai";
import { MESSAGES } from "../shared/i18n-hierarchical";
import { Language, LANGUAGE_CONFIG } from "../shared/language-config";
import fs from "fs/promises";
import path from "path";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface TranslationBatch {
  key: string;
  englishText: string;
  context?: string;
}

/**
 * Translate a batch of messages to ALL target languages at once using OpenAI
 */
async function translateBatchToAllLanguages(
  batch: TranslationBatch[]
): Promise<Record<string, Record<Language, string>>> {
  const prompt = `You are a professional translator for a storytelling web application. Translate the following English UI text to ALL these languages: Spanish (es), French (fr), German (de), Japanese (ja), Chinese Simplified (zh), and Korean (ko).

Context: This is for a collaborative storytelling platform with features like voice recording, story narration, and video generation.

Important guidelines:
- Maintain the same tone and formality level
- Keep placeholders like {variableName} unchanged
- Preserve any HTML tags if present
- For button text, keep translations concise
- For error messages, be clear and helpful
- Use natural, idiomatic expressions in each target language

Return a JSON object where each key is the message key, and the value is an object with language codes as keys and translations as values.

Example format:
{
  "home.title.main": {
    "es": "Crea Historias Asombrosas",
    "fr": "Créez des Histoires Incroyables",
    "de": "Erstelle Erstaunliche Geschichten",
    "ja": "素晴らしい物語を作成",
    "zh": "创作精彩故事",
    "ko": "놀라운 이야기 만들기"
  }
}

Items to translate:
${JSON.stringify(batch, null, 2)}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a professional translator specializing in UI/UX text localization. Provide translations for all requested languages."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 4000
    });

    const translations = JSON.parse(response.choices[0].message.content || "{}");
    return translations;
  } catch (error) {
    console.error(`Error translating batch:`, error);
    return {};
  }
}

/**
 * Extract only messages that NEED translation (missing translations) from the MESSAGES object
 */
function extractMessagesNeedingTranslation(
  obj: any,
  targetLanguages: Language[],
  parentKey: string = ""
): TranslationBatch[] {
  const messages: TranslationBatch[] = [];

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = parentKey ? `${parentKey}.${key}` : key;

    if (value && typeof value === "object") {
      if (value.templates && value.templates.en) {
        // Check if any target language is missing
        const missingLanguages = targetLanguages.filter(
          lang => lang !== 'en' && (!value.templates[lang] || value.templates[lang] === '')
        );
        
        if (missingLanguages.length > 0) {
          // This message needs translation for at least one language
          messages.push({
            key: fullKey,
            englishText: value.templates.en,
            context: value.type || undefined,
            missingLanguages
          });
        }
      } else {
        // Recurse into nested objects
        messages.push(...extractMessagesNeedingTranslation(value, targetLanguages, fullKey));
      }
    }
  }

  return messages;
}

/**
 * Update the MESSAGES object with translations
 */
function applyTranslations(
  obj: any,
  translations: Record<string, Record<Language, string>>
): void {
  for (const [key, value] of Object.entries(obj)) {
    if (value && typeof value === "object") {
      if (value.templates && value.templates.en) {
        // Apply translations to this message
        const fullKey = findFullKey(obj, key);
        if (fullKey && translations[fullKey]) {
          for (const [lang, translation] of Object.entries(translations[fullKey])) {
            if (lang !== "en") {
              value.templates[lang] = translation;
            }
          }
        }
      } else {
        // Recurse into nested objects
        applyTranslations(value, translations);
      }
    }
  }
}

/**
 * Find the full key path for a message
 */
function findFullKey(obj: any, targetKey: string, parentKey: string = ""): string | null {
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = parentKey ? `${parentKey}.${key}` : key;
    
    if (key === targetKey) {
      return parentKey;
    }
    
    if (value && typeof value === "object" && !value.templates) {
      const found = findFullKey(value, targetKey, fullKey);
      if (found) return found;
    }
  }
  
  return null;
}

/**
 * Generate translations for all messages in all supported languages
 */
export async function generateAllTranslations(): Promise<void> {
  console.log("Starting i18n translation generation...");

  // Extract all messages that need translation
  const messagesToTranslate = extractMessagesForTranslation(MESSAGES);
  console.log(`Found ${messagesToTranslate.length} messages to translate`);

  // Group messages into batches of 30 for more efficient API usage
  const batchSize = 30;
  const batches: TranslationBatch[][] = [];
  for (let i = 0; i < messagesToTranslate.length; i += batchSize) {
    batches.push(messagesToTranslate.slice(i, i + batchSize));
  }

  // Translate all languages at once for each batch
  const allTranslations: Record<string, Record<Language, string>> = {};

  console.log(`\nTranslating to all languages (es, fr, de, ja, zh, ko)...`);
  console.log(`Processing ${batches.length} batches with delays to avoid rate limiting...`);

  for (const [index, batch] of batches.entries()) {
    console.log(`\n  Processing batch ${index + 1}/${batches.length} (${batch.length} messages)...`);
    
    try {
      const batchTranslations = await translateBatchToAllLanguages(batch);
      
      // Store translations
      let successCount = 0;
      for (const [key, translations] of Object.entries(batchTranslations)) {
        allTranslations[key] = { en: "", ...translations };
        successCount++;
      }
      
      console.log(`  ✓ Successfully translated ${successCount} messages`);
      
      // Add a 2-second delay between batches to avoid rate limiting
      if (index < batches.length - 1) {
        console.log(`  Waiting 2 seconds before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error(`  ✗ Error in batch ${index + 1}:`, error);
      // Continue with next batch even if one fails
    }
  }

  const totalTranslated = Object.keys(allTranslations).length;
  console.log(`\n✓ Total messages translated: ${totalTranslated}`);
  

  // Generate the updated TypeScript file
  console.log("\nGenerating updated i18n-hierarchical.ts file...");
  
  const updatedMessages = structuredClone(MESSAGES);
  applyTranslationsToMessages(updatedMessages, allTranslations);

  // Write the updated file
  const filePath = path.join(process.cwd(), "shared", "i18n-hierarchical-updated.ts");
  const fileContent = generateTypeScriptFile(updatedMessages);
  
  await fs.writeFile(filePath, fileContent, "utf-8");
  console.log(`\nTranslations complete! Updated file saved to: ${filePath}`);
  console.log("Review the file and rename it to i18n-hierarchical.ts to apply the translations.");
}

/**
 * Apply translations to the messages object
 */
function applyTranslationsToMessages(
  obj: any,
  translations: Record<string, Record<Language, string>>,
  parentKey: string = ""
): void {
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = parentKey ? `${parentKey}.${key}` : key;

    if (value && typeof value === "object") {
      if (value.templates && value.templates.en) {
        // Apply translations to this message
        if (translations[fullKey]) {
          for (const [lang, translation] of Object.entries(translations[fullKey])) {
            if (lang !== "en" && translation) {
              value.templates[lang] = translation;
            }
          }
        }
      } else {
        // Recurse into nested objects
        applyTranslationsToMessages(value, translations, fullKey);
      }
    }
  }
}

/**
 * Generate the TypeScript file content
 */
function generateTypeScriptFile(messages: any): string {
  const importsAndTypes = `/**
 * Hierarchical Internationalization Configuration
 * Namespace-based message organization for better maintainability
 * Pattern: page.component.element
 */

import { getCurrentUserLanguage, type Language } from './language-config';

export type MessageType = 'error' | 'warning' | 'success' | 'info';
export type MessageSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface I18nMessage {
  type: MessageType;
  severity: MessageSeverity;
  variables?: string[];
  templates: {
    en: string;
    es?: string;
    fr?: string;
    de?: string;
    ja?: string;
    zh?: string;
    ko?: string;
  };
}

/**
 * Interpolate variables into template string
 */
function interpolateTemplate(template: string, variables: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return variables[key]?.toString() || match;
  });
}

`;

  const messagesContent = `export const MESSAGES = ${JSON.stringify(messages, null, 2)} as const;`;

  const helperFunctions = `

/**
 * Get a message by its hierarchical key path
 * @param keyPath - Dot-separated key path (e.g., "story_library.actions.edit")
 * @param variables - Optional variables for interpolation
 * @param language - Optional language override
 */
export function getMessage(
  keyPath: string,
  variables?: Record<string, string | number>,
  language?: Language
): string {
  const lang = language || getCurrentUserLanguage() || 'en';
  const keys = keyPath.split('.');
  
  let current: any = MESSAGES;
  for (const key of keys) {
    if (!current[key]) {
      console.warn(\`i18n key not found: \${keyPath}\`);
      return keyPath; // Return the key itself as fallback
    }
    current = current[key];
  }

  const template = current.templates?.[lang] || current.templates?.en;
  if (!template) {
    console.warn(\`i18n template not found for key: \${keyPath}\`);
    return keyPath;
  }

  // Interpolate variables if provided
  if (variables && current.variables) {
    return interpolateTemplate(template, variables);
  }

  return template;
}

/**
 * Get all messages for a specific namespace
 * @param namespace - Top-level namespace (e.g., "home", "story_library")
 */
export function getNamespaceMessages(namespace: string): any {
  return MESSAGES[namespace] || {};
}`;

  return importsAndTypes + messagesContent + helperFunctions;
}

// Run the translation service if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("🌐 Starting i18n translation generation using OpenAI...");
  console.log("This will generate translations for all supported languages.");
  console.log("Ensure OPENAI_API_KEY is set in your environment.\n");
  
  generateAllTranslations()
    .then(() => {
      console.log("\n✅ Translation generation complete!");
      console.log("Check shared/i18n-hierarchical-updated.ts for the results.");
      console.log("Review the translations and rename to i18n-hierarchical.ts when ready.");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Translation generation failed:", error);
      process.exit(1);
    });
}