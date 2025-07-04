/**
 * Language Configuration
 * Manages default language settings for the application
 */

export type Language = 'en' | 'es' | 'fr' | 'de' | 'ja' | 'zh' | 'ko';

export interface LanguageConfig {
  defaultLanguage: Language;
  fallbackLanguage: Language;
  supportedLanguages: Language[];
  locale: {
    [key in Language]: string;
  };
}

export const LANGUAGE_CONFIG: LanguageConfig = {
  defaultLanguage: 'en',
  fallbackLanguage: 'en',
  supportedLanguages: ['en', 'es', 'fr', 'de', 'ja', 'zh', 'ko'],
  locale: {
    en: 'en-US',
    es: 'es-ES',
    fr: 'fr-FR',
    de: 'de-DE',
    ja: 'ja-JP',
    zh: 'zh-CN',
    ko: 'ko-KR'
  }
};

/**
 * Get current user language from user session/preferences
 * For now returns default language until user profiles are implemented
 */
export function getCurrentUserLanguage(): Language {
  // TODO: Once user profiles are implemented, get language from user preferences
  // For now, return default language
  return LANGUAGE_CONFIG.defaultLanguage;
}

/**
 * Get locale string for current user language
 */
export function getCurrentUserLocale(): string {
  const language = getCurrentUserLanguage();
  return LANGUAGE_CONFIG.locale[language];
}