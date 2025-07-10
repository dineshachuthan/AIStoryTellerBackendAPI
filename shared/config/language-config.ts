/**
 * Language Configuration
 * Manages default language settings for the application
 */

export type Language = 'en' | 'ta';

export interface LanguageConfig {
  defaultLanguage: Language;
  // Fallback logic goes here - removed fallbackLanguage field
  supportedLanguages: Language[];
  locale: {
    [key in Language]: string;
  };
}

export const LANGUAGE_CONFIG: LanguageConfig = {
  defaultLanguage: 'en',
  // Fallback logic goes here - removed fallbackLanguage value
  supportedLanguages: ['en', 'ta'],
  locale: {
    en: 'en-US',
    ta: 'ta-IN'
  }
};

/**
 * Get current user language from user session/preferences
 * For now returns default language until user profiles are implemented
 */
export function getCurrentUserLanguage(): Language {
  // Check localStorage for selected language
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('selectedLanguage');
    if (saved && LANGUAGE_CONFIG.supportedLanguages.includes(saved as Language)) {
      return saved as Language;
    }
  }
  return LANGUAGE_CONFIG.defaultLanguage;
}

/**
 * Get locale string for current user language
 */
export function getCurrentUserLocale(): string {
  const language = getCurrentUserLanguage();
  return LANGUAGE_CONFIG.locale[language];
}