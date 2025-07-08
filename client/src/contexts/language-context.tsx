import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, LANGUAGE_CONFIG } from '@shared/language-config';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  locale: string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Get initial language from localStorage or default to 'en'
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('selectedLanguage');
    if (saved && LANGUAGE_CONFIG.supportedLanguages.includes(saved as Language)) {
      return saved as Language;
    }
    return 'en';
  });

  const setLanguage = (newLanguage: Language) => {
    setLanguageState(newLanguage);
    localStorage.setItem('selectedLanguage', newLanguage);
  };

  const locale = LANGUAGE_CONFIG.locale[language];

  useEffect(() => {
    // Update document language attribute
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, locale }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}