/**
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
    ta?: string;
  };
}

/**
 * Hierarchical message structure organized by feature/page
 */
export const MESSAGES = {
  // Error Codes
  errors: {
    api: {
      fallback_provider_needed: {
        code: 1001,
        type: 'error' as MessageType,
        severity: 'high' as MessageSeverity,
        templates: {
          en: 'Primary provider failed. Alternative provider needed.',
          ta: 'முதன்மை வழங்குநர் தோல்வியுற்றார். மாற்று வழங்குநர் தேவை.'
        }
      },
      voice_cloning_failed: {
        code: 1002,
        type: 'error' as MessageType,
        severity: 'high' as MessageSeverity,
        templates: {
          en: 'Voice cloning failed. Please try again.',
          ta: 'குரல் நகலெடுத்தல் தோல்வியுற்றது. மீண்டும் முயற்சிக்கவும்.'
        }
      },
      video_generation_failed: {
        code: 1003,
        type: 'error' as MessageType,
        severity: 'high' as MessageSeverity,
        templates: {
          en: 'Video generation failed. Please try again.',
          ta: 'வீடியோ உருவாக்கம் தோல்வியுற்றது. மீண்டும் முயற்சிக்கவும்.'
        }
      },
      provider_not_available: {
        code: 1004,
        type: 'error' as MessageType,
        severity: 'high' as MessageSeverity,
        templates: {
          en: 'Provider not available: {provider}',
          ta: 'வழங்குநர் கிடைக்கவில்லை: {provider}'
        },
        variables: ['provider']
      },
      api_rate_limit: {
        code: 1005,
        type: 'error' as MessageType,
        severity: 'medium' as MessageSeverity,
        templates: {
          en: 'API rate limit exceeded. Please try again later.',
          ta: 'API வரம்பு மீறப்பட்டது. பின்னர் முயற்சிக்கவும்.'
        }
      },
      invalid_api_key: {
        code: 1006,
        type: 'error' as MessageType,
        severity: 'critical' as MessageSeverity,
        templates: {
          en: 'Invalid API key for provider: {provider}',
          ta: 'தவறான API சாவி: {provider}'
        },
        variables: ['provider']
      },
      insufficient_samples: {
        code: 1007,
        type: 'error' as MessageType,
        severity: 'medium' as MessageSeverity,
        templates: {
          en: 'Insufficient voice samples. Need at least {minimum} samples.',
          ta: 'போதுமான குரல் மாதிரிகள் இல்லை. குறைந்தது {minimum} மாதிரிகள் தேவை.'
        },
        variables: ['minimum']
      },
      narration_generation_failed: {
        code: 1008,
        type: 'error' as MessageType,
        severity: 'high' as MessageSeverity,
        templates: {
          en: 'Story narration generation failed.',
          ta: 'கதை விவரிப்பு உருவாக்கம் தோல்வியுற்றது.'
        }
      },
      subscription_limit_reached: {
        code: 1009,
        type: 'error' as MessageType,
        severity: 'medium' as MessageSeverity,
        templates: {
          en: 'Subscription limit reached for {feature}',
          ta: 'சந்தா வரம்பு எட்டப்பட்டது: {feature}'
        },
        variables: ['feature']
      },
      authentication_required: {
        code: 1010,
        type: 'error' as MessageType,
        severity: 'high' as MessageSeverity,
        templates: {
          en: 'Authentication required to access this feature.',
          ta: 'இந்த அம்சத்தை அணுக அங்கீகாரம் தேவை.'
        }
      },
      // Validation errors
      validation_failed: {
        code: 2001,
        type: 'error' as MessageType,
        severity: 'medium' as MessageSeverity,
        templates: {
          en: 'Validation failed: {details}',
          ta: 'சரிபார்ப்பு தோல்வியுற்றது: {details}'
        },
        variables: ['details']
      },
      invalid_input: {
        code: 2002,
        type: 'error' as MessageType,
        severity: 'medium' as MessageSeverity,
        templates: {
          en: 'Invalid input provided',
          ta: 'தவறான உள்ளீடு வழங்கப்பட்டது'
        }
      },
      missing_required_field: {
        code: 2003,
        type: 'error' as MessageType,
        severity: 'medium' as MessageSeverity,
        templates: {
          en: 'Missing required field: {field}',
          ta: 'தேவையான புலம் இல்லை: {field}'
        },
        variables: ['field']
      },
      // Database errors
      resource_not_found: {
        code: 3001,
        type: 'error' as MessageType,
        severity: 'medium' as MessageSeverity,
        templates: {
          en: 'Resource not found',
          ta: 'வளம் கிடைக்கவில்லை'
        }
      },
      duplicate_resource: {
        code: 3002,
        type: 'error' as MessageType,
        severity: 'medium' as MessageSeverity,
        templates: {
          en: 'Resource already exists',
          ta: 'வளம் ஏற்கனவே உள்ளது'
        }
      },
      database_error: {
        code: 3003,
        type: 'error' as MessageType,
        severity: 'high' as MessageSeverity,
        templates: {
          en: 'Database operation failed',
          ta: 'தரவுத்தள செயல்பாடு தோல்வியுற்றது'
        }
      },
      // Server errors
      internal_server_error: {
        code: 5000,
        type: 'error' as MessageType,
        severity: 'critical' as MessageSeverity,
        templates: {
          en: 'Internal server error occurred',
          ta: 'உள் சேவையக பிழை ஏற்பட்டது'
        }
      },
      service_unavailable: {
        code: 5001,
        type: 'error' as MessageType,
        severity: 'critical' as MessageSeverity,
        templates: {
          en: 'Service temporarily unavailable',
          ta: 'சேவை தற்காலிகமாக கிடைக்கவில்லை'
        }
      }
    }
  },
  // Navigation
  nav: {
    main: {
      home: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Home',
          ta: 'முகப்பு'
        }
      },
      my_stories: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'My Stories',
          ta: 'என் கதைகள்'
        }
      },
      voice_samples: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Voice Samples',
          ta: 'குரல் மாதிரிகள்'
        }
      },
      library: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
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
      profile: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Profile',
          es: 'Perfil',
          fr: 'Profil',
          de: 'Profil',
          ja: 'プロフィール',
          zh: '个人资料',
          ko: '프로필'
        }
      }
    }
  },

  // Home Page
  home: {
    title: {
      main: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Create Your Story',
          ta: 'உங்கள் கதையை உருவாக்குங்கள்'
        }
      },
      collaborative_storytelling: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Collaborative Storytelling',
          ta: 'கூட்டு கதை சொல்லல்'
        }
      },
      collaborative_description: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Create stories with friends where each person voices a unique character',
          ta: 'நண்பர்களுடன் கதைகளை உருவாக்குங்கள், ஒவ்வொருவரும் தனித்துவமான கதாபாத்திரத்திற்கு குரல் கொடுக்கிறார்கள்'
        }
      }
    },
    actions: {
      write_story: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Write Story',
          ta: 'கதை எழுதுக'
        }
      },
      voice_record: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Voice Record',
          ta: 'குரல் பதிவு'
        }
      },
      upload_audio: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Upload Audio',
          ta: 'ஆடியோ பதிவேற்றம்'
        }
      },
      five_min_duration: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: '(5 min)',
          ta: '(5 நிமிடம்)'
        }
      }
    },
    draft_panel: {
      title: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Draft Stories',
          es: 'Historias en Borrador',
          fr: 'Histoires Brouillons',
          de: 'Entwurfsgeschichten',
          ja: '下書きストーリー',
          zh: '草稿故事',
          ko: '초안 스토리'
        }
      },
      empty_state: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'No draft stories',
          es: 'No hay historias en borrador',
          fr: 'Aucune histoire brouillon',
          de: 'Keine Entwurfsgeschichten',
          ja: '下書きストーリーがありません',
          zh: '没有草稿故事',
          ko: '초안 스토리가 없습니다'
        }
      }
    },
    errors: {
      auth_required_title: {
        type: 'error' as MessageType,
        severity: 'high' as MessageSeverity,
        templates: {
          en: 'Authentication Required',
          es: 'Autenticación Requerida',
          fr: 'Authentification Requise',
          de: 'Authentifizierung Erforderlich',
          ja: '認証が必要です',
          zh: '需要身份验证',
          ko: '인증 필요'
        }
      },
      auth_required_description: {
        type: 'error' as MessageType,
        severity: 'high' as MessageSeverity,
        templates: {
          en: 'Please log in to create stories.',
          es: 'Por favor, inicia sesión para crear historias.',
          fr: 'Veuillez vous connecter pour créer des histoires.',
          de: 'Bitte melden Sie sich an, um Geschichten zu erstellen.',
          ja: 'ストーリーを作成するにはログインしてください。',
          zh: '请登录以创建故事。',
          ko: '이야기를 만들려면 로그인하세요.'
        }
      },
      creation_failed_title: {
        type: 'error' as MessageType,
        severity: 'high' as MessageSeverity,
        templates: {
          en: 'Creation Failed',
          es: 'Creación Fallida',
          fr: 'Échec de la Création',
          de: 'Erstellung Fehlgeschlagen',
          ja: '作成に失敗しました',
          zh: '创建失败',
          ko: '생성 실패'
        }
      },
      creation_failed_description: {
        type: 'error' as MessageType,
        severity: 'high' as MessageSeverity,
        variables: ['error'],
        templates: {
          en: 'Could not create story: {error}',
          es: 'No se pudo crear la historia: {error}',
          fr: 'Impossible de créer l\'histoire: {error}',
          de: 'Geschichte konnte nicht erstellt werden: {error}',
          ja: 'ストーリーを作成できませんでした: {error}',
          zh: '无法创建故事: {error}',
          ko: '이야기를 만들 수 없습니다: {error}'
        }
      }
    },
    story_defaults: {
      untitled_story: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Untitled Story',
          es: 'Historia Sin Título',
          fr: 'Histoire Sans Titre',
          de: 'Unbenannte Geschichte',
          ja: '無題のストーリー',
          zh: '无标题故事',
          ko: '제목 없는 이야기'
        }
      }
    }
  },

  // Upload Story Page  
  upload_story: {
    title: {
      create_your_story: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Create Your Story',
          es: 'Crea Tu Historia',
          fr: 'Créez Votre Histoire',
          de: 'Erstelle Deine Geschichte',
          ja: 'あなたのストーリーを作成',
          zh: '创建您的故事',
          ko: '당신의 이야기를 만드세요'
        }
      },
      description: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Write your story and let AI analyze characters and emotions',
          es: 'Escribe tu historia y deja que la IA analice personajes y emociones',
          fr: 'Écrivez votre histoire et laissez l\'IA analyser les personnages et les émotions',
          de: 'Schreibe deine Geschichte und lass KI Charaktere und Emotionen analysieren',
          ja: 'ストーリーを書いて、AIにキャラクターと感情を分析させましょう',
          zh: '写下您的故事，让AI分析角色和情感',
          ko: '이야기를 쓰고 AI가 캐릭터와 감정을 분석하도록 하세요'
        }
      }
    },
    form: {
      story_placeholder: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Write your story here... (500-1000 words recommended)',
          es: 'Escribe tu historia aquí... (500-1000 palabras recomendadas)',
          fr: 'Écrivez votre histoire ici... (500-1000 mots recommandés)',
          de: 'Schreibe deine Geschichte hier... (500-1000 Wörter empfohlen)',
          ja: 'ここにストーリーを書いてください... (500-1000語推奨)',
          zh: '在此写下您的故事... (建议500-1000字)',
          ko: '여기에 이야기를 쓰세요... (500-1000단어 권장)'
        }
      },
      word_count: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
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
      word_count_recommendation: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Recommended: 500-1000 words',
          es: 'Recomendado: 500-1000 palabras',
          fr: 'Recommandé: 500-1000 mots',
          de: 'Empfohlen: 500-1000 Wörter',
          ja: '推奨: 500-1000語',
          zh: '建议: 500-1000字',
          ko: '권장: 500-1000단어'
        }
      }
    },
    status: {
      draft: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Draft',
          es: 'Borrador',
          fr: 'Brouillon',
          de: 'Entwurf',
          ja: '下書き',
          zh: '草稿',
          ko: '초안'
        }
      }
    },
    processing: {
      audio_processing: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Processing your audio...',
          es: 'Procesando tu audio...',
          fr: 'Traitement de votre audio...',
          de: 'Verarbeite dein Audio...',
          ja: 'オーディオを処理中...',
          zh: '正在处理您的音频...',
          ko: '오디오 처리 중...'
        }
      },
      audio_transcription: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Converting speech to text using AI transcription',
          es: 'Convirtiendo voz a texto usando transcripción IA',
          fr: 'Conversion de la parole en texte avec transcription IA',
          de: 'Sprache zu Text mit KI-Transkription umwandeln',
          ja: 'AI音声認識を使用して音声をテキストに変換中',
          zh: '使用AI转录将语音转换为文本',
          ko: 'AI 전사를 사용하여 음성을 텍스트로 변환'
        }
      }
    },
    actions: {
      analyze_story: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Analyze Story',
          es: 'Analizar Historia',
          fr: 'Analyser l\'Histoire',
          de: 'Geschichte Analysieren',
          ja: 'ストーリーを分析',
          zh: '分析故事',
          ko: '이야기 분석'
        }
      },
      starting_analysis: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Starting Analysis...',
          es: 'Iniciando Análisis...',
          fr: 'Démarrage de l\'Analyse...',
          de: 'Analyse wird gestartet...',
          ja: '分析を開始しています...',
          zh: '开始分析...',
          ko: '분석 시작 중...'
        }
      },
      go_home: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Go Home',
          es: 'Ir a Inicio',
          fr: 'Aller à l\'Accueil',
          de: 'Zur Startseite',
          ja: 'ホームへ',
          zh: '返回首页',
          ko: '홈으로 이동'
        }
      },
      home: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Home',
          es: 'Inicio',
          fr: 'Accueil',
          de: 'Startseite',
          ja: 'ホーム',
          zh: '首页',
          ko: '홈'
        }
      }
    },
    errors: {
      audio_conversion_failed: {
        type: 'error' as MessageType,
        severity: 'high' as MessageSeverity,
        templates: {
          en: 'Could not convert audio to text. Please try again.',
          es: 'No se pudo convertir el audio a texto. Por favor, inténtalo de nuevo.',
          fr: 'Impossible de convertir l\'audio en texte. Veuillez réessayer.',
          de: 'Audio konnte nicht in Text umgewandelt werden. Bitte versuche es erneut.',
          ja: 'オーディオをテキストに変換できませんでした。もう一度お試しください。',
          zh: '无法将音频转换为文本。请重试。',
          ko: '오디오를 텍스트로 변환할 수 없습니다. 다시 시도해주세요.'
        }
      },
      analysis_failed_title: {
        type: 'error' as MessageType,
        severity: 'high' as MessageSeverity,
        templates: {
          en: 'Analysis Failed',
          es: 'Análisis Fallido',
          fr: 'Échec de l\'Analyse',
          de: 'Analyse Fehlgeschlagen',
          ja: '分析に失敗しました',
          zh: '分析失败',
          ko: '분석 실패'
        }
      },
      analysis_failed_description: {
        type: 'error' as MessageType,
        severity: 'high' as MessageSeverity,
        templates: {
          en: 'Could not start analysis. Please try again.',
          es: 'No se pudo iniciar el análisis. Por favor, inténtalo de nuevo.',
          fr: 'Impossible de démarrer l\'analyse. Veuillez réessayer.',
          de: 'Analyse konnte nicht gestartet werden. Bitte versuche es erneut.',
          ja: '分析を開始できませんでした。もう一度お試しください。',
          zh: '无法开始分析。请重试。',
          ko: '분석을 시작할 수 없습니다. 다시 시도해주세요.'
        }
      },
      no_story_created: {
        type: 'error' as MessageType,
        severity: 'medium' as MessageSeverity,
        templates: {
          en: 'Please create a story from the home page to continue.',
          es: 'Por favor, crea una historia desde la página de inicio para continuar.',
          fr: 'Veuillez créer une histoire depuis la page d\'accueil pour continuer.',
          de: 'Bitte erstelle eine Geschichte von der Startseite, um fortzufahren.',
          ja: 'ホームページからストーリーを作成して続行してください。',
          zh: '请从首页创建一个故事以继续。',
          ko: '계속하려면 홈 페이지에서 이야기를 만들어주세요.'
        }
      }
    },
    defaults: {
      untitled_story: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Untitled Story',
          es: 'Historia Sin Título',
          fr: 'Histoire Sans Titre',
          de: 'Unbenannte Geschichte',
          ja: '無題のストーリー',
          zh: '无标题故事',
          ko: '제목 없는 이야기'
        }
      }
    },
    languages: {
      english: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'English',
          es: 'Inglés',
          fr: 'Anglais',
          de: 'Englisch',
          ja: '英語',
          zh: '英语',
          ko: '영어'
        }
      },
      spanish: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Spanish',
          es: 'Español',
          fr: 'Espagnol',
          de: 'Spanisch',
          ja: 'スペイン語',
          zh: '西班牙语',
          ko: '스페인어'
        }
      },
      french: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'French',
          es: 'Francés',
          fr: 'Français',
          de: 'Französisch',
          ja: 'フランス語',
          zh: '法语',
          ko: '프랑스어'
        }
      },
      german: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'German',
          es: 'Alemán',
          fr: 'Allemand',
          de: 'Deutsch',
          ja: 'ドイツ語',
          zh: '德语',
          ko: '독일어'
        }
      },
      italian: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Italian',
          es: 'Italiano',
          fr: 'Italien',
          de: 'Italienisch',
          ja: 'イタリア語',
          zh: '意大利语',
          ko: '이탈리아어'
        }
      },
      portuguese: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Portuguese',
          es: 'Portugués',
          fr: 'Portugais',
          de: 'Portugiesisch',
          ja: 'ポルトガル語',
          zh: '葡萄牙语',
          ko: '포르투갈어'
        }
      },
      japanese: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Japanese',
          es: 'Japonés',
          fr: 'Japonais',
          de: 'Japanisch',
          ja: '日本語',
          zh: '日语',
          ko: '일본어'
        }
      },
      korean: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Korean',
          es: 'Coreano',
          fr: 'Coréen',
          de: 'Koreanisch',
          ja: '韓国語',
          zh: '韩语',
          ko: '한국어'
        }
      },
      chinese_simplified: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Chinese (Simplified)',
          es: 'Chino (Simplificado)',
          fr: 'Chinois (Simplifié)',
          de: 'Chinesisch (Vereinfacht)',
          ja: '中国語（簡体字）',
          zh: '中文（简体）',
          ko: '중국어 (간체)'
        }
      }
    }
  },

  // Story Library Page
  story_library: {
    title: {
      main: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Narrated Stories',
          es: 'Historias Narradas',
          fr: 'Histoires Narrées',
          de: 'Erzählte Geschichten',
          ja: 'ナレーション済みストーリー',
          zh: '已叙述的故事',
          ko: '나레이션된 이야기'
        }
      }
    },
    empty_state: {
      message: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'No narrated stories found',
          es: 'No se encontraron historias narradas',
          fr: 'Aucune histoire narrée trouvée',
          de: 'Keine erzählten Geschichten gefunden',
          ja: 'ナレーション済みストーリーが見つかりません',
          zh: '未找到已叙述的故事',
          ko: '나레이션된 이야기를 찾을 수 없습니다'
        }
      }
    },
    story_card: {
      private_label: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: '(private story)',
          es: '(historia privada)',
          fr: '(histoire privée)',
          de: '(private Geschichte)',
          ja: '(プライベートストーリー)',
          zh: '(私人故事)',
          ko: '(비공개 스토리)'
        }
      },
      minutes_short: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'm',
          es: 'm',
          fr: 'm',
          de: 'm',
          ja: '分',
          zh: '分',
          ko: '분'
        }
      }
    },
    actions: {
      edit: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Edit Story',
          es: 'Editar Historia',
          fr: 'Modifier l\'Histoire',
          de: 'Geschichte Bearbeiten',
          ja: 'ストーリーを編集',
          zh: '编辑故事',
          ko: '이야기 편집'
        }
      },
      delete: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Delete Story',
          es: 'Eliminar Historia',
          fr: 'Supprimer l\'Histoire',
          de: 'Geschichte Löschen',
          ja: 'ストーリーを削除',
          zh: '删除故事',
          ko: '이야기 삭제'
        }
      },
      view: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'View Story',
          es: 'Ver Historia',
          fr: 'Voir l\'Histoire',
          de: 'Geschichte Ansehen',
          ja: 'ストーリーを表示',
          zh: '查看故事',
          ko: '이야기 보기'
        }
      },
      collaborate: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Collaborate',
          es: 'Colaborar',
          fr: 'Collaborer',
          de: 'Zusammenarbeiten',
          ja: 'コラボレート',
          zh: '协作',
          ko: '협업'
        }
      }
    },
    delete_dialog: {
      title: {
        type: 'warning' as MessageType,
        severity: 'high' as MessageSeverity,
        templates: {
          en: 'Delete Story',
          es: 'Eliminar Historia',
          fr: 'Supprimer l\'Histoire',
          de: 'Geschichte Löschen',
          ja: 'ストーリーを削除',
          zh: '删除故事',
          ko: '이야기 삭제'
        }
      },
      confirm_message: {
        type: 'warning' as MessageType,
        severity: 'high' as MessageSeverity,
        variables: ['storyTitle'],
        templates: {
          en: 'Are you sure you want to delete "{storyTitle}"? This action cannot be undone.',
          es: '¿Está seguro de que desea eliminar "{storyTitle}"? Esta acción no se puede deshacer.',
          fr: 'Êtes-vous sûr de vouloir supprimer "{storyTitle}" ? Cette action ne peut pas être annulée.',
          de: 'Sind Sie sicher, dass Sie "{storyTitle}" löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.',
          ja: '"{storyTitle}"を削除してもよろしいですか？この操作は取り消せません。',
          zh: '您确定要删除"{storyTitle}"吗？此操作无法撤消。',
          ko: '"{storyTitle}"을(를) 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.'
        }
      },
      cancel_button: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
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
      delete_button: {
        type: 'warning' as MessageType,
        severity: 'high' as MessageSeverity,
        templates: {
          en: 'Delete',
          es: 'Eliminar',
          fr: 'Supprimer',
          de: 'Löschen',
          ja: '削除',
          zh: '删除',
          ko: '삭제'
        }
      }
    },
    status: {
      converting: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Converting...',
          es: 'Convirtiendo...',
          fr: 'Conversion...',
          de: 'Konvertierung...',
          ja: '変換中...',
          zh: '转换中...',
          ko: '변환 중...'
        }
      }
    },
    tooltips: {
      private_story: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Private story - only visible to you',
          es: 'Historia privada - solo visible para ti',
          fr: 'Histoire privée - visible uniquement par vous',
          de: 'Private Geschichte - nur für Sie sichtbar',
          ja: 'プライベートストーリー - あなたにのみ表示',
          zh: '私人故事 - 仅对您可见',
          ko: '비공개 스토리 - 나에게만 표시'
        }
      },
      public_story: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
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
      available_to_all: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Available to all users',
          es: 'Disponible para todos los usuarios',
          fr: 'Disponible pour tous les utilisateurs',
          de: 'Für alle Benutzer verfügbar',
          ja: 'すべてのユーザーが利用可能',
          zh: '对所有用户可用',
          ko: '모든 사용자가 사용 가능'
        }
      }
    }
  },

  // Common Actions (used across multiple pages)
  common: {
    actions: {
      save: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Save',
          es: 'Guardar',
          fr: 'Sauvegarder',
          de: 'Speichern',
          ja: '保存',
          zh: '保存',
          ko: '저장'
        }
      },
      cancel: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
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
      confirm: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Confirm',
          es: 'Confirmar',
          fr: 'Confirmer',
          de: 'Bestätigen',
          ja: '確認',
          zh: '确认',
          ko: '확인'
        }
      },
      close: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Close',
          es: 'Cerrar',
          fr: 'Fermer',
          de: 'Schließen',
          ja: '閉じる',
          zh: '关闭',
          ko: '닫기'
        }
      }
    },
    status: {
      loading: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
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
      saving: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Saving...',
          es: 'Guardando...',
          fr: 'Enregistrement...',
          de: 'Speichern...',
          ja: '保存中...',
          zh: '保存中...',
          ko: '저장 중...'
        }
      },
      processing: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Processing...',
          es: 'Procesando...',
          fr: 'Traitement...',
          de: 'Verarbeitung...',
          ja: '処理中...',
          zh: '处理中...',
          ko: '처리 중...'
        }
      }
    },
    errors: {
      generic: {
        type: 'error' as MessageType,
        severity: 'high' as MessageSeverity,
        templates: {
          en: 'An error occurred. Please try again.',
          es: 'Se produjo un error. Por favor, inténtelo de nuevo.',
          fr: 'Une erreur s\'est produite. Veuillez réessayer.',
          de: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.',
          ja: 'エラーが発生しました。もう一度お試しください。',
          zh: '发生错误。请重试。',
          ko: '오류가 발생했습니다. 다시 시도해주세요.'
        }
      },
      not_found: {
        type: 'error' as MessageType,
        severity: 'medium' as MessageSeverity,
        templates: {
          en: 'Not found',
          es: 'No encontrado',
          fr: 'Non trouvé',
          de: 'Nicht gefunden',
          ja: '見つかりません',
          zh: '未找到',
          ko: '찾을 수 없음'
        }
      }
    }
  }
} as const;

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
      console.warn(`i18n key not found: ${keyPath}`);
      return keyPath; // Return the key itself as fallback
    }
    current = current[key];
  }

  const template = current.templates?.[lang] || current.templates?.en;
  if (!template) {
    console.warn(`i18n template not found for key: ${keyPath}`);
    return keyPath;
  }

  // Interpolate variables if provided
  if (variables && current.variables) {
    return interpolateTemplate(template, variables);
  }

  return template;
}

/**
 * Template interpolation utility
 * Replaces {variable} placeholders with actual values
 */
function interpolateTemplate(template: string, variables: Record<string, string | number>): string {
  return template.replace(/{(\w+)}/g, (match, key) => {
    if (key in variables) {
      return String(variables[key]);
    }
    console.warn(`Missing variable for interpolation: ${key}`);
    return match;
  });
}

/**
 * Type-safe message getter with autocomplete support
 */
export const t = {
  nav: {
    main: {
      home: () => getMessage('nav.main.home'),
      myStories: () => getMessage('nav.main.my_stories'),
      voiceSamples: () => getMessage('nav.main.voice_samples'),
      library: () => getMessage('nav.main.library'),
      profile: () => getMessage('nav.main.profile')
    }
  },
  home: {
    title: {
      main: () => getMessage('home.title.main')
    },
    actions: {
      writeStory: () => getMessage('home.actions.write_story'),
      voiceRecord: () => getMessage('home.actions.voice_record'),
      uploadAudio: () => getMessage('home.actions.upload_audio')
    },
    draftPanel: {
      title: () => getMessage('home.draft_panel.title'),
      emptyState: () => getMessage('home.draft_panel.empty_state')
    }
  },
  storyLibrary: {
    title: {
      main: () => getMessage('story_library.title.main')
    },
    emptyState: {
      message: () => getMessage('story_library.empty_state.message')
    },
    storyCard: {
      privateLabel: () => getMessage('story_library.story_card.private_label'),
      minutesShort: () => getMessage('story_library.story_card.minutes_short')
    },
    actions: {
      edit: () => getMessage('story_library.actions.edit'),
      delete: () => getMessage('story_library.actions.delete'),
      view: () => getMessage('story_library.actions.view'),
      collaborate: () => getMessage('story_library.actions.collaborate')
    },
    deleteDialog: {
      title: () => getMessage('story_library.delete_dialog.title'),
      confirmMessage: (storyTitle: string) => getMessage('story_library.delete_dialog.confirm_message', { storyTitle }),
      cancelButton: () => getMessage('story_library.delete_dialog.cancel_button'),
      deleteButton: () => getMessage('story_library.delete_dialog.delete_button')
    },
    status: {
      converting: () => getMessage('story_library.status.converting')
    },
    tooltips: {
      privateStory: () => getMessage('story_library.tooltips.private_story'),
      publicStory: () => getMessage('story_library.tooltips.public_story'),
      availableToAll: () => getMessage('story_library.tooltips.available_to_all')
    }
  },
  common: {
    actions: {
      save: () => getMessage('common.actions.save'),
      cancel: () => getMessage('common.actions.cancel'),
      confirm: () => getMessage('common.actions.confirm'),
      close: () => getMessage('common.actions.close')
    },
    status: {
      loading: () => getMessage('common.status.loading'),
      saving: () => getMessage('common.status.saving'),
      processing: () => getMessage('common.status.processing')
    },
    errors: {
      generic: () => getMessage('common.errors.generic'),
      notFound: () => getMessage('common.errors.not_found')
    }
  }
} as const;

/**
 * Legacy compatibility layer - maps old flat keys to new hierarchical structure
 * This allows gradual migration without breaking existing code
 */
export const LEGACY_KEY_MAP: Record<string, string> = {
  'NAV_HOME': 'nav.main.home',
  'NAV_STORIES': 'nav.main.my_stories',
  'NAV_VOICE_SAMPLES': 'nav.main.voice_samples',
  'NAV_LIBRARY': 'nav.main.library',
  'NAV_PROFILE': 'nav.main.profile',
  'STORY_PRIVATE_LABEL': 'story_library.story_card.private_label',
  'BUTTON_EDIT': 'story_library.actions.edit',
  'BUTTON_DELETE': 'story_library.actions.delete',
  'BUTTON_CANCEL': 'common.actions.cancel',
  'BUTTON_VIEW': 'story_library.actions.view',
  'BUTTON_COLLABORATE': 'story_library.actions.collaborate',
  'NARRATED_STORIES_TITLE': 'story_library.title.main',
  'DELETE_STORY_TITLE': 'story_library.delete_dialog.title',
  'DELETE_STORY_CONFIRM': 'story_library.delete_dialog.confirm_message',
  'CONVERTING_STATUS': 'story_library.status.converting',
  'AVAILABLE_TO_ALL_USERS': 'story_library.tooltips.available_to_all',
  'MINUTES_SHORT': 'story_library.story_card.minutes_short',
  'NO_NARRATED_STORIES': 'story_library.empty_state.message'
};

/**
 * Legacy compatibility function - converts old flat keys to new hierarchical keys
 */
export function getLegacyMessage(
  oldKey: string,
  variables?: Record<string, string | number>,
  language?: Language
): string {
  const newKey = LEGACY_KEY_MAP[oldKey];
  if (!newKey) {
    console.warn(`Legacy i18n key not mapped: ${oldKey}`);
    return oldKey;
  }
  return getMessage(newKey, variables, language);
}