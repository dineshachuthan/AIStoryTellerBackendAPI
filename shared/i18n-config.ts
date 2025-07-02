/**
 * Internationalization Configuration
 * Language-specific messages with standard error codes for multi-language support
 */

export type Language = 'en' | 'es' | 'fr' | 'de' | 'ja' | 'zh' | 'ko';

export interface I18nMessage {
  code: string;
  en: string;
  es?: string;
  fr?: string;
  de?: string;
  ja?: string;
  zh?: string;
  ko?: string;
}

export const ERROR_MESSAGES: Record<string, I18nMessage> = {
  VOICE_SAVE_FAILED: {
    code: 'VOICE_SAVE_FAILED',
    en: 'Failed to save voice modulation',
    es: 'Error al guardar la modulación de voz',
    fr: 'Échec de la sauvegarde de la modulation vocale',
    de: 'Fehler beim Speichern der Stimmmodulation',
    ja: 'ボイスモジュレーションの保存に失敗しました',
    zh: '语音调制保存失败',
    ko: '음성 변조 저장에 실패했습니다'
  },
  
  VOICE_DELETE_FAILED: {
    code: 'VOICE_DELETE_FAILED',
    en: 'Failed to delete voice modulation',
    es: 'Error al eliminar la modulación de voz',
    fr: 'Échec de la suppression de la modulation vocale',
    de: 'Fehler beim Löschen der Stimmmodulation',
    ja: 'ボイスモジュレーションの削除に失敗しました',
    zh: '语音调制删除失败',
    ko: '음성 변조 삭제에 실패했습니다'
  },

  VOICE_CLONING_TRIGGER_FAILED: {
    code: 'VOICE_CLONING_TRIGGER_FAILED',
    en: 'Failed to trigger voice cloning',
    es: 'Error al activar la clonación de voz',
    fr: 'Échec du déclenchement du clonage vocal',
    de: 'Fehler beim Auslösen des Stimmklonens',
    ja: 'ボイスクローニングのトリガーに失敗しました',
    zh: '语音克隆触发失败',
    ko: '음성 복제 트리거에 실패했습니다'
  },

  NO_SPEECH_DETECTED: {
    code: 'NO_SPEECH_DETECTED',
    en: 'No clear speech was detected in your audio recording. Please ensure you speak clearly and loudly enough, and try again.',
    es: 'No se detectó un discurso claro en su grabación de audio. Asegúrese de hablar con claridad y suficientemente alto, e inténtelo de nuevo.',
    fr: 'Aucun discours clair n\'a été détecté dans votre enregistrement audio. Veuillez vous assurer de parler clairement et assez fort, puis réessayez.',
    de: 'In Ihrer Audioaufnahme wurde keine klare Sprache erkannt. Bitte stellen Sie sicher, dass Sie klar und laut genug sprechen, und versuchen Sie es erneut.',
    ja: 'オーディオ録音で明確な音声が検出されませんでした。はっきりと十分な音量で話していることを確認して、もう一度お試しください。',
    zh: '在您的音频录音中未检测到清晰的语音。请确保您说话清晰且音量足够大，然后重试。',
    ko: '오디오 녹음에서 명확한 음성이 감지되지 않았습니다. 명확하고 충분히 큰 소리로 말하는지 확인한 후 다시 시도하세요.'
  },

  FILE_TOO_LARGE: {
    code: 'FILE_TOO_LARGE',
    en: 'Audio file is too large. Please upload a file smaller than 25MB.',
    es: 'El archivo de audio es demasiado grande. Por favor, suba un archivo menor de 25MB.',
    fr: 'Le fichier audio est trop volumineux. Veuillez télécharger un fichier de moins de 25 Mo.',
    de: 'Die Audiodatei ist zu groß. Bitte laden Sie eine Datei kleiner als 25 MB hoch.',
    ja: 'オーディオファイルが大きすぎます。25MB未満のファイルをアップロードしてください。',
    zh: '音频文件太大。请上传小于25MB的文件。',
    ko: '오디오 파일이 너무 큽니다. 25MB보다 작은 파일을 업로드하세요.'
  },

  UNSUPPORTED_FORMAT: {
    code: 'UNSUPPORTED_FORMAT',
    en: 'Unsupported audio format. Please use one of: WAV, MP3, M4A, OGG, FLAC, or WebM.',
    es: 'Formato de audio no compatible. Por favor, use uno de: WAV, MP3, M4A, OGG, FLAC o WebM.',
    fr: 'Format audio non pris en charge. Veuillez utiliser l\'un des formats suivants : WAV, MP3, M4A, OGG, FLAC ou WebM.',
    de: 'Nicht unterstütztes Audioformat. Bitte verwenden Sie eines der folgenden Formate: WAV, MP3, M4A, OGG, FLAC oder WebM.',
    ja: 'サポートされていないオーディオ形式です。WAV、MP3、M4A、OGG、FLAC、またはWebMのいずれかを使用してください。',
    zh: '不支持的音频格式。请使用以下格式之一：WAV、MP3、M4A、OGG、FLAC或WebM。',
    ko: '지원되지 않는 오디오 형식입니다. WAV, MP3, M4A, OGG, FLAC 또는 WebM 중 하나를 사용하세요.'
  }
};

export const SUCCESS_MESSAGES: Record<string, I18nMessage> = {
  VOICE_SAVED: {
    code: 'VOICE_SAVED',
    en: 'Voice sample saved successfully',
    es: 'Muestra de voz guardada exitosamente',
    fr: 'Échantillon vocal sauvegardé avec succès',
    de: 'Stimmprobe erfolgreich gespeichert',
    ja: 'ボイスサンプルが正常に保存されました',
    zh: '语音样本保存成功',
    ko: '음성 샘플이 성공적으로 저장되었습니다'
  },

  VOICE_DELETED: {
    code: 'VOICE_DELETED',
    en: 'Voice sample deleted successfully',
    es: 'Muestra de voz eliminada exitosamente',
    fr: 'Échantillon vocal supprimé avec succès',
    de: 'Stimmprobe erfolgreich gelöscht',
    ja: 'ボイスサンプルが正常に削除されました',
    zh: '语音样本删除成功',
    ko: '음성 샘플이 성공적으로 삭제되었습니다'
  }
};

export const UI_LABELS: Record<string, I18nMessage> = {
  EMOTIONS: {
    code: 'EMOTIONS',
    en: 'Emotions',
    es: 'Emociones',
    fr: 'Émotions',
    de: 'Emotionen',
    ja: '感情',
    zh: '情感',
    ko: '감정'
  },

  SOUNDS: {
    code: 'SOUNDS',
    en: 'Sounds',
    es: 'Sonidos',
    fr: 'Sons',
    de: 'Geräusche',
    ja: '音',
    zh: '声音',
    ko: '소리'
  },

  MODULATIONS: {
    code: 'MODULATIONS',
    en: 'Modulations',
    es: 'Modulaciones',
    fr: 'Modulations',
    de: 'Modulationen',
    ja: 'モジュレーション',
    zh: '调制',
    ko: '변조'
  }
};

/**
 * Get localized message by code and language
 */
export function getMessage(
  messageCode: string, 
  language: Language = 'en', 
  category: 'error' | 'success' | 'ui' = 'error'
): string {
  const messageMap = category === 'error' ? ERROR_MESSAGES : 
                   category === 'success' ? SUCCESS_MESSAGES : 
                   UI_LABELS;
  
  const message = messageMap[messageCode];
  if (!message) {
    console.warn(`Missing message for code: ${messageCode}`);
    return `[${messageCode}]`;
  }

  return message[language] || message.en;
}

/**
 * Get error message with fallback to English
 */
export function getErrorMessage(errorCode: string, language: Language = 'en'): string {
  return getMessage(errorCode, language, 'error');
}

/**
 * Get success message with fallback to English
 */
export function getSuccessMessage(successCode: string, language: Language = 'en'): string {
  return getMessage(successCode, language, 'success');
}

/**
 * Get UI label with fallback to English
 */
export function getUILabel(labelCode: string, language: Language = 'en'): string {
  return getMessage(labelCode, language, 'ui');
}

/**
 * Current language configuration
 */
export const I18N_CONFIG = {
  defaultLanguage: 'en' as Language,
  supportedLanguages: ['en', 'es', 'fr', 'de', 'ja', 'zh', 'ko'] as Language[],
  fallbackLanguage: 'en' as Language
};