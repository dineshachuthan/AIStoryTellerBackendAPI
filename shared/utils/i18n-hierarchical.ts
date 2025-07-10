/**
 * Hierarchical Internationalization Configuration
 * Namespace-based message organization for better maintainability
 * Pattern: page.component.element
 */

import { getCurrentUserLanguage, type Language } from '../config/language-config';

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

  // Authentication Pages
  auth: {
    login: {
      title: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Login',
          es: 'Iniciar Sesión',
          fr: 'Connexion',
          de: 'Anmelden',
          ja: 'ログイン',
          zh: '登录',
          ko: '로그인'
        }
      },
      description: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Sign in to your account',
          es: 'Inicia sesión en tu cuenta',
          fr: 'Connectez-vous à votre compte',
          de: 'Melden Sie sich bei Ihrem Konto an',
          ja: 'アカウントにサインイン',
          zh: '登录您的账户',
          ko: '계정에 로그인'
        }
      },
      email: {
        label: {
          type: 'info' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Email',
            es: 'Correo Electrónico',
            fr: 'Email',
            de: 'E-Mail',
            ja: 'メールアドレス',
            zh: '电子邮件',
            ko: '이메일'
          }
        },
        placeholder: {
          type: 'info' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Enter your email',
            es: 'Ingresa tu correo electrónico',
            fr: 'Entrez votre email',
            de: 'Geben Sie Ihre E-Mail ein',
            ja: 'メールアドレスを入力',
            zh: '输入您的电子邮件',
            ko: '이메일을 입력하세요'
          }
        }
      },
      password: {
        label: {
          type: 'info' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Password',
            es: 'Contraseña',
            fr: 'Mot de passe',
            de: 'Passwort',
            ja: 'パスワード',
            zh: '密码',
            ko: '비밀번호'
          }
        },
        placeholder: {
          type: 'info' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Enter your password',
            es: 'Ingresa tu contraseña',
            fr: 'Entrez votre mot de passe',
            de: 'Geben Sie Ihr Passwort ein',
            ja: 'パスワードを入力',
            zh: '输入您的密码',
            ko: '비밀번호를 입력하세요'
          }
        }
      },
      rememberMe: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Remember me',
          es: 'Recuérdame',
          fr: 'Se souvenir de moi',
          de: 'Angemeldet bleiben',
          ja: 'ログイン状態を保持',
          zh: '记住我',
          ko: '로그인 상태 유지'
        }
      },
      forgotPassword: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Forgot password?',
          es: '¿Olvidaste tu contraseña?',
          fr: 'Mot de passe oublié?',
          de: 'Passwort vergessen?',
          ja: 'パスワードをお忘れですか？',
          zh: '忘记密码？',
          ko: '비밀번호를 잊으셨나요?'
        }
      },
      submit: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Sign In',
          es: 'Iniciar Sesión',
          fr: 'Se Connecter',
          de: 'Anmelden',
          ja: 'サインイン',
          zh: '登录',
          ko: '로그인'
        }
      },
      orContinueWith: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Or continue with',
          es: 'O continúa con',
          fr: 'Ou continuer avec',
          de: 'Oder fortfahren mit',
          ja: 'または以下で続ける',
          zh: '或继续使用',
          ko: '또는 다음으로 계속'
        }
      },
      continueWithGoogle: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Continue with Google',
          es: 'Continuar con Google',
          fr: 'Continuer avec Google',
          de: 'Mit Google fortfahren',
          ja: 'Googleで続ける',
          zh: '使用Google继续',
          ko: 'Google로 계속'
        }
      }
    },
    register: {
      title: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Register',
          es: 'Registrarse',
          fr: 'S\'inscrire',
          de: 'Registrieren',
          ja: '登録',
          zh: '注册',
          ko: '회원가입'
        }
      },
      description: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Create a new account',
          es: 'Crear una nueva cuenta',
          fr: 'Créer un nouveau compte',
          de: 'Neues Konto erstellen',
          ja: '新しいアカウントを作成',
          zh: '创建新账户',
          ko: '새 계정 만들기'
        }
      },
      email: {
        label: {
          type: 'info' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Email',
            es: 'Correo Electrónico',
            fr: 'Email',
            de: 'E-Mail',
            ja: 'メールアドレス',
            zh: '电子邮件',
            ko: '이메일'
          }
        },
        placeholder: {
          type: 'info' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Enter your email',
            es: 'Ingresa tu correo electrónico',
            fr: 'Entrez votre email',
            de: 'Geben Sie Ihre E-Mail ein',
            ja: 'メールアドレスを入力',
            zh: '输入您的电子邮件',
            ko: '이메일을 입력하세요'
          }
        }
      },
      password: {
        label: {
          type: 'info' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Password',
            es: 'Contraseña',
            fr: 'Mot de passe',
            de: 'Passwort',
            ja: 'パスワード',
            zh: '密码',
            ko: '비밀번호'
          }
        },
        placeholder: {
          type: 'info' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Enter a password',
            es: 'Ingresa una contraseña',
            fr: 'Entrez un mot de passe',
            de: 'Geben Sie ein Passwort ein',
            ja: 'パスワードを入力',
            zh: '输入密码',
            ko: '비밀번호를 입력하세요'
          }
        }
      },
      confirmPassword: {
        label: {
          type: 'info' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Confirm Password',
            es: 'Confirmar Contraseña',
            fr: 'Confirmer le Mot de Passe',
            de: 'Passwort Bestätigen',
            ja: 'パスワードを確認',
            zh: '确认密码',
            ko: '비밀번호 확인'
          }
        },
        placeholder: {
          type: 'info' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Re-enter your password',
            es: 'Vuelve a ingresar tu contraseña',
            fr: 'Ressaisissez votre mot de passe',
            de: 'Geben Sie Ihr Passwort erneut ein',
            ja: 'パスワードを再入力',
            zh: '再次输入密码',
            ko: '비밀번호를 다시 입력하세요'
          }
        }
      },
      passwordHint: {
        label: {
          type: 'info' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Password Hint (Optional)',
            es: 'Pista de Contraseña (Opcional)',
            fr: 'Indice de Mot de Passe (Optionnel)',
            de: 'Passwort-Hinweis (Optional)',
            ja: 'パスワードヒント（任意）',
            zh: '密码提示（可选）',
            ko: '비밀번호 힌트 (선택사항)'
          }
        },
        placeholder: {
          type: 'info' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Enter a hint to help you remember',
            es: 'Ingresa una pista para ayudarte a recordar',
            fr: 'Entrez un indice pour vous aider à vous souvenir',
            de: 'Geben Sie einen Hinweis ein, der Ihnen hilft, sich zu erinnern',
            ja: '思い出しやすいヒントを入力',
            zh: '输入一个提示来帮助您记住',
            ko: '기억하는데 도움이 될 힌트를 입력하세요'
          }
        },
        description: {
          type: 'info' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'This hint will be visible if you forget your password',
            es: 'Esta pista será visible si olvidas tu contraseña',
            fr: 'Cet indice sera visible si vous oubliez votre mot de passe',
            de: 'Dieser Hinweis wird sichtbar sein, wenn Sie Ihr Passwort vergessen',
            ja: 'パスワードを忘れた場合、このヒントが表示されます',
            zh: '如果您忘记密码，此提示将可见',
            ko: '비밀번호를 잊으셨을 때 이 힌트가 표시됩니다'
          }
        }
      },
      acceptTerms: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'I accept the',
          es: 'Acepto los',
          fr: 'J\'accepte les',
          de: 'Ich akzeptiere die',
          ja: '同意します',
          zh: '我接受',
          ko: '동의합니다'
        }
      },
      termsLink: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Terms and Conditions',
          es: 'Términos y Condiciones',
          fr: 'Termes et Conditions',
          de: 'Geschäftsbedingungen',
          ja: '利用規約',
          zh: '条款和条件',
          ko: '이용약관'
        }
      },
      termsRequired: {
        type: 'error' as MessageType,
        severity: 'medium' as MessageSeverity,
        templates: {
          en: 'You must accept the terms to continue',
          es: 'Debes aceptar los términos para continuar',
          fr: 'Vous devez accepter les conditions pour continuer',
          de: 'Sie müssen die Bedingungen akzeptieren, um fortzufahren',
          ja: '続行するには規約に同意する必要があります',
          zh: '您必须接受条款才能继续',
          ko: '계속하려면 약관에 동의해야 합니다'
        }
      },
      submit: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Create Account',
          es: 'Crear Cuenta',
          fr: 'Créer un Compte',
          de: 'Konto Erstellen',
          ja: 'アカウントを作成',
          zh: '创建账户',
          ko: '계정 만들기'
        }
      },
      passwordMismatch: {
        type: 'error' as MessageType,
        severity: 'medium' as MessageSeverity,
        templates: {
          en: 'Passwords do not match',
          es: 'Las contraseñas no coinciden',
          fr: 'Les mots de passe ne correspondent pas',
          de: 'Passwörter stimmen nicht überein',
          ja: 'パスワードが一致しません',
          zh: '密码不匹配',
          ko: '비밀번호가 일치하지 않습니다'
        }
      },
      passwordStrength: {
        weak: {
          type: 'warning' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Weak password',
            es: 'Contraseña débil',
            fr: 'Mot de passe faible',
            de: 'Schwaches Passwort',
            ja: '弱いパスワード',
            zh: '密码强度弱',
            ko: '약한 비밀번호'
          }
        },
        medium: {
          type: 'info' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Medium strength',
            es: 'Fuerza media',
            fr: 'Force moyenne',
            de: 'Mittlere Stärke',
            ja: '中程度の強度',
            zh: '中等强度',
            ko: '보통 강도'
          }
        },
        strong: {
          type: 'success' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Strong password',
            es: 'Contraseña fuerte',
            fr: 'Mot de passe fort',
            de: 'Starkes Passwort',
            ja: '強いパスワード',
            zh: '密码强度高',
            ko: '강한 비밀번호'
          }
        }
      }
    },
    password: {
      requirements: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: '8-12 characters with uppercase, numbers, and special characters',
          es: '8-12 caracteres con mayúsculas, números y caracteres especiales',
          fr: '8-12 caractères avec majuscules, chiffres et caractères spéciaux',
          de: '8-12 Zeichen mit Großbuchstaben, Zahlen und Sonderzeichen',
          ja: '8〜12文字で、大文字、数字、特殊文字を含む',
          zh: '8-12个字符，包含大写字母、数字和特殊字符',
          ko: '대문자, 숫자, 특수문자를 포함한 8-12자'
        }
      }
    },
    forgotPassword: {
      title: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Forgot Password',
          es: 'Contraseña Olvidada',
          fr: 'Mot de Passe Oublié',
          de: 'Passwort Vergessen',
          ja: 'パスワードを忘れた',
          zh: '忘记密码',
          ko: '비밀번호 찾기'
        }
      },
      description: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Enter your email and we\'ll send you a reset link',
          es: 'Ingresa tu correo y te enviaremos un enlace para restablecer',
          fr: 'Entrez votre email et nous vous enverrons un lien de réinitialisation',
          de: 'Geben Sie Ihre E-Mail ein und wir senden Ihnen einen Reset-Link',
          ja: 'メールアドレスを入力すると、リセットリンクをお送りします',
          zh: '输入您的电子邮件，我们将向您发送重置链接',
          ko: '이메일을 입력하시면 재설정 링크를 보내드립니다'
        }
      },
      submit: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Send Reset Link',
          es: 'Enviar Enlace',
          fr: 'Envoyer le Lien',
          de: 'Link Senden',
          ja: 'リンクを送信',
          zh: '发送链接',
          ko: '링크 전송'
        }
      }
    },
    twoFactor: {
      title: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Two-Factor Authentication',
          es: 'Autenticación de Dos Factores',
          fr: 'Authentification à Deux Facteurs',
          de: 'Zwei-Faktor-Authentifizierung',
          ja: '二要素認証',
          zh: '双因素认证',
          ko: '2단계 인증'
        }
      },
      enterCode: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Enter the verification code',
          es: 'Ingresa el código de verificación',
          fr: 'Entrez le code de vérification',
          de: 'Geben Sie den Verifizierungscode ein',
          ja: '確認コードを入力',
          zh: '输入验证码',
          ko: '인증 코드를 입력하세요'
        }
      },
      codePlaceholder: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: '6-digit code',
          es: 'Código de 6 dígitos',
          fr: 'Code à 6 chiffres',
          de: '6-stelliger Code',
          ja: '6桁のコード',
          zh: '6位数字代码',
          ko: '6자리 코드'
        }
      },
      submit: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Verify',
          es: 'Verificar',
          fr: 'Vérifier',
          de: 'Verifizieren',
          ja: '確認',
          zh: '验证',
          ko: '확인'
        }
      }
    },
    common: {
      emailInvalid: {
        type: 'error' as MessageType,
        severity: 'medium' as MessageSeverity,
        templates: {
          en: 'Please enter a valid email address',
          es: 'Por favor ingresa un correo electrónico válido',
          fr: 'Veuillez entrer une adresse email valide',
          de: 'Bitte geben Sie eine gültige E-Mail-Adresse ein',
          ja: '有効なメールアドレスを入力してください',
          zh: '请输入有效的电子邮件地址',
          ko: '유효한 이메일 주소를 입력하세요'
        }
      },
      emailRequired: {
        type: 'error' as MessageType,
        severity: 'medium' as MessageSeverity,
        templates: {
          en: 'Email is required',
          es: 'El correo electrónico es obligatorio',
          fr: 'L\'email est requis',
          de: 'E-Mail ist erforderlich',
          ja: 'メールアドレスは必須です',
          zh: '电子邮件是必填项',
          ko: '이메일은 필수입니다'
        }
      },
      passwordRequired: {
        type: 'error' as MessageType,
        severity: 'medium' as MessageSeverity,
        templates: {
          en: 'Password is required',
          es: 'La contraseña es obligatoria',
          fr: 'Le mot de passe est requis',
          de: 'Passwort ist erforderlich',
          ja: 'パスワードは必須です',
          zh: '密码是必填项',
          ko: '비밀번호는 필수입니다'
        }
      },
      alreadyHaveAccount: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Already have an account?',
          es: '¿Ya tienes una cuenta?',
          fr: 'Vous avez déjà un compte?',
          de: 'Haben Sie bereits ein Konto?',
          ja: 'すでにアカウントをお持ちですか？',
          zh: '已经有账户了？',
          ko: '이미 계정이 있으신가요?'
        }
      },
      dontHaveAccount: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Don\'t have an account?',
          es: '¿No tienes una cuenta?',
          fr: 'Vous n\'avez pas de compte?',
          de: 'Haben Sie noch kein Konto?',
          ja: 'アカウントをお持ちでないですか？',
          zh: '没有账户？',
          ko: '계정이 없으신가요?'
        }
      },
      signInLink: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Sign in',
          es: 'Iniciar sesión',
          fr: 'Se connecter',
          de: 'Anmelden',
          ja: 'サインイン',
          zh: '登录',
          ko: '로그인'
        }
      },
      signUpLink: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Sign up',
          es: 'Registrarse',
          fr: 'S\'inscrire',
          de: 'Registrieren',
          ja: '登録',
          zh: '注册',
          ko: '회원가입'
        }
      },
      backToLogin: {
        type: 'info' as MessageType,
        severity: 'low' as MessageSeverity,
        templates: {
          en: 'Back to login',
          es: 'Volver a iniciar sesión',
          fr: 'Retour à la connexion',
          de: 'Zurück zur Anmeldung',
          ja: 'ログインに戻る',
          zh: '返回登录',
          ko: '로그인으로 돌아가기'
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
    narration: {
      tooltips: {
        already_generated: {
          type: 'info' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Narration already generated',
            es: 'Narración ya generada',
            fr: 'Narration déjà générée',
            de: 'Erzählung bereits erstellt',
            ja: 'ナレーションは既に生成されています',
            zh: '旁白已生成',
            ko: '나레이션이 이미 생성됨'
          }
        },
        need_narrator_voice: {
          type: 'warning' as MessageType,
          severity: 'medium' as MessageSeverity,
          templates: {
            en: 'Need narrator voice first',
            es: 'Primero necesitas la voz del narrador',
            fr: 'Voix du narrateur requise d\'abord',
            de: 'Erzählerstimme zuerst erforderlich',
            ja: 'まずナレーターボイスが必要です',
            zh: '需要先创建旁白声音',
            ko: '먼저 나레이터 음성이 필요합니다'
          }
        },
        generate_narration: {
          type: 'info' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Generate story narration',
            es: 'Generar narración de historia',
            fr: 'Générer la narration de l\'histoire',
            de: 'Geschichte-Erzählung erstellen',
            ja: 'ストーリーナレーションを生成',
            zh: '生成故事旁白',
            ko: '스토리 나레이션 생성'
          }
        },
        play_narration: {
          type: 'info' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Play narration',
            es: 'Reproducir narración',
            fr: 'Lire la narration',
            de: 'Erzählung abspielen',
            ja: 'ナレーションを再生',
            zh: '播放旁白',
            ko: '나레이션 재생'
          }
        },
        pause_narration: {
          type: 'info' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Pause narration',
            es: 'Pausar narración',
            fr: 'Mettre en pause la narration',
            de: 'Erzählung pausieren',
            ja: 'ナレーションを一時停止',
            zh: '暂停旁白',
            ko: '나레이션 일시정지'
          }
        },
        previous_segment: {
          type: 'info' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Previous segment',
            es: 'Segmento anterior',
            fr: 'Segment précédent',
            de: 'Vorheriges Segment',
            ja: '前のセグメント',
            zh: '上一段',
            ko: '이전 구간'
          }
        },
        next_segment: {
          type: 'info' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Next segment',
            es: 'Siguiente segmento',
            fr: 'Segment suivant',
            de: 'Nächstes Segment',
            ja: '次のセグメント',
            zh: '下一段',
            ko: '다음 구간'
          }
        },
        volume_control: {
          type: 'info' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Volume control',
            es: 'Control de volumen',
            fr: 'Contrôle du volume',
            de: 'Lautstärkeregelung',
            ja: '音量調整',
            zh: '音量控制',
            ko: '볼륨 조절'
          }
        },
        playing_status: {
          type: 'info' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Playing status (Green = Playing, Red = Stopped)',
            es: 'Estado de reproducción (Verde = Reproduciendo, Rojo = Detenido)',
            fr: 'État de lecture (Vert = Lecture, Rouge = Arrêté)',
            de: 'Wiedergabestatus (Grün = Wiedergabe, Rot = Gestoppt)',
            ja: '再生状態（緑 = 再生中、赤 = 停止）',
            zh: '播放状态（绿色 = 播放中，红色 = 停止）',
            ko: '재생 상태 (녹색 = 재생 중, 빨간색 = 정지)'
          }
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
    },
    toast: {
      invitations: {
        sent: {
          type: 'success' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Invitations sent!',
            es: 'Invitaciones enviadas!',
            fr: 'Invitations envoyées!',
            de: 'Einladungen gesendet!',
            ja: '招待状が送信されました！',
            zh: '邀请已发送！',
            ko: '초대장이 전송되었습니다!'
          }
        },
        sent_count: {
          type: 'info' as MessageType,
          severity: 'low' as MessageSeverity,
          variables: ['count'],
          templates: {
            en: 'Successfully sent {count} invitation(s)',
            es: 'Se enviaron {count} invitación(es) correctamente',
            fr: '{count} invitation(s) envoyée(s) avec succès',
            de: '{count} Einladung(en) erfolgreich gesendet',
            ja: '{count}件の招待状を正常に送信しました',
            zh: '成功发送{count}个邀请',
            ko: '{count}개의 초대장을 성공적으로 전송했습니다'
          }
        },
        failed: {
          type: 'error' as MessageType,
          severity: 'medium' as MessageSeverity,
          templates: {
            en: 'Failed to send invitations',
            es: 'Error al enviar invitaciones',
            fr: 'Échec de l\'envoi des invitations',
            de: 'Fehler beim Senden der Einladungen',
            ja: '招待状の送信に失敗しました',
            zh: '发送邀请失败',
            ko: '초대장 전송 실패'
          }
        }
      },
      save: {
        success: {
          type: 'success' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Saved successfully',
            es: 'Guardado correctamente',
            fr: 'Enregistré avec succès',
            de: 'Erfolgreich gespeichert',
            ja: '正常に保存されました',
            zh: '保存成功',
            ko: '성공적으로 저장되었습니다'
          }
        },
        success_item: {
          type: 'success' as MessageType,
          severity: 'low' as MessageSeverity,
          variables: ['item'],
          templates: {
            en: '{item} has been saved',
            es: '{item} ha sido guardado',
            fr: '{item} a été enregistré',
            de: '{item} wurde gespeichert',
            ja: '{item}が保存されました',
            zh: '{item}已保存',
            ko: '{item}이(가) 저장되었습니다'
          }
        },
        failed: {
          type: 'error' as MessageType,
          severity: 'medium' as MessageSeverity,
          templates: {
            en: 'Save failed',
            es: 'Error al guardar',
            fr: 'Échec de l\'enregistrement',
            de: 'Speichern fehlgeschlagen',
            ja: '保存に失敗しました',
            zh: '保存失败',
            ko: '저장 실패'
          }
        }
      },
      delete: {
        success: {
          type: 'success' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Deleted successfully',
            es: 'Eliminado correctamente',
            fr: 'Supprimé avec succès',
            de: 'Erfolgreich gelöscht',
            ja: '正常に削除されました',
            zh: '删除成功',
            ko: '성공적으로 삭제되었습니다'
          }
        },
        success_item: {
          type: 'success' as MessageType,
          severity: 'low' as MessageSeverity,
          variables: ['item'],
          templates: {
            en: '{item} has been deleted',
            es: '{item} ha sido eliminado',
            fr: '{item} a été supprimé',
            de: '{item} wurde gelöscht',
            ja: '{item}が削除されました',
            zh: '{item}已删除',
            ko: '{item}이(가) 삭제되었습니다'
          }
        },
        failed: {
          type: 'error' as MessageType,
          severity: 'medium' as MessageSeverity,
          templates: {
            en: 'Delete failed',
            es: 'Error al eliminar',
            fr: 'Échec de la suppression',
            de: 'Löschen fehlgeschlagen',
            ja: '削除に失敗しました',
            zh: '删除失败',
            ko: '삭제 실패'
          }
        }
      },
      recording: {
        started: {
          type: 'info' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Recording started',
            es: 'Grabación iniciada',
            fr: 'Enregistrement démarré',
            de: 'Aufnahme gestartet',
            ja: '録音を開始しました',
            zh: '开始录音',
            ko: '녹음이 시작되었습니다'
          }
        },
        saved: {
          type: 'success' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Recording saved',
            es: 'Grabación guardada',
            fr: 'Enregistrement sauvegardé',
            de: 'Aufnahme gespeichert',
            ja: '録音が保存されました',
            zh: '录音已保存',
            ko: '녹음이 저장되었습니다'
          }
        },
        failed: {
          type: 'error' as MessageType,
          severity: 'medium' as MessageSeverity,
          templates: {
            en: 'Recording failed',
            es: 'Error en la grabación',
            fr: 'Échec de l\'enregistrement',
            de: 'Aufnahme fehlgeschlagen',
            ja: '録音に失敗しました',
            zh: '录音失败',
            ko: '녹음 실패'
          }
        }
      },
      video: {
        generation_started: {
          type: 'info' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Video generation started',
            es: 'Generación de vídeo iniciada',
            fr: 'Génération de vidéo démarrée',
            de: 'Videogenerierung gestartet',
            ja: 'ビデオ生成を開始しました',
            zh: '视频生成已开始',
            ko: '비디오 생성이 시작되었습니다'
          }
        },
        generation_complete: {
          type: 'success' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Video ready!',
            es: '¡Vídeo listo!',
            fr: 'Vidéo prête!',
            de: 'Video fertig!',
            ja: 'ビデオの準備ができました！',
            zh: '视频已就绪！',
            ko: '비디오 준비 완료!'
          }
        },
        generation_failed: {
          type: 'error' as MessageType,
          severity: 'medium' as MessageSeverity,
          templates: {
            en: 'Video generation failed',
            es: 'Error en la generación de vídeo',
            fr: 'Échec de la génération de vidéo',
            de: 'Videogenerierung fehlgeschlagen',
            ja: 'ビデオ生成に失敗しました',
            zh: '视频生成失败',
            ko: '비디오 생성 실패'
          }
        }
      },
      narration: {
        generating: {
          type: 'info' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Generating narration',
            es: 'Generando narración',
            fr: 'Génération de la narration',
            de: 'Erzählung wird generiert',
            ja: 'ナレーションを生成中',
            zh: '正在生成旁白',
            ko: '나레이션 생성 중'
          }
        },
        complete: {
          type: 'success' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Narration ready!',
            es: '¡Narración lista!',
            fr: 'Narration prête!',
            de: 'Erzählung fertig!',
            ja: 'ナレーションの準備ができました！',
            zh: '旁白已就绪！',
            ko: '나레이션 준비 완료!'
          }
        },
        failed: {
          type: 'error' as MessageType,
          severity: 'medium' as MessageSeverity,
          templates: {
            en: 'Narration failed',
            es: 'Error en la narración',
            fr: 'Échec de la narration',
            de: 'Erzählung fehlgeschlagen',
            ja: 'ナレーションに失敗しました',
            zh: '旁白失败',
            ko: '나레이션 실패'
          }
        }
      },
      upload: {
        complete: {
          type: 'success' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Upload complete',
            es: 'Carga completa',
            fr: 'Téléchargement terminé',
            de: 'Upload abgeschlossen',
            ja: 'アップロード完了',
            zh: '上传完成',
            ko: '업로드 완료'
          }
        },
        failed: {
          type: 'error' as MessageType,
          severity: 'medium' as MessageSeverity,
          templates: {
            en: 'Upload failed',
            es: 'Error en la carga',
            fr: 'Échec du téléchargement',
            de: 'Upload fehlgeschlagen',
            ja: 'アップロードに失敗しました',
            zh: '上传失败',
            ko: '업로드 실패'
          }
        }
      },
      auth: {
        login_required: {
          type: 'warning' as MessageType,
          severity: 'medium' as MessageSeverity,
          templates: {
            en: 'Login required',
            es: 'Inicio de sesión requerido',
            fr: 'Connexion requise',
            de: 'Anmeldung erforderlich',
            ja: 'ログインが必要です',
            zh: '需要登录',
            ko: '로그인 필요'
          }
        },
        permission_denied: {
          type: 'error' as MessageType,
          severity: 'high' as MessageSeverity,
          templates: {
            en: 'Permission denied',
            es: 'Permiso denegado',
            fr: 'Permission refusée',
            de: 'Zugriff verweigert',
            ja: 'アクセスが拒否されました',
            zh: '权限被拒绝',
            ko: '권한이 거부되었습니다'
          }
        },
        login_success: {
          type: 'success' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Login successful',
            es: 'Inicio de sesión exitoso',
            fr: 'Connexion réussie',
            de: 'Anmeldung erfolgreich',
            ja: 'ログイン成功',
            zh: '登录成功',
            ko: '로그인 성공'
          }
        },
        login_failed: {
          type: 'error' as MessageType,
          severity: 'high' as MessageSeverity,
          templates: {
            en: 'Login failed. Please check your credentials',
            es: 'Error al iniciar sesión. Verifica tus credenciales',
            fr: 'Échec de connexion. Vérifiez vos identifiants',
            de: 'Anmeldung fehlgeschlagen. Bitte überprüfen Sie Ihre Anmeldedaten',
            ja: 'ログインに失敗しました。認証情報を確認してください',
            zh: '登录失败。请检查您的凭据',
            ko: '로그인 실패. 자격 증명을 확인하세요'
          }
        },
        register_success: {
          type: 'success' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Registration successful. Welcome!',
            es: 'Registro exitoso. ¡Bienvenido!',
            fr: 'Inscription réussie. Bienvenue!',
            de: 'Registrierung erfolgreich. Willkommen!',
            ja: '登録成功。ようこそ！',
            zh: '注册成功。欢迎！',
            ko: '등록 성공. 환영합니다!'
          }
        },
        register_failed: {
          type: 'error' as MessageType,
          severity: 'high' as MessageSeverity,
          templates: {
            en: 'Registration failed. Please try again',
            es: 'Registro fallido. Por favor intenta de nuevo',
            fr: 'Échec de l\'inscription. Veuillez réessayer',
            de: 'Registrierung fehlgeschlagen. Bitte versuchen Sie es erneut',
            ja: '登録に失敗しました。もう一度お試しください',
            zh: '注册失败。请重试',
            ko: '등록 실패. 다시 시도해주세요'
          }
        },
        email_already_exists: {
          type: 'error' as MessageType,
          severity: 'medium' as MessageSeverity,
          templates: {
            en: 'Email already exists',
            es: 'El correo electrónico ya existe',
            fr: 'Cet email existe déjà',
            de: 'E-Mail existiert bereits',
            ja: 'メールアドレスは既に存在します',
            zh: '电子邮件已存在',
            ko: '이메일이 이미 존재합니다'
          }
        },
        password_reset_sent: {
          type: 'success' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Password reset link sent to your email',
            es: 'Enlace de restablecimiento enviado a tu correo',
            fr: 'Lien de réinitialisation envoyé à votre email',
            de: 'Passwort-Reset-Link wurde an Ihre E-Mail gesendet',
            ja: 'パスワードリセットリンクをメールに送信しました',
            zh: '密码重置链接已发送到您的邮箱',
            ko: '비밀번호 재설정 링크가 이메일로 전송되었습니다'
          }
        },
        password_reset_failed: {
          type: 'error' as MessageType,
          severity: 'high' as MessageSeverity,
          templates: {
            en: 'Failed to send password reset email',
            es: 'Error al enviar el correo de restablecimiento',
            fr: 'Échec de l\'envoi de l\'email de réinitialisation',
            de: 'Fehler beim Senden der Passwort-Reset-E-Mail',
            ja: 'パスワードリセットメールの送信に失敗しました',
            zh: '发送密码重置邮件失败',
            ko: '비밀번호 재설정 이메일 전송 실패'
          }
        },
        verification_code_sent: {
          type: 'success' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Verification code sent',
            es: 'Código de verificación enviado',
            fr: 'Code de vérification envoyé',
            de: 'Verifizierungscode gesendet',
            ja: '確認コードを送信しました',
            zh: '验证码已发送',
            ko: '인증 코드가 전송되었습니다'
          }
        },
        verification_failed: {
          type: 'error' as MessageType,
          severity: 'high' as MessageSeverity,
          templates: {
            en: 'Verification failed. Invalid code',
            es: 'Verificación fallida. Código inválido',
            fr: 'Échec de la vérification. Code invalide',
            de: 'Verifizierung fehlgeschlagen. Ungültiger Code',
            ja: '確認に失敗しました。無効なコードです',
            zh: '验证失败。无效的代码',
            ko: '인증 실패. 잘못된 코드입니다'
          }
        },
        logout_success: {
          type: 'success' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Successfully logged out',
            es: 'Sesión cerrada exitosamente',
            fr: 'Déconnexion réussie',
            de: 'Erfolgreich abgemeldet',
            ja: 'ログアウトしました',
            zh: '成功退出登录',
            ko: '성공적으로 로그아웃되었습니다'
          }
        },
        session_expired: {
          type: 'warning' as MessageType,
          severity: 'medium' as MessageSeverity,
          templates: {
            en: 'Your session has expired. Please login again',
            es: 'Tu sesión ha expirado. Por favor inicia sesión nuevamente',
            fr: 'Votre session a expiré. Veuillez vous reconnecter',
            de: 'Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an',
            ja: 'セッションの有効期限が切れました。再度ログインしてください',
            zh: '您的会话已过期。请重新登录',
            ko: '세션이 만료되었습니다. 다시 로그인해주세요'
          }
        }
      },
      network: {
        error: {
          type: 'error' as MessageType,
          severity: 'high' as MessageSeverity,
          templates: {
            en: 'Network error',
            es: 'Error de red',
            fr: 'Erreur réseau',
            de: 'Netzwerkfehler',
            ja: 'ネットワークエラー',
            zh: '网络错误',
            ko: '네트워크 오류'
          }
        }
      }
    }
  },

  // Email Templates
  email: {
    templates: {
      passwordReset: {
        name: {
          type: 'info' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Password Reset Email',
            es: 'Correo de Restablecimiento de Contraseña',
            fr: 'Email de Réinitialisation de Mot de Passe',
            de: 'Passwort-Zurücksetzungs-E-Mail',
            ja: 'パスワードリセットメール',
            zh: '密码重置邮件',
            ko: '비밀번호 재설정 이메일'
          }
        },
        subject: {
          type: 'info' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Password Reset Request',
            es: 'Solicitud de Restablecimiento de Contraseña',
            fr: 'Demande de Réinitialisation de Mot de Passe',
            de: 'Anfrage zum Zurücksetzen des Passworts',
            ja: 'パスワードリセットのリクエスト',
            zh: '密码重置请求',
            ko: '비밀번호 재설정 요청'
          }
        },
        title: {
          type: 'info' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Password Reset Request',
            es: 'Solicitud de Restablecimiento de Contraseña',
            fr: 'Demande de Réinitialisation de Mot de Passe',
            de: 'Anfrage zum Zurücksetzen des Passworts',
            ja: 'パスワードリセットのリクエスト',
            zh: '密码重置请求',
            ko: '비밀번호 재설정 요청'
          }
        },
        intro: {
          type: 'info' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'We received a request to reset your password.',
            es: 'Recibimos una solicitud para restablecer tu contraseña.',
            fr: 'Nous avons reçu une demande de réinitialisation de votre mot de passe.',
            de: 'Wir haben eine Anfrage zum Zurücksetzen Ihres Passworts erhalten.',
            ja: 'パスワードのリセットリクエストを受け取りました。',
            zh: '我们收到了重置您密码的请求。',
            ko: '비밀번호 재설정 요청을 받았습니다.'
          }
        },
        clickButton: {
          type: 'info' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Click the button below to reset your password:',
            es: 'Haz clic en el botón de abajo para restablecer tu contraseña:',
            fr: 'Cliquez sur le bouton ci-dessous pour réinitialiser votre mot de passe:',
            de: 'Klicken Sie auf die Schaltfläche unten, um Ihr Passwort zurückzusetzen:',
            ja: '以下のボタンをクリックしてパスワードをリセットしてください：',
            zh: '点击下面的按钮重置您的密码：',
            ko: '아래 버튼을 클릭하여 비밀번호를 재설정하세요:'
          }
        },
        buttonText: {
          type: 'info' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Reset Password',
            es: 'Restablecer Contraseña',
            fr: 'Réinitialiser le Mot de Passe',
            de: 'Passwort Zurücksetzen',
            ja: 'パスワードをリセット',
            zh: '重置密码',
            ko: '비밀번호 재설정'
          }
        },
        linkExpiry: {
          type: 'info' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'This link will expire in 24 hours.',
            es: 'Este enlace expirará en 24 horas.',
            fr: 'Ce lien expirera dans 24 heures.',
            de: 'Dieser Link läuft in 24 Stunden ab.',
            ja: 'このリンクは24時間で有効期限が切れます。',
            zh: '此链接将在24小时后过期。',
            ko: '이 링크는 24시간 후에 만료됩니다.'
          }
        },
        notRequested: {
          type: 'info' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'If you didn\'t request this, please ignore this email.',
            es: 'Si no solicitaste esto, por favor ignora este correo.',
            fr: 'Si vous n\'avez pas demandé cela, veuillez ignorer cet email.',
            de: 'Wenn Sie dies nicht angefordert haben, ignorieren Sie bitte diese E-Mail.',
            ja: 'このリクエストに心当たりがない場合は、このメールを無視してください。',
            zh: '如果您没有请求此操作，请忽略此邮件。',
            ko: '이 요청을 하지 않으셨다면 이 이메일을 무시해주세요.'
          }
        }
      },
      verificationCode: {
        name: {
          type: 'info' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Verification Code Email',
            es: 'Correo de Código de Verificación',
            fr: 'Email de Code de Vérification',
            de: 'Verifizierungscode-E-Mail',
            ja: '確認コードメール',
            zh: '验证码邮件',
            ko: '인증 코드 이메일'
          }
        },
        subject: {
          type: 'info' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Your Verification Code: {code}',
            es: 'Tu Código de Verificación: {code}',
            fr: 'Votre Code de Vérification: {code}',
            de: 'Ihr Verifizierungscode: {code}',
            ja: '確認コード: {code}',
            zh: '您的验证码: {code}',
            ko: '인증 코드: {code}'
          },
          variables: ['code']
        },
        title: {
          type: 'info' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Verification Code',
            es: 'Código de Verificación',
            fr: 'Code de Vérification',
            de: 'Verifizierungscode',
            ja: '確認コード',
            zh: '验证码',
            ko: '인증 코드'
          }
        },
        yourCode: {
          type: 'info' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Your verification code is:',
            es: 'Tu código de verificación es:',
            fr: 'Votre code de vérification est:',
            de: 'Ihr Verifizierungscode lautet:',
            ja: 'あなたの確認コードは：',
            zh: '您的验证码是：',
            ko: '인증 코드:'
          }
        },
        useCode: {
          type: 'info' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Use this code to complete your registration or login.',
            es: 'Usa este código para completar tu registro o inicio de sesión.',
            fr: 'Utilisez ce code pour terminer votre inscription ou connexion.',
            de: 'Verwenden Sie diesen Code, um Ihre Registrierung oder Anmeldung abzuschließen.',
            ja: '登録またはログインを完了するには、このコードを使用してください。',
            zh: '使用此代码完成您的注册或登录。',
            ko: '이 코드를 사용하여 등록 또는 로그인을 완료하세요.'
          }
        },
        codeExpiry: {
          type: 'info' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'This code will expire in 10 minutes.',
            es: 'Este código expirará en 10 minutos.',
            fr: 'Ce code expirera dans 10 minutes.',
            de: 'Dieser Code läuft in 10 Minuten ab.',
            ja: 'このコードは10分で有効期限が切れます。',
            zh: '此代码将在10分钟后过期。',
            ko: '이 코드는 10분 후에 만료됩니다.'
          }
        }
      },
      welcome: {
        name: {
          type: 'info' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Welcome Email',
            es: 'Correo de Bienvenida',
            fr: 'Email de Bienvenue',
            de: 'Willkommens-E-Mail',
            ja: 'ウェルカムメール',
            zh: '欢迎邮件',
            ko: '환영 이메일'
          }
        },
        subject: {
          type: 'info' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Welcome to {appName}!',
            es: '¡Bienvenido a {appName}!',
            fr: 'Bienvenue sur {appName}!',
            de: 'Willkommen bei {appName}!',
            ja: '{appName}へようこそ！',
            zh: '欢迎来到{appName}！',
            ko: '{appName}에 오신 것을 환영합니다!'
          },
          variables: ['appName']
        },
        title: {
          type: 'info' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Welcome Aboard!',
            es: '¡Bienvenido a Bordo!',
            fr: 'Bienvenue à Bord!',
            de: 'Willkommen an Bord!',
            ja: 'ようこそ！',
            zh: '欢迎加入！',
            ko: '환영합니다!'
          }
        },
        greeting: {
          type: 'info' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Hi {recipientName},',
            es: 'Hola {recipientName},',
            fr: 'Bonjour {recipientName},',
            de: 'Hallo {recipientName},',
            ja: 'こんにちは {recipientName}さん、',
            zh: '你好 {recipientName}，',
            ko: '안녕하세요 {recipientName}님,'
          },
          variables: ['recipientName']
        },
        accountCreated: {
          type: 'info' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Your account has been successfully created!',
            es: '¡Tu cuenta ha sido creada exitosamente!',
            fr: 'Votre compte a été créé avec succès!',
            de: 'Ihr Konto wurde erfolgreich erstellt!',
            ja: 'アカウントが正常に作成されました！',
            zh: '您的账户已成功创建！',
            ko: '계정이 성공적으로 생성되었습니다!'
          }
        },
        readyToExplore: {
          type: 'info' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'You\'re all set to start exploring and creating amazing stories.',
            es: 'Estás listo para comenzar a explorar y crear historias increíbles.',
            fr: 'Vous êtes prêt à explorer et créer des histoires incroyables.',
            de: 'Sie können jetzt erstaunliche Geschichten erkunden und erstellen.',
            ja: '素晴らしいストーリーを探索し、作成する準備ができました。',
            zh: '您已准备好开始探索和创作精彩的故事。',
            ko: '놀라운 이야기를 탐색하고 만들 준비가 되었습니다.'
          }
        },
        getStartedButton: {
          type: 'info' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Get Started',
            es: 'Comenzar',
            fr: 'Commencer',
            de: 'Loslegen',
            ja: '始める',
            zh: '开始使用',
            ko: '시작하기'
          }
        }
      },
      twoFactorCode: {
        name: {
          type: 'info' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Two-Factor Authentication Code',
            es: 'Código de Autenticación de Dos Factores',
            fr: 'Code d\'Authentification à Deux Facteurs',
            de: 'Zwei-Faktor-Authentifizierungscode',
            ja: '二要素認証コード',
            zh: '双因素认证代码',
            ko: '2단계 인증 코드'
          }
        },
        subject: {
          type: 'info' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Your Two-Factor Authentication Code',
            es: 'Tu Código de Autenticación de Dos Factores',
            fr: 'Votre Code d\'Authentification à Deux Facteurs',
            de: 'Ihr Zwei-Faktor-Authentifizierungscode',
            ja: 'あなたの二要素認証コード',
            zh: '您的双因素认证代码',
            ko: '2단계 인증 코드'
          }
        },
        title: {
          type: 'info' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Two-Factor Authentication',
            es: 'Autenticación de Dos Factores',
            fr: 'Authentification à Deux Facteurs',
            de: 'Zwei-Faktor-Authentifizierung',
            ja: '二要素認証',
            zh: '双因素认证',
            ko: '2단계 인증'
          }
        },
        codeText: {
          type: 'info' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Your authentication code is:',
            es: 'Tu código de autenticación es:',
            fr: 'Votre code d\'authentification est:',
            de: 'Ihr Authentifizierungscode lautet:',
            ja: 'あなたの認証コードは：',
            zh: '您的认证代码是：',
            ko: '인증 코드:'
          }
        },
        enterCode: {
          type: 'info' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Enter this code to complete your login.',
            es: 'Ingresa este código para completar tu inicio de sesión.',
            fr: 'Entrez ce code pour terminer votre connexion.',
            de: 'Geben Sie diesen Code ein, um Ihre Anmeldung abzuschließen.',
            ja: 'ログインを完了するには、このコードを入力してください。',
            zh: '输入此代码以完成登录。',
            ko: '로그인을 완료하려면 이 코드를 입력하세요.'
          }
        },
        validFor: {
          type: 'info' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'This code is valid for 5 minutes.',
            es: 'Este código es válido por 5 minutos.',
            fr: 'Ce code est valide pendant 5 minutes.',
            de: 'Dieser Code ist 5 Minuten lang gültig.',
            ja: 'このコードは5分間有効です。',
            zh: '此代码有效期为5分钟。',
            ko: '이 코드는 5분간 유효합니다.'
          }
        }
      },
      roleplayInvitation: {
        name: {
          type: 'info' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Roleplay Invitation',
            es: 'Invitación de Juego de Rol',
            fr: 'Invitation au Jeu de Rôle',
            de: 'Rollenspiel-Einladung',
            ja: 'ロールプレイ招待',
            zh: '角色扮演邀请',
            ko: '롤플레이 초대'
          }
        },
        subject: {
          type: 'info' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'You\'re invited to join a roleplay: {roleplayTitle}',
            es: 'Estás invitado a unirte a un juego de rol: {roleplayTitle}',
            fr: 'Vous êtes invité à rejoindre un jeu de rôle: {roleplayTitle}',
            de: 'Sie sind eingeladen, an einem Rollenspiel teilzunehmen: {roleplayTitle}',
            ja: 'ロールプレイに招待されました: {roleplayTitle}',
            zh: '您被邀请加入角色扮演: {roleplayTitle}',
            ko: '롤플레이에 초대되었습니다: {roleplayTitle}'
          },
          variables: ['roleplayTitle']
        },
        title: {
          type: 'info' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Roleplay Invitation',
            es: 'Invitación de Juego de Rol',
            fr: 'Invitation au Jeu de Rôle',
            de: 'Rollenspiel-Einladung',
            ja: 'ロールプレイ招待',
            zh: '角色扮演邀请',
            ko: '롤플레이 초대'
          }
        },
        greeting: {
          type: 'info' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Hi {recipientName},',
            es: 'Hola {recipientName},',
            fr: 'Bonjour {recipientName},',
            de: 'Hallo {recipientName},',
            ja: 'こんにちは {recipientName}さん、',
            zh: '你好 {recipientName}，',
            ko: '안녕하세요 {recipientName}님,'
          },
          variables: ['recipientName']
        },
        inviteText: {
          type: 'info' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: '{senderName} has invited you to participate in a roleplay.',
            es: '{senderName} te ha invitado a participar en un juego de rol.',
            fr: '{senderName} vous a invité à participer à un jeu de rôle.',
            de: '{senderName} hat Sie eingeladen, an einem Rollenspiel teilzunehmen.',
            ja: '{senderName}さんがロールプレイに招待しました。',
            zh: '{senderName}邀请您参与角色扮演。',
            ko: '{senderName}님이 롤플레이에 초대했습니다.'
          },
          variables: ['senderName']
        },
        roleInfo: {
          type: 'info' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'You\'ll be playing: {characterName}',
            es: 'Interpretarás a: {characterName}',
            fr: 'Vous jouerez: {characterName}',
            de: 'Sie werden spielen: {characterName}',
            ja: 'あなたの役: {characterName}',
            zh: '您将扮演: {characterName}',
            ko: '당신의 역할: {characterName}'
          },
          variables: ['characterName']
        },
        joinButton: {
          type: 'info' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'Join Roleplay',
            es: 'Unirse al Juego de Rol',
            fr: 'Rejoindre le Jeu de Rôle',
            de: 'Rollenspiel Beitreten',
            ja: 'ロールプレイに参加',
            zh: '加入角色扮演',
            ko: '롤플레이 참여'
          }
        },
        linkExpiry: {
          type: 'info' as MessageType,
          severity: 'low' as MessageSeverity,
          templates: {
            en: 'This invitation expires in 7 days.',
            es: 'Esta invitación expira en 7 días.',
            fr: 'Cette invitation expire dans 7 jours.',
            de: 'Diese Einladung läuft in 7 Tagen ab.',
            ja: 'この招待は7日で有効期限が切れます。',
            zh: '此邀请将在7天后过期。',
            ko: '이 초대는 7일 후에 만료됩니다.'
          }
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