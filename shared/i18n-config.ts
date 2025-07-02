/**
 * Dynamic Internationalization Configuration
 * Template-based messages with variable interpolation for multi-language support
 */

export type Language = 'en' | 'es' | 'fr' | 'de' | 'ja' | 'zh' | 'ko';
export type MessageType = 'error' | 'warning' | 'success' | 'info';
export type MessageSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface I18nMessageTemplate {
  code: string;
  type: MessageType;
  severity: MessageSeverity;
  variables: string[]; // List of required variables for interpolation
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

export const MESSAGE_TEMPLATES: Record<string, I18nMessageTemplate> = {
  // Voice Sample Operations
  VOICE_SAVE_FAILED: {
    code: 'VOICE_SAVE_FAILED',
    type: 'error',
    severity: 'medium',
    variables: ['emotion', 'category'],
    templates: {
      en: 'Failed to save voice sample for {emotion} in {category}',
      es: 'Error al guardar la muestra de voz para {emotion} en {category}',
      fr: 'Échec de la sauvegarde de l\'échantillon vocal pour {emotion} dans {category}',
      de: 'Fehler beim Speichern der Stimmprobe für {emotion} in {category}',
      ja: '{category}の{emotion}のボイスサンプルの保存に失敗しました',
      zh: '保存{category}中{emotion}的语音样本失败',
      ko: '{category}의 {emotion} 음성 샘플 저장에 실패했습니다'
    }
  },

  VOICE_DELETE_FAILED: {
    code: 'VOICE_DELETE_FAILED',
    type: 'error',
    severity: 'medium',
    variables: ['emotion'],
    templates: {
      en: 'Failed to delete voice sample for {emotion}',
      es: 'Error al eliminar la muestra de voz para {emotion}',
      fr: 'Échec de la suppression de l\'échantillon vocal pour {emotion}',
      de: 'Fehler beim Löschen der Stimmprobe für {emotion}',
      ja: '{emotion}のボイスサンプルの削除に失敗しました',
      zh: '删除{emotion}的语音样本失败',
      ko: '{emotion} 음성 샘플 삭제에 실패했습니다'
    }
  },

  VOICE_CLONING_TRIGGER_FAILED: {
    code: 'VOICE_CLONING_TRIGGER_FAILED',
    type: 'error',
    severity: 'high',
    variables: ['category', 'samplesCount'],
    templates: {
      en: 'Failed to trigger voice cloning for {category} with {samplesCount} samples',
      es: 'Error al activar la clonación de voz para {category} con {samplesCount} muestras',
      fr: 'Échec du déclenchement du clonage vocal pour {category} avec {samplesCount} échantillons',
      de: 'Fehler beim Auslösen des Stimmklonens für {category} mit {samplesCount} Proben',
      ja: '{samplesCount}個のサンプルを使用した{category}のボイスクローニングのトリガーに失敗しました',
      zh: '使用{samplesCount}个样本触发{category}语音克隆失败',
      ko: '{samplesCount}개 샘플로 {category} 음성 복제 트리거에 실패했습니다'
    }
  },

  // Story Operations  
  STORY_SAVE_FAILED: {
    code: 'STORY_SAVE_FAILED',
    type: 'error',
    severity: 'high',
    variables: ['storyTitle', 'userName'],
    templates: {
      en: 'Your story "{storyTitle}" failed to save, {userName}',
      es: 'Tu historia "{storyTitle}" no se pudo guardar, {userName}',
      fr: 'Votre histoire "{storyTitle}" n\'a pas pu être sauvegardée, {userName}',
      de: 'Ihre Geschichte "{storyTitle}" konnte nicht gespeichert werden, {userName}',
      ja: '{userName}さん、あなたの物語「{storyTitle}」の保存に失敗しました',
      zh: '{userName}，您的故事"{storyTitle}"保存失败',
      ko: '{userName}님, 귀하의 이야기 "{storyTitle}" 저장에 실패했습니다'
    }
  },

  STORY_ANALYSIS_FAILED: {
    code: 'STORY_ANALYSIS_FAILED',
    type: 'error',
    severity: 'medium',
    variables: ['storyTitle', 'errorReason'],
    templates: {
      en: 'Analysis failed for story "{storyTitle}" due to {errorReason}',
      es: 'El análisis falló para la historia "{storyTitle}" debido a {errorReason}',
      fr: 'L\'analyse a échoué pour l\'histoire "{storyTitle}" en raison de {errorReason}',
      de: 'Die Analyse für die Geschichte "{storyTitle}" ist aufgrund von {errorReason} fehlgeschlagen',
      ja: '{errorReason}により、物語「{storyTitle}」の分析が失敗しました',
      zh: '由于{errorReason}，故事"{storyTitle}"的分析失败',
      ko: '{errorReason}로 인해 이야기 "{storyTitle}"의 분석이 실패했습니다'
    }
  },

  // User Operations
  USER_AUTH_FAILED: {
    code: 'USER_AUTH_FAILED',
    type: 'error',
    severity: 'critical',
    variables: ['userName', 'provider'],
    templates: {
      en: 'Authentication failed for {userName} via {provider}',
      es: 'La autenticación falló para {userName} a través de {provider}',
      fr: 'L\'authentification a échoué pour {userName} via {provider}',
      de: 'Authentifizierung für {userName} über {provider} fehlgeschlagen',
      ja: '{provider}経由の{userName}の認証に失敗しました',
      zh: '通过{provider}对{userName}的身份验证失败',
      ko: '{provider}를 통한 {userName}의 인증에 실패했습니다'
    }
  },

  // Audio Processing
  NO_SPEECH_DETECTED: {
    code: 'NO_SPEECH_DETECTED',
    type: 'warning',
    severity: 'medium',
    variables: ['fileName'],
    templates: {
      en: 'No clear speech detected in {fileName}. Please speak clearly and loudly enough.',
      es: 'No se detectó discurso claro en {fileName}. Por favor, hable con claridad y suficientemente alto.',
      fr: 'Aucun discours clair détecté dans {fileName}. Veuillez parler clairement et assez fort.',
      de: 'Keine klare Sprache in {fileName} erkannt. Bitte sprechen Sie klar und laut genug.',
      ja: '{fileName}で明確な音声が検出されませんでした。はっきりと十分な音量で話してください。',
      zh: '在{fileName}中未检测到清晰的语音。请清晰且大声地说话。',
      ko: '{fileName}에서 명확한 음성이 감지되지 않았습니다. 명확하고 충분히 큰 소리로 말하세요.'
    }
  },

  FILE_TOO_LARGE: {
    code: 'FILE_TOO_LARGE',
    type: 'error',
    severity: 'medium',
    variables: ['fileName', 'fileSize', 'maxSize'],
    templates: {
      en: 'File {fileName} ({fileSize}) exceeds maximum size of {maxSize}',
      es: 'El archivo {fileName} ({fileSize}) excede el tamaño máximo de {maxSize}',
      fr: 'Le fichier {fileName} ({fileSize}) dépasse la taille maximale de {maxSize}',
      de: 'Datei {fileName} ({fileSize}) überschreitet maximale Größe von {maxSize}',
      ja: 'ファイル{fileName}（{fileSize}）が最大サイズ{maxSize}を超えています',
      zh: '文件{fileName}（{fileSize}）超出最大大小{maxSize}',
      ko: '파일 {fileName}({fileSize})가 최대 크기 {maxSize}를 초과했습니다'
    }
  },

  // Success Messages
  VOICE_SAVED: {
    code: 'VOICE_SAVED',
    type: 'success',
    severity: 'low',
    variables: ['userName', 'emotion', 'category'],
    templates: {
      en: '{userName}, your {emotion} voice sample in {category} was saved successfully!',
      es: '¡{userName}, tu muestra de voz {emotion} en {category} se guardó exitosamente!',
      fr: '{userName}, votre échantillon vocal {emotion} dans {category} a été sauvegardé avec succès !',
      de: '{userName}, Ihre {emotion} Stimmprobe in {category} wurde erfolgreich gespeichert!',
      ja: '{userName}さん、{category}の{emotion}ボイスサンプルが正常に保存されました！',
      zh: '{userName}，您在{category}中的{emotion}语音样本已成功保存！',
      ko: '{userName}님, {category}의 {emotion} 음성 샘플이 성공적으로 저장되었습니다!'
    }
  },

  VOICE_DELETED: {
    code: 'VOICE_DELETED',
    type: 'success',
    severity: 'low',
    variables: ['emotion'],
    templates: {
      en: 'Voice sample for {emotion} deleted successfully',
      es: 'Muestra de voz para {emotion} eliminada exitosamente',
      fr: 'Échantillon vocal pour {emotion} supprimé avec succès',
      de: 'Stimmprobe für {emotion} erfolgreich gelöscht',
      ja: '{emotion}のボイスサンプルが正常に削除されました',
      zh: '{emotion}的语音样本删除成功',
      ko: '{emotion} 음성 샘플이 성功적으로 삭제되었습니다'
    }
  },

  // Progress Messages
  VOICE_CLONING_PROGRESS: {
    code: 'VOICE_CLONING_PROGRESS',
    type: 'info',
    severity: 'low',
    variables: ['category', 'progress', 'samplesCount'],
    templates: {
      en: 'Voice cloning for {category} is {progress}% complete with {samplesCount} samples',
      es: 'La clonación de voz para {category} está {progress}% completa con {samplesCount} muestras',
      fr: 'Le clonage vocal pour {category} est {progress}% terminé avec {samplesCount} échantillons',
      de: 'Stimmklonen für {category} ist {progress}% abgeschlossen mit {samplesCount} Proben',
      ja: '{category}のボイスクローニングは{samplesCount}個のサンプルで{progress}%完了しています',
      zh: '{category}的语音克隆已完成{progress}%，使用了{samplesCount}个样本',
      ko: '{category}의 음성 복제가 {samplesCount}개 샘플로 {progress}% 완료되었습니다'
    }
  }
};

/**
 * Template interpolation utility
 * Replaces {variable} placeholders with actual values
 */
function interpolateTemplate(template: string, variables: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = variables[key];
    if (value === undefined || value === null) {
      console.warn(`Missing variable "${key}" for template interpolation`);
      return match; // Keep the placeholder if variable is missing
    }
    return String(value);
  });
}

/**
 * Dynamic message generation with template interpolation
 */
export function getDynamicMessage(
  messageCode: string,
  variables: Record<string, string | number> = {},
  language: Language = 'en'
): { message: string; type: MessageType; severity: MessageSeverity } {
  const template = MESSAGE_TEMPLATES[messageCode];
  
  if (!template) {
    console.error(`Missing message template for code: ${messageCode}`);
    return {
      message: `[${messageCode}]`,
      type: 'error',
      severity: 'medium'
    };
  }

  // Validate required variables
  const missingVars = template.variables.filter(varName => !(varName in variables));
  if (missingVars.length > 0) {
    console.warn(`Missing required variables for ${messageCode}:`, missingVars);
  }

  // Get template for language (fallback to English)
  const messageTemplate = template.templates[language] || template.templates.en;
  
  // Interpolate variables into template
  const interpolatedMessage = interpolateTemplate(messageTemplate, variables);

  return {
    message: interpolatedMessage,
    type: template.type,
    severity: template.severity
  };
}

/**
 * Voice-specific message utilities
 */
export class VoiceMessageService {
  private static defaultLanguage: Language = 'en';

  static setLanguage(language: Language) {
    this.defaultLanguage = language;
  }

  static voiceSaveFailed(emotion: string, category: string, language?: Language) {
    return getDynamicMessage('VOICE_SAVE_FAILED', { emotion, category }, language || this.defaultLanguage);
  }

  static voiceDeleteFailed(emotion: string, language?: Language) {
    return getDynamicMessage('VOICE_DELETE_FAILED', { emotion }, language || this.defaultLanguage);
  }

  static voiceCloningTriggerFailed(category: string, samplesCount: number, language?: Language) {
    return getDynamicMessage('VOICE_CLONING_TRIGGER_FAILED', { category, samplesCount: String(samplesCount) }, language || this.defaultLanguage);
  }

  static voiceSaved(userName: string, emotion: string, category: string, language?: Language) {
    return getDynamicMessage('VOICE_SAVED', { userName, emotion, category }, language || this.defaultLanguage);
  }

  static voiceDeleted(emotion: string, language?: Language) {
    return getDynamicMessage('VOICE_DELETED', { emotion }, language || this.defaultLanguage);
  }

  static voiceCloningProgress(category: string, progress: number, samplesCount: number, language?: Language) {
    return getDynamicMessage('VOICE_CLONING_PROGRESS', { 
      category, 
      progress: String(progress), 
      samplesCount: String(samplesCount) 
    }, language || this.defaultLanguage);
  }
}

/**
 * Story-specific message utilities
 */
export class StoryMessageService {
  private static defaultLanguage: Language = 'en';

  static setLanguage(language: Language) {
    this.defaultLanguage = language;
  }

  static storySaveFailed(storyTitle: string, userName: string, language?: Language) {
    return getDynamicMessage('STORY_SAVE_FAILED', { storyTitle, userName }, language || this.defaultLanguage);
  }

  static storyAnalysisFailed(storyTitle: string, errorReason: string, language?: Language) {
    return getDynamicMessage('STORY_ANALYSIS_FAILED', { storyTitle, errorReason }, language || this.defaultLanguage);
  }
}

/**
 * Audio-specific message utilities
 */
export class AudioMessageService {
  private static defaultLanguage: Language = 'en';

  static setLanguage(language: Language) {
    this.defaultLanguage = language;
  }

  static noSpeechDetected(fileName: string, language?: Language) {
    return getDynamicMessage('NO_SPEECH_DETECTED', { fileName }, language || this.defaultLanguage);
  }

  static fileTooLarge(fileName: string, fileSize: string, maxSize: string, language?: Language) {
    return getDynamicMessage('FILE_TOO_LARGE', { fileName, fileSize, maxSize }, language || this.defaultLanguage);
  }
}

/**
 * User-specific message utilities
 */
export class UserMessageService {
  private static defaultLanguage: Language = 'en';

  static setLanguage(language: Language) {
    this.defaultLanguage = language;
  }

  static authFailed(userName: string, provider: string, language?: Language) {
    return getDynamicMessage('USER_AUTH_FAILED', { userName, provider }, language || this.defaultLanguage);
  }
}

/**
 * Legacy compatibility functions (deprecated - use service classes instead)
 */
export function getErrorMessage(errorCode: string, language: Language = 'en'): string {
  console.warn('getErrorMessage is deprecated. Use service classes instead.');
  return getDynamicMessage(errorCode, {}, language).message;
}

export function getSuccessMessage(successCode: string, language: Language = 'en'): string {
  console.warn('getSuccessMessage is deprecated. Use service classes instead.');
  return getDynamicMessage(successCode, {}, language).message;
}

export function getUILabel(labelCode: string, language: Language = 'en'): string {
  console.warn('getUILabel is deprecated. Use service classes instead.');
  return getDynamicMessage(labelCode, {}, language).message;
}

/**
 * Current language configuration
 */
export const I18N_CONFIG = {
  defaultLanguage: 'en' as Language,
  supportedLanguages: ['en', 'es', 'fr', 'de', 'ja', 'zh', 'ko'] as Language[],
  fallbackLanguage: 'en' as Language
};