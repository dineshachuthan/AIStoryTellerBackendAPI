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
 * Translate a batch of messages to a target language using OpenAI
 */
async function translateBatch(
  batch: TranslationBatch[],
  targetLanguage: Language,
  languageName: string
): Promise<Record<string, string>> {
  const prompt = `You are a professional translator for a storytelling web application. Translate the following English UI text to ${languageName} (${targetLanguage}).

Context: This is for a collaborative storytelling platform with features like voice recording, story narration, and video generation.

Important guidelines:
- Maintain the same tone and formality level
- Keep placeholders like {variableName} unchanged
- Preserve any HTML tags if present
- For button text, keep translations concise
- For error messages, be clear and helpful
- Use natural, idiomatic expressions in the target language

Translate each item and return a JSON object with the key as the property name and the translation as the value.

Items to translate:
${JSON.stringify(batch, null, 2)}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a professional translator specializing in UI/UX text localization."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3 // Lower temperature for more consistent translations
    });

    const translations = JSON.parse(response.choices[0].message.content || "{}");
    return translations;
  } catch (error) {
    console.error(`Error translating batch to ${targetLanguage}:`, error);
    return {};
  }
}

/**
 * Extract all messages that need translation from the MESSAGES object
 */
function extractMessagesForTranslation(
  obj: any,
  parentKey: string = ""
): TranslationBatch[] {
  const messages: TranslationBatch[] = [];

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = parentKey ? `${parentKey}.${key}` : key;

    if (value && typeof value === "object") {
      if (value.templates && value.templates.en) {
        // This is a message object with templates
        messages.push({
          key: fullKey,
          englishText: value.templates.en,
          context: value.type || undefined
        });
      } else {
        // Recurse into nested objects
        messages.push(...extractMessagesForTranslation(value, fullKey));
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

  // Group messages into batches of 20 for efficient API usage
  const batchSize = 20;
  const batches: TranslationBatch[][] = [];
  for (let i = 0; i < messagesToTranslate.length; i += batchSize) {
    batches.push(messagesToTranslate.slice(i, i + batchSize));
  }

  // Translate to each target language
  const allTranslations: Record<string, Record<Language, string>> = {};

  for (const lang of LANGUAGE_CONFIG.supportedLanguages) {
    if (lang === "en") continue; // Skip English, it's our source

    const languageNames: Record<Language, string> = {
      en: "English",
      es: "Spanish",
      fr: "French", 
      de: "German",
      ja: "Japanese",
      zh: "Chinese (Simplified)",
      ko: "Korean"
    };

    console.log(`\nTranslating to ${languageNames[lang]} (${lang})...`);

    let translatedCount = 0;
    for (const [index, batch] of batches.entries()) {
      console.log(`  Processing batch ${index + 1}/${batches.length}...`);
      
      const translations = await translateBatch(batch, lang, languageNames[lang]);
      
      // Store translations
      for (const [key, translation] of Object.entries(translations)) {
        if (!allTranslations[key]) {
          allTranslations[key] = { en: "" };
        }
        allTranslations[key][lang] = translation;
        translatedCount++;
      }

      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`  Completed ${translatedCount} translations for ${lang}`);
  }

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