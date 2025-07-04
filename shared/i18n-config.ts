/**
 * Dynamic Internationalization Configuration
 * Template-based messages with variable interpolation for multi-language support
 */

import { getCurrentUserLanguage, type Language } from './language-config';

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
  // Navigation and Common UI Labels
  'NAV_HOME': {
    code: 'NAV_HOME',
    type: 'info',
    severity: 'low',
    variables: [],
    templates: {
      en: 'Home',
      es: 'Inicio',
      fr: 'Accueil',
      de: 'Startseite',
      ja: 'ホーム',
      zh: '首页',
      ko: '홈'
    }
  },
  'NAV_STORIES': {
    code: 'NAV_STORIES',
    type: 'info',
    severity: 'low',
    variables: [],
    templates: {
      en: 'Stories',
      es: 'Historias',
      fr: 'Histoires',
      de: 'Geschichten',
      ja: 'ストーリー',
      zh: '故事',
      ko: '스토리'
    }
  },
  'NAV_VOICE_SAMPLES': {
    code: 'NAV_VOICE_SAMPLES',
    type: 'info',
    severity: 'low',
    variables: [],
    templates: {
      en: 'Voice Samples',
      es: 'Muestras de Voz',
      fr: 'Échantillons Vocaux',
      de: 'Sprachproben',
      ja: '音声サンプル',
      zh: '语音样本',
      ko: '음성 샘플'
    }
  },
  'NAV_LIBRARY': {
    code: 'NAV_LIBRARY',
    type: 'info',
    severity: 'low',
    variables: [],
    templates: {
      en: 'Library',
      es: 'Biblioteca',
      fr: 'Bibliothèque',
      de: 'Bibliothek',
      ja: 'ライブラリ',
      zh: '图书馆',
      ko: '라이브러리'
    }
  },
  'NAV_PROFILE': {
    code: 'NAV_PROFILE',
    type: 'info',
    severity: 'low',
    variables: [],
    templates: {
      en: 'Profile',
      es: 'Perfil',
      fr: 'Profil',
      de: 'Profil',
      ja: 'プロフィール',
      zh: '个人资料',
      ko: '프로필'
    }
  },

  // Story related labels
  'STORY_CREATE_TITLE': {
    code: 'STORY_CREATE_TITLE',
    type: 'info',
    severity: 'low',
    variables: [],
    templates: {
      en: 'Create Story',
      es: 'Crear Historia',
      fr: 'Créer une Histoire',
      de: 'Geschichte Erstellen',
      ja: 'ストーリーを作成',
      zh: '创建故事',
      ko: '스토리 만들기'
    }
  },
  'STORY_EDIT_TITLE': {
    code: 'STORY_EDIT_TITLE',
    type: 'info',
    severity: 'low',
    variables: [],
    templates: {
      en: 'Edit Story',
      es: 'Editar Historia',
      fr: 'Modifier l\'Histoire',
      de: 'Geschichte Bearbeiten',
      ja: 'ストーリーを編集',
      zh: '编辑故事',
      ko: '스토리 편집'
    }
  },
  'STORY_TITLE_PLACEHOLDER': {
    code: 'STORY_TITLE_PLACEHOLDER',
    type: 'info',
    severity: 'low',
    variables: [],
    templates: {
      en: 'Enter your story title...',
      es: 'Ingresa el título de tu historia...',
      fr: 'Saisissez le titre de votre histoire...',
      de: 'Geben Sie Ihren Geschichtentitel ein...',
      ja: 'ストーリーのタイトルを入力...',
      zh: '输入您的故事标题...',
      ko: '스토리 제목을 입력하세요...'
    }
  },
  'STORY_CONTENT_PLACEHOLDER': {
    code: 'STORY_CONTENT_PLACEHOLDER',
    type: 'info',
    severity: 'low',
    variables: [],
    templates: {
      en: 'Write your story here...',
      es: 'Escribe tu historia aquí...',
      fr: 'Écrivez votre histoire ici...',
      de: 'Schreiben Sie Ihre Geschichte hier...',
      ja: 'ここにストーリーを書いてください...',
      zh: '在此处写下您的故事...',
      ko: '여기에 스토리를 작성하세요...'
    }
  },

  // Button labels
  'BTN_SAVE': {
    code: 'BTN_SAVE',
    type: 'info',
    severity: 'low',
    variables: [],
    templates: {
      en: 'Save',
      es: 'Guardar',
      fr: 'Enregistrer',
      de: 'Speichern',
      ja: '保存',
      zh: '保存',
      ko: '저장'
    }
  },
  'BTN_CANCEL': {
    code: 'BTN_CANCEL',
    type: 'info',
    severity: 'low',
    variables: [],
    templates: {
      en: 'Cancel',
      es: 'Cancelar',
      fr: 'Annuler',
      de: 'Abbrechen',
      ja: 'キャンセル',
      zh: '取消',
      ko: '취소'
    }
  },
  'BTN_EDIT': {
    code: 'BTN_EDIT',
    type: 'info',
    severity: 'low',
    variables: [],
    templates: {
      en: 'Edit',
      es: 'Editar',
      fr: 'Modifier',
      de: 'Bearbeiten',
      ja: '編集',
      zh: '编辑',
      ko: '편집'
    }
  },
  'BTN_DELETE': {
    code: 'BTN_DELETE',
    type: 'error',
    severity: 'medium',
    variables: [],
    templates: {
      en: 'Delete',
      es: 'Eliminar',
      fr: 'Supprimer',
      de: 'Löschen',
      ja: '削除',
      zh: '删除',
      ko: '삭제'
    }
  },
  'BTN_UPLOAD': {
    code: 'BTN_UPLOAD',
    type: 'info',
    severity: 'low',
    variables: [],
    templates: {
      en: 'Upload',
      es: 'Subir',
      fr: 'Télécharger',
      de: 'Hochladen',
      ja: 'アップロード',
      zh: '上传',
      ko: '업로드'
    }
  },
  'BTN_RECORD': {
    code: 'BTN_RECORD',
    type: 'info',
    severity: 'low',
    variables: [],
    templates: {
      en: 'Record',
      es: 'Grabar',
      fr: 'Enregistrer',
      de: 'Aufnehmen',
      ja: '録音',
      zh: '录音',
      ko: '녹음'
    }
  },
  'BTN_PLAY': {
    code: 'BTN_PLAY',
    type: 'info',
    severity: 'low',
    variables: [],
    templates: {
      en: 'Play',
      es: 'Reproducir',
      fr: 'Jouer',
      de: 'Abspielen',
      ja: '再生',
      zh: '播放',
      ko: '재생'
    }
  },
  'BTN_STOP': {
    code: 'BTN_STOP',
    type: 'info',
    severity: 'low',
    variables: [],
    templates: {
      en: 'Stop',
      es: 'Detener',
      fr: 'Arrêter',
      de: 'Stoppen',
      ja: '停止',
      zh: '停止',
      ko: '정지'
    }
  },

  // Audio related labels
  'AUDIO_PROCESSED_TITLE': {
    code: 'AUDIO_PROCESSED_TITLE',
    type: 'success',
    severity: 'low',
    variables: [],
    templates: {
      en: 'Audio Processed Successfully',
      es: 'Audio Procesado Exitosamente',
      fr: 'Audio Traité avec Succès',
      de: 'Audio Erfolgreich Verarbeitet',
      ja: 'オーディオの処理が完了しました',
      zh: '音频处理成功',
      ko: '오디오 처리 완료'
    }
  },
  'AUDIO_PROCESSED_DESC': {
    code: 'AUDIO_PROCESSED_DESC',
    type: 'success',
    severity: 'low',
    variables: ['characters'],
    templates: {
      en: 'Your audio has been converted to text ({characters} characters).',
      es: 'Tu audio se ha convertido en texto ({characters} caracteres).',
      fr: 'Votre audio a été converti en texte ({characters} caractères).',
      de: 'Ihr Audio wurde in Text umgewandelt ({characters} Zeichen).',
      ja: 'オーディオがテキストに変換されました（{characters}文字）。',
      zh: '您的音频已转换为文本（{characters} 个字符）。',
      ko: '오디오가 텍스트로 변환되었습니다 ({characters}자).'
    }
  },
  'AUDIO_RECORDING_INSTRUCTION': {
    code: 'AUDIO_RECORDING_INSTRUCTION',
    type: 'info',
    severity: 'low',
    variables: [],
    templates: {
      en: 'Hold to record',
      es: 'Mantén presionado para grabar',
      fr: 'Maintenez pour enregistrer',
      de: 'Halten zum Aufnehmen',
      ja: '録音するには長押し',
      zh: '按住录音',
      ko: '녹음하려면 길게 누르세요'
    }
  },
  'AUDIO_RECORDING_STOP': {
    code: 'AUDIO_RECORDING_STOP',
    type: 'info',
    severity: 'low',
    variables: [],
    templates: {
      en: 'Release to stop',
      es: 'Suelta para detener',
      fr: 'Relâchez pour arrêter',
      de: 'Loslassen zum Stoppen',
      ja: '停止するには離す',
      zh: '松开停止',
      ko: '놓으면 정지'
    }
  },

  // Status and progress labels
  'STATUS_LOADING': {
    code: 'STATUS_LOADING',
    type: 'info',
    severity: 'low',
    variables: [],
    templates: {
      en: 'Loading...',
      es: 'Cargando...',
      fr: 'Chargement...',
      de: 'Lädt...',
      ja: '読み込み中...',
      zh: '加载中...',
      ko: '로딩 중...'
    }
  },
  'STATUS_PROCESSING': {
    code: 'STATUS_PROCESSING',
    type: 'info',
    severity: 'low',
    variables: [],
    templates: {
      en: 'Processing...',
      es: 'Procesando...',
      fr: 'Traitement...',
      de: 'Verarbeitung...',
      ja: '処理中...',
      zh: '处理中...',
      ko: '처리 중...'
    }
  },
  'STATUS_COMPLETED': {
    code: 'STATUS_COMPLETED',
    type: 'success',
    severity: 'low',
    variables: [],
    templates: {
      en: 'Completed',
      es: 'Completado',
      fr: 'Terminé',
      de: 'Abgeschlossen',
      ja: '完了',
      zh: '已完成',
      ko: '완료됨'
    }
  },
  'STATUS_FAILED': {
    code: 'STATUS_FAILED',
    type: 'error',
    severity: 'medium',
    variables: [],
    templates: {
      en: 'Failed',
      es: 'Falló',
      fr: 'Échoué',
      de: 'Fehlgeschlagen',
      ja: '失敗',
      zh: '失败',
      ko: '실패'
    }
  },

  // Form validation messages
  'FORM_REQUIRED_FIELD': {
    code: 'FORM_REQUIRED_FIELD',
    type: 'error',
    severity: 'medium',
    variables: ['field'],
    templates: {
      en: '{field} is required',
      es: '{field} es requerido',
      fr: '{field} est requis',
      de: '{field} ist erforderlich',
      ja: '{field}は必須です',
      zh: '{field}是必填项',
      ko: '{field}는 필수입니다'
    }
  },
  'FORM_INVALID_EMAIL': {
    code: 'FORM_INVALID_EMAIL',
    type: 'error',
    severity: 'medium',
    variables: [],
    templates: {
      en: 'Please enter a valid email address',
      es: 'Por favor, ingresa un email válido',
      fr: 'Veuillez saisir une adresse e-mail valide',
      de: 'Bitte geben Sie eine gültige E-Mail-Adresse ein',
      ja: '有効なメールアドレスを入力してください',
      zh: '请输入有效的电子邮件地址',
      ko: '유효한 이메일 주소를 입력하세요'
    }
  },
  'FORM_MIN_LENGTH': {
    code: 'FORM_MIN_LENGTH',
    type: 'error',
    severity: 'medium',
    variables: ['field', 'min'],
    templates: {
      en: '{field} must be at least {min} characters',
      es: '{field} debe tener al menos {min} caracteres',
      fr: '{field} doit contenir au moins {min} caractères',
      de: '{field} muss mindestens {min} Zeichen haben',
      ja: '{field}は最低{min}文字必要です',
      zh: '{field}必须至少包含{min}个字符',
      ko: '{field}은 최소 {min}자 이상이어야 합니다'
    }
  },

  // Time and date labels
  'TIME_JUST_NOW': {
    code: 'TIME_JUST_NOW',
    type: 'info',
    severity: 'low',
    variables: [],
    templates: {
      en: 'Just now',
      es: 'Justo ahora',
      fr: 'À l\'instant',
      de: 'Gerade eben',
      ja: 'たった今',
      zh: '刚刚',
      ko: '방금'
    }
  },
  'TIME_MINUTES_AGO': {
    code: 'TIME_MINUTES_AGO',
    type: 'info',
    severity: 'low',
    variables: ['minutes'],
    templates: {
      en: '{minutes} minutes ago',
      es: 'hace {minutes} minutos',
      fr: 'il y a {minutes} minutes',
      de: 'vor {minutes} Minuten',
      ja: '{minutes}分前',
      zh: '{minutes}分钟前',
      ko: '{minutes}분 전'
    }
  },
  'TIME_HOURS_AGO': {
    code: 'TIME_HOURS_AGO',
    type: 'info',
    severity: 'low',
    variables: ['hours'],
    templates: {
      en: '{hours} hours ago',
      es: 'hace {hours} horas',
      fr: 'il y a {hours} heures',
      de: 'vor {hours} Stunden',
      ja: '{hours}時間前',
      zh: '{hours}小时前',
      ko: '{hours}시간 전'
    }
  },
  'TIME_DAYS_AGO': {
    code: 'TIME_DAYS_AGO',
    type: 'info',
    severity: 'low',
    variables: ['days'],
    templates: {
      en: '{days} days ago',
      es: 'hace {days} días',
      fr: 'il y a {days} jours',
      de: 'vor {days} Tagen',
      ja: '{days}日前',
      zh: '{days}天前',
      ko: '{days}일 전'
    }
  },

  // Voice cloning specific labels
  'VOICE_CLONING_TITLE': {
    code: 'VOICE_CLONING_TITLE',
    type: 'info',
    severity: 'low',
    variables: [],
    templates: {
      en: 'Voice Cloning',
      es: 'Clonación de Voz',
      fr: 'Clonage Vocal',
      de: 'Stimm-Kloning',
      ja: 'ボイスクローニング',
      zh: '语音克隆',
      ko: '음성 복제'
    }
  },
  'VOICE_TRAINING_PROGRESS': {
    code: 'VOICE_TRAINING_PROGRESS',
    type: 'info',
    severity: 'low',
    variables: ['progress'],
    templates: {
      en: 'Training Progress: {progress}%',
      es: 'Progreso de Entrenamiento: {progress}%',
      fr: 'Progression de l\'Entraînement: {progress}%',
      de: 'Trainingsfortschritt: {progress}%',
      ja: 'トレーニング進捗: {progress}%',
      zh: '训练进度: {progress}%',
      ko: '훈련 진행률: {progress}%'
    }
  },
  'VOICE_SAMPLES_NEEDED': {
    code: 'VOICE_SAMPLES_NEEDED',
    type: 'info',
    severity: 'low',
    variables: ['needed'],
    templates: {
      en: '{needed} more samples needed',
      es: 'Se necesitan {needed} muestras más',
      fr: '{needed} échantillons supplémentaires nécessaires',
      de: '{needed} weitere Proben benötigt',
      ja: 'あと{needed}個のサンプルが必要',
      zh: '还需要{needed}个样本',
      ko: '{needed}개의 샘플이 더 필요합니다'
    }
  },
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
  },

  // Voice Cloning Button Labels
  CNV_BUTTON_LABEL: {
    code: 'CNV_BUTTON_LABEL',
    type: 'info',
    severity: 'low',
    variables: [],
    templates: {
      en: 'Create Narrator Voice',
      es: 'Crear Voz del Narrador',
      fr: 'Créer la Voix du Narrateur',
      de: 'Erzählerstimme Erstellen',
      ja: 'ナレーター音声を作成',
      zh: '创建叙述者声音',
      ko: '나레이터 음성 생성'
    }
  },

  CNV_INSUFFICIENT_SAMPLES: {
    code: 'CNV_INSUFFICIENT_SAMPLES',
    type: 'warning',
    severity: 'medium',
    variables: ['needed'],
    templates: {
      en: 'Record {needed} more voice samples to create narrator voice',
      es: 'Graba {needed} muestras de voz más para crear la voz del narrador',
      fr: 'Enregistrez {needed} échantillons vocaux supplémentaires pour créer la voix du narrateur',
      de: 'Nehmen Sie {needed} weitere Stimmproben auf, um die Erzählerstimme zu erstellen',
      ja: 'ナレーター音声を作成するためにあと{needed}個の音声サンプルを録音してください',
      zh: '再录制{needed}个语音样本以创建叙述者声音',
      ko: '나레이터 음성을 생성하려면 {needed}개의 음성 샘플을 더 녹음하세요'
    }
  },

  CNV_IN_PROGRESS: {
    code: 'CNV_IN_PROGRESS',
    type: 'info',
    severity: 'low',
    variables: [],
    templates: {
      en: 'Voice cloning in progress...',
      es: 'Clonación de voz en progreso...',
      fr: 'Clonage vocal en cours...',
      de: 'Stimmklonen läuft...',
      ja: 'ボイスクローニング進行中...',
      zh: '语音克隆进行中...',
      ko: '음성 복제 진행 중...'
    }
  },

  CNV_READY: {
    code: 'CNV_READY',
    type: 'success',
    severity: 'low',
    variables: [],
    templates: {
      en: 'Narrator Voice Ready',
      es: 'Voz del Narrador Lista',
      fr: 'Voix du Narrateur Prête',
      de: 'Erzählerstimme Bereit',
      ja: 'ナレーター音声準備完了',
      zh: '叙述者声音已准备就绪',
      ko: '나레이터 음성 준비 완료'
    }
  },

  // Story Privacy Tooltips
  STORY_PRIVATE_TOOLTIP: {
    code: 'STORY_PRIVATE_TOOLTIP',
    type: 'info',
    severity: 'low',
    variables: [],
    templates: {
      en: 'Private story - only visible to you',
      es: 'Historia privada - solo visible para ti',
      fr: 'Histoire privée - visible seulement pour vous',
      de: 'Private Geschichte - nur für Sie sichtbar',
      ja: 'プライベートストーリー - あなたにのみ表示',
      zh: '私人故事 - 仅对您可见',
      ko: '비공개 이야기 - 본인만 볼 수 있음'
    }
  },

  STORY_PUBLIC_TOOLTIP: {
    code: 'STORY_PUBLIC_TOOLTIP',
    type: 'info',
    severity: 'low',
    variables: [],
    templates: {
      en: 'Published story - visible to all users',
      es: 'Historia publicada - visible para todos los usuarios',
      fr: 'Histoire publiée - visible par tous les utilisateurs',
      de: 'Veröffentlichte Geschichte - für alle Nutzer sichtbar',
      ja: '公開されたストーリー - すべてのユーザーに表示',
      zh: '已发布的故事 - 对所有用户可见',
      ko: '게시된 이야기 - 모든 사용자에게 표시'
    }
  },

  // Audio Processing Messages
  AUDIO_PROCESSING_FAILED: {
    code: 'AUDIO_PROCESSING_FAILED',
    type: 'error',
    severity: 'medium',
    variables: [],
    templates: {
      en: 'Audio Processing Failed',
      es: 'Procesamiento de Audio Falló',
      fr: 'Échec du Traitement Audio',
      de: 'Audio-Verarbeitung Fehlgeschlagen',
      ja: 'オーディオ処理が失敗しました',
      zh: '音频处理失败',
      ko: '오디오 처리 실패'
    }
  },

  AUDIO_PROCESSING_FAILED_DESC: {
    code: 'AUDIO_PROCESSING_FAILED_DESC',
    type: 'error',
    severity: 'medium',
    variables: [],
    templates: {
      en: 'Could not process the audio file.',
      es: 'No se pudo procesar el archivo de audio.',
      fr: 'Impossible de traiter le fichier audio.',
      de: 'Die Audiodatei konnte nicht verarbeitet werden.',
      ja: 'オーディオファイルを処理できませんでした。',
      zh: '无法处理音频文件。',
      ko: '오디오 파일을 처리할 수 없습니다.'
    }
  },

  AUDIO_PROCESSING_SUCCESS: {
    code: 'AUDIO_PROCESSING_SUCCESS',
    type: 'success',
    severity: 'low',
    variables: [],
    templates: {
      en: 'Audio Processed Successfully',
      es: 'Audio Procesado Exitosamente',
      fr: 'Audio Traité avec Succès',
      de: 'Audio Erfolgreich Verarbeitet',
      ja: 'オーディオが正常に処理されました',
      zh: '音频处理成功',
      ko: '오디오 처리 성공'
    }
  },

  AUDIO_PROCESSING_SUCCESS_DESC: {
    code: 'AUDIO_PROCESSING_SUCCESS_DESC',
    type: 'success',
    severity: 'low',
    variables: ['characters'],
    templates: {
      en: 'Your audio has been converted to text ({characters} characters).',
      es: 'Su audio ha sido convertido a texto ({characters} caracteres).',
      fr: 'Votre audio a été converti en texte ({characters} caractères).',
      de: 'Ihr Audio wurde in Text umgewandelt ({characters} Zeichen).',
      ja: 'オーディオがテキストに変換されました（{characters}文字）。',
      zh: '您的音频已转换为文本（{characters}个字符）。',
      ko: '오디오가 텍스트로 변환되었습니다（{characters}자）.'
    }
  },

  // Story Validation Messages
  STORY_ID_MISSING: {
    code: 'STORY_ID_MISSING',
    type: 'error',
    severity: 'medium',
    variables: [],
    templates: {
      en: 'No Story ID',
      es: 'No hay ID de Historia',
      fr: 'Aucun ID d\'Histoire',
      de: 'Keine Geschichten-ID',
      ja: 'ストーリーIDがありません',
      zh: '没有故事ID',
      ko: '스토리 ID 없음'
    }
  },

  STORY_ID_MISSING_DESC: {
    code: 'STORY_ID_MISSING_DESC',
    type: 'error',
    severity: 'medium',
    variables: [],
    templates: {
      en: 'Story ID is missing.',
      es: 'El ID de la historia está faltando.',
      fr: 'L\'ID de l\'histoire est manquant.',
      de: 'Die Geschichten-ID fehlt.',
      ja: 'ストーリーIDが不足しています。',
      zh: '故事ID缺失。',
      ko: '스토리 ID가 누락되었습니다.'
    }
  },

  STORY_CONTENT_EMPTY: {
    code: 'STORY_CONTENT_EMPTY',
    type: 'error',
    severity: 'medium',
    variables: [],
    templates: {
      en: 'No Content',
      es: 'Sin Contenido',
      fr: 'Aucun Contenu',
      de: 'Kein Inhalt',
      ja: 'コンテンツなし',
      zh: '没有内容',
      ko: '콘텐츠 없음'
    }
  },

  STORY_CONTENT_EMPTY_DESC: {
    code: 'STORY_CONTENT_EMPTY_DESC',
    type: 'error',
    severity: 'medium',
    variables: [],
    templates: {
      en: 'Please write your story content.',
      es: 'Por favor escribe el contenido de tu historia.',
      fr: 'Veuillez écrire le contenu de votre histoire.',
      de: 'Bitte schreiben Sie Ihren Geschichteninhalt.',
      ja: 'ストーリーの内容を書いてください。',
      zh: '请写下您的故事内容。',
      ko: '스토리 내용을 작성해 주세요.'
    }
  },

  // Story Update Messages
  CONTENT_SAVED: {
    code: 'CONTENT_SAVED',
    type: 'success',
    severity: 'low',
    variables: [],
    templates: {
      en: 'Content Saved',
      es: 'Contenido Guardado',
      fr: 'Contenu Sauvegardé',
      de: 'Inhalt Gespeichert',
      ja: 'コンテンツが保存されました',
      zh: '内容已保存',
      ko: '콘텐츠 저장됨'
    }
  },

  CONTENT_SAVED_DESC: {
    code: 'CONTENT_SAVED_DESC',
    type: 'success',
    severity: 'low',
    variables: [],
    templates: {
      en: 'Your story content has been saved.',
      es: 'El contenido de tu historia ha sido guardado.',
      fr: 'Le contenu de votre histoire a été sauvegardé.',
      de: 'Ihr Geschichteninhalt wurde gespeichert.',
      ja: 'ストーリーの内容が保存されました。',
      zh: '您的故事内容已保存。',
      ko: '스토리 내용이 저장되었습니다.'
    }
  },

  SAVE_FAILED: {
    code: 'SAVE_FAILED',
    type: 'error',
    severity: 'high',
    variables: [],
    templates: {
      en: 'Save Failed',
      es: 'Error al Guardar',
      fr: 'Échec de la Sauvegarde',
      de: 'Speichern Fehlgeschlagen',
      ja: '保存に失敗しました',
      zh: '保存失败',
      ko: '저장 실패'
    }
  },

  SAVE_FAILED_DESC: {
    code: 'SAVE_FAILED_DESC',
    type: 'error',
    severity: 'high',
    variables: [],
    templates: {
      en: 'Could not save story content. Please try again.',
      es: 'No se pudo guardar el contenido de la historia. Por favor, inténtalo de nuevo.',
      fr: 'Impossible de sauvegarder le contenu de l\'histoire. Veuillez réessayer.',
      de: 'Geschichteninhalt konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.',
      ja: 'ストーリーの内容を保存できませんでした。もう一度お試しください。',
      zh: '无法保存故事内容。请重试。',
      ko: '스토리 내용을 저장할 수 없습니다. 다시 시도해 주세요.'
    }
  },

  NO_STORY: {
    code: 'NO_STORY',
    type: 'error',
    severity: 'medium',
    variables: [],
    templates: {
      en: 'No Story',
      es: 'Sin Historia',
      fr: 'Aucune Histoire',
      de: 'Keine Geschichte',
      ja: 'ストーリーなし',
      zh: '没有故事',
      ko: '스토리 없음'
    }
  },

  ANALYSIS_CONTENT_EMPTY_DESC: {
    code: 'ANALYSIS_CONTENT_EMPTY_DESC',
    type: 'error',
    severity: 'medium',
    variables: [],
    templates: {
      en: 'Please add content to your story before analyzing.',
      es: 'Por favor añade contenido a tu historia antes de analizarla.',
      fr: 'Veuillez ajouter du contenu à votre histoire avant d\'analyser.',
      de: 'Bitte fügen Sie Inhalt zu Ihrer Geschichte hinzu, bevor Sie sie analysieren.',
      ja: '分析する前にストーリーにコンテンツを追加してください。',
      zh: '请在分析之前为您的故事添加内容。',
      ko: '분석하기 전에 스토리에 내용을 추가해 주세요.'
    }
  },

  // Upload Story Form Labels
  STORY_TITLE_LABEL: {
    code: 'STORY_TITLE_LABEL',
    type: 'info',
    severity: 'low',
    variables: [],
    templates: {
      en: 'Story Title (Optional)',
      es: 'Título de la Historia (Opcional)',
      fr: 'Titre de l\'Histoire (Facultatif)',
      de: 'Geschichte Titel (Optional)',
      ja: 'ストーリータイトル（任意）',
      zh: '故事标题（可选）',
      ko: '스토리 제목 (선택사항)'
    }
  },

  STORY_TITLE_PLACEHOLDER: {
    code: 'STORY_TITLE_PLACEHOLDER',
    type: 'info',
    severity: 'low',
    variables: [],
    templates: {
      en: 'Enter your story title...',
      es: 'Ingresa el título de tu historia...',
      fr: 'Entrez le titre de votre histoire...',
      de: 'Geben Sie Ihren Geschichtentitel ein...',
      ja: 'ストーリーのタイトルを入力してください...',
      zh: '输入您的故事标题...',
      ko: '스토리 제목을 입력하세요...'
    }
  },

  LANGUAGE_LABEL: {
    code: 'LANGUAGE_LABEL',
    type: 'info',
    severity: 'low',
    variables: [],
    templates: {
      en: 'Language',
      es: 'Idioma',
      fr: 'Langue',
      de: 'Sprache',
      ja: '言語',
      zh: '语言',
      ko: '언어'
    }
  },

  SELECT_LANGUAGE_PLACEHOLDER: {
    code: 'SELECT_LANGUAGE_PLACEHOLDER',
    type: 'info',
    severity: 'low',
    variables: [],
    templates: {
      en: 'Select language',
      es: 'Seleccionar idioma',
      fr: 'Sélectionner la langue',
      de: 'Sprache auswählen',
      ja: '言語を選択',
      zh: '选择语言',
      ko: '언어 선택'
    }
  },

  YOUR_STORY_LABEL: {
    code: 'YOUR_STORY_LABEL',
    type: 'info',
    severity: 'low',
    variables: [],
    templates: {
      en: 'Your Story',
      es: 'Tu Historia',
      fr: 'Votre Histoire',
      de: 'Ihre Geschichte',
      ja: 'あなたのストーリー',
      zh: '您的故事',
      ko: '당신의 스토리'
    }
  },

  PROCESSING_AUDIO: {
    code: 'PROCESSING_AUDIO',
    type: 'info',
    severity: 'low',
    variables: [],
    templates: {
      en: 'Processing your audio...',
      es: 'Procesando tu audio...',
      fr: 'Traitement de votre audio...',
      de: 'Verarbeitung Ihrer Audio...',
      ja: 'オーディオを処理中...',
      zh: '正在处理您的音频...',
      ko: '오디오 처리 중...'
    }
  },

  AUDIO_TRANSCRIPTION_DESC: {
    code: 'AUDIO_TRANSCRIPTION_DESC',
    type: 'info',
    severity: 'low',
    variables: [],
    templates: {
      en: 'Converting speech to text using AI transcription',
      es: 'Convirtiendo voz a texto usando transcripción de IA',
      fr: 'Conversion de la parole en texte utilisant la transcription IA',
      de: 'Sprache zu Text mit KI-Transkription konvertieren',
      ja: 'AI転写を使用して音声をテキストに変換',
      zh: '使用AI转录将语音转换为文本',
      ko: 'AI 전사를 사용하여 음성을 텍스트로 변환'
    }
  },

  STORY_PLACEHOLDER: {
    code: 'STORY_PLACEHOLDER',
    type: 'info',
    severity: 'low',
    variables: [],
    templates: {
      en: 'Write your story here... (500-1000 words recommended)',
      es: 'Escribe tu historia aquí... (500-1000 palabras recomendadas)',
      fr: 'Écrivez votre histoire ici... (500-1000 mots recommandés)',
      de: 'Schreiben Sie Ihre Geschichte hier... (500-1000 Wörter empfohlen)',
      ja: 'ここにストーリーを書いてください...（500-1000語推奨）',
      zh: '在这里写您的故事...（推荐500-1000字）',
      ko: '여기에 스토리를 작성하세요... (500-1000단어 권장)'
    }
  },

  WORD_COUNT: {
    code: 'WORD_COUNT',
    type: 'info',
    severity: 'low',
    variables: ['count'],
    templates: {
      en: 'Word count: {count}',
      es: 'Recuento de palabras: {count}',
      fr: 'Nombre de mots: {count}',
      de: 'Wortanzahl: {count}',
      ja: '単語数: {count}',
      zh: '字数: {count}',
      ko: '단어 수: {count}'
    }
  },

  RECOMMENDED_WORDS: {
    code: 'RECOMMENDED_WORDS',
    type: 'info',
    severity: 'low',
    variables: [],
    templates: {
      en: 'Recommended: 500-1000 words',
      es: 'Recomendado: 500-1000 palabras',
      fr: 'Recommandé: 500-1000 mots',
      de: 'Empfohlen: 500-1000 Wörter',
      ja: '推奨: 500-1000語',
      zh: '推荐: 500-1000字',
      ko: '권장: 500-1000단어'
    }
  },

  STARTING_ANALYSIS: {
    code: 'STARTING_ANALYSIS',
    type: 'info',
    severity: 'low',
    variables: [],
    templates: {
      en: 'Starting Analysis...',
      es: 'Iniciando Análisis...',
      fr: 'Démarrage de l\'Analyse...',
      de: 'Analyse starten...',
      ja: '分析を開始中...',
      zh: '开始分析...',
      ko: '분석 시작 중...'
    }
  },

  ANALYZE_STORY: {
    code: 'ANALYZE_STORY',
    type: 'info',
    severity: 'low',
    variables: [],
    templates: {
      en: 'Analyze Story',
      es: 'Analizar Historia',
      fr: 'Analyser l\'Histoire',
      de: 'Geschichte Analysieren',
      ja: 'ストーリーを分析',
      zh: '分析故事',
      ko: '스토리 분석'
    }
  },

  CREATE_STORY_FROM_HOME: {
    code: 'CREATE_STORY_FROM_HOME',
    type: 'info',
    severity: 'low',
    variables: [],
    templates: {
      en: 'Please create a story from the home page to continue.',
      es: 'Por favor crea una historia desde la página de inicio para continuar.',
      fr: 'Veuillez créer une histoire depuis la page d\'accueil pour continuer.',
      de: 'Bitte erstellen Sie eine Geschichte von der Startseite, um fortzufahren.',
      ja: '続行するにはホームページからストーリーを作成してください。',
      zh: '请从主页创建故事以继续。',
      ko: '계속하려면 홈페이지에서 스토리를 생성해 주세요.'
    }
  },

  GO_TO_HOME: {
    code: 'GO_TO_HOME',
    type: 'info',
    severity: 'low',
    variables: [],
    templates: {
      en: 'Go to Home',
      es: 'Ir al Inicio',
      fr: 'Aller à l\'Accueil',
      de: 'Zur Startseite',
      ja: 'ホームに移動',
      zh: '返回主页',
      ko: '홈으로 이동'
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
  language?: Language
): { message: string; type: MessageType; severity: MessageSeverity } {
  // Use provided language or fall back to current user language from config
  const userLanguage = language || getCurrentUserLanguage();
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
  const messageTemplate = template.templates[userLanguage] || template.templates.en;
  
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

  static getButtonLabel(language?: Language) {
    return getDynamicMessage('CNV_BUTTON_LABEL', {}, language || this.defaultLanguage);
  }

  static getInsufficientSamplesMessage(needed: number, language?: Language) {
    return getDynamicMessage('CNV_INSUFFICIENT_SAMPLES', { needed: String(needed) }, language || this.defaultLanguage);
  }

  static getInProgressMessage(language?: Language) {
    return getDynamicMessage('CNV_IN_PROGRESS', {}, language || this.defaultLanguage);
  }

  static getReadyMessage(language?: Language) {
    return getDynamicMessage('CNV_READY', {}, language || this.defaultLanguage);
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

  static getPrivateTooltip(language?: Language) {
    return getDynamicMessage('STORY_PRIVATE_TOOLTIP', {}, language || this.defaultLanguage);
  }

  static getPublicTooltip(language?: Language) {
    return getDynamicMessage('STORY_PUBLIC_TOOLTIP', {}, language || this.defaultLanguage);
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
 * Common utility function for getting UI messages
 * Agnostic of data source and usable throughout the application
 * @param code - Message code from MESSAGE_TEMPLATES
 * @param type - Type of message (Label, Error, Warning, Title, etc.)
 * @param variables - Variables for template interpolation
 * @param language - Optional language override
 */
export function getUIMessage(
  code: string,
  type: 'Label' | 'Error' | 'Warning' | 'Title' | 'Tooltip' | 'Header' | 'Button' | 'Info' | 'Success',
  variables: Record<string, string | number> = {},
  language: Language = 'en'
): string {
  const template = MESSAGE_TEMPLATES[code];
  if (!template) {
    console.warn(`Missing i18n template for code: ${code}`);
    return `[Missing: ${code}]`;
  }

  const messageTemplate = template.templates[language] || template.templates.en;
  if (!messageTemplate) {
    console.warn(`Missing ${language} translation for code: ${code}`);
    return `[Missing ${language}: ${code}]`;
  }

  return interpolateTemplate(messageTemplate, variables);
}

/**
 * Utility functions for common UI message types
 * These are the recommended functions to use throughout the application
 */
export const UIMessages = {
  /**
   * Get label text (buttons, form fields, navigation items)
   */
  getLabel: (code: string, variables?: Record<string, string | number>, language?: Language) =>
    getUIMessage(code, 'Label', variables, language),
  
  /**
   * Get error messages (validation errors, API failures, system errors)
   */
  getError: (code: string, variables?: Record<string, string | number>, language?: Language) =>
    getUIMessage(code, 'Error', variables, language),
  
  /**
   * Get warning messages (cautions, alerts, non-critical issues)
   */
  getWarning: (code: string, variables?: Record<string, string | number>, language?: Language) =>
    getUIMessage(code, 'Warning', variables, language),
  
  /**
   * Get title text (page titles, modal headers, section headings)
   */
  getTitle: (code: string, variables?: Record<string, string | number>, language?: Language) =>
    getUIMessage(code, 'Title', variables, language),
  
  /**
   * Get tooltip text (hover help, explanatory text)
   */
  getTooltip: (code: string, variables?: Record<string, string | number>, language?: Language) =>
    getUIMessage(code, 'Tooltip', variables, language),
  
  /**
   * Get header text (main headings, section headers)
   */
  getHeader: (code: string, variables?: Record<string, string | number>, language?: Language) =>
    getUIMessage(code, 'Header', variables, language),
  
  /**
   * Get button text (action buttons, submit buttons)
   */
  getButton: (code: string, variables?: Record<string, string | number>, language?: Language) =>
    getUIMessage(code, 'Button', variables, language),
  
  /**
   * Get informational messages (help text, descriptions)
   */
  getInfo: (code: string, variables?: Record<string, string | number>, language?: Language) =>
    getUIMessage(code, 'Info', variables, language),
  
  /**
   * Get success messages (confirmations, completion messages)
   */
  getSuccess: (code: string, variables?: Record<string, string | number>, language?: Language) =>
    getUIMessage(code, 'Success', variables, language)
};

/**
 * Legacy compatibility functions (deprecated - use UIMessages instead)
 */
export function getErrorMessage(errorCode: string, language: Language = 'en'): string {
  console.warn('getErrorMessage is deprecated. Use UIMessages.getError() instead.');
  return getDynamicMessage(errorCode, {}, language).message;
}

export function getSuccessMessage(successCode: string, language: Language = 'en'): string {
  console.warn('getSuccessMessage is deprecated. Use UIMessages.getSuccess() instead.');
  return getDynamicMessage(successCode, {}, language).message;
}

export function getUILabel(labelCode: string, language: Language = 'en'): string {
  console.warn('getUILabel is deprecated. Use UIMessages.getLabel() instead.');
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