import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, LANGUAGE_CONFIG } from '@/config/language-config';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { apiClient } from '@/lib/api-client';

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

  // Fetch user data to sync language preference
  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  // Update language preference mutation
  const updateLanguageMutation = useMutation({
    mutationFn: async (newLanguage: Language) => {
      return apiClient.auth.updateLanguage(newLanguage);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
  });

  // Sync language from database when user data loads
  useEffect(() => {
    if (user?.language && LANGUAGE_CONFIG.supportedLanguages.includes(user.language as Language)) {
      setLanguageState(user.language as Language);
      localStorage.setItem('selectedLanguage', user.language);
    }
  }, [user]);

  const setLanguage = (newLanguage: Language) => {
    setLanguageState(newLanguage);
    localStorage.setItem('selectedLanguage', newLanguage);
    
    // Update in database if user is logged in
    if (user) {
      updateLanguageMutation.mutate(newLanguage);
    }
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