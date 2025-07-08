/**
 * Comprehensive list of world languages with ISO 639-1 codes
 * Includes native names and English names for better search
 */

export interface WorldLanguage {
  code: string;
  name: string;
  nativeName: string;
  rtl?: boolean; // Right-to-left languages
}

export const WORLD_LANGUAGES: WorldLanguage[] = [
  // Most common languages first
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'zh', name: 'Chinese (Simplified)', nativeName: '中文 (简体)' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '中文 (繁體)' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', rtl: true },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)', nativeName: 'Português (Brasil)' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'jv', name: 'Javanese', nativeName: 'Basa Jawa' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', rtl: true },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی', rtl: true },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ' },
  { code: 'my', name: 'Burmese', nativeName: 'မြန်မာဘာသာ' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'si', name: 'Sinhala', nativeName: 'සිංහල' },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', rtl: true },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'am', name: 'Amharic', nativeName: 'አማርኛ' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk' },
  { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina' },
  { code: 'bg', name: 'Bulgarian', nativeName: 'Български' },
  { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski' },
  { code: 'sr', name: 'Serbian', nativeName: 'Српски' },
  { code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių' },
  { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina' },
  { code: 'lv', name: 'Latvian', nativeName: 'Latviešu' },
  { code: 'et', name: 'Estonian', nativeName: 'Eesti' },
  { code: 'mk', name: 'Macedonian', nativeName: 'Македонски' },
  { code: 'sq', name: 'Albanian', nativeName: 'Shqip' },
  { code: 'ka', name: 'Georgian', nativeName: 'ქართული' },
  { code: 'az', name: 'Azerbaijani', nativeName: 'Azərbaycan' },
  { code: 'kk', name: 'Kazakh', nativeName: 'Қазақ' },
  { code: 'uz', name: 'Uzbek', nativeName: 'Oʻzbek' },
  { code: 'hy', name: 'Armenian', nativeName: 'Հայերեն' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu' },
  { code: 'tl', name: 'Tagalog', nativeName: 'Tagalog' },
  { code: 'mn', name: 'Mongolian', nativeName: 'Монгол' },
  { code: 'km', name: 'Khmer', nativeName: 'ភាសាខ្មែរ' },
  { code: 'lo', name: 'Lao', nativeName: 'ລາວ' },
  { code: 'gl', name: 'Galician', nativeName: 'Galego' },
  { code: 'eu', name: 'Basque', nativeName: 'Euskara' },
  { code: 'ca', name: 'Catalan', nativeName: 'Català' },
  { code: 'is', name: 'Icelandic', nativeName: 'Íslenska' },
  { code: 'mt', name: 'Maltese', nativeName: 'Malti' },
  { code: 'ga', name: 'Irish', nativeName: 'Gaeilge' },
  { code: 'cy', name: 'Welsh', nativeName: 'Cymraeg' },
  { code: 'af', name: 'Afrikaans', nativeName: 'Afrikaans' },
  { code: 'zu', name: 'Zulu', nativeName: 'isiZulu' },
  { code: 'xh', name: 'Xhosa', nativeName: 'isiXhosa' },
  { code: 'yo', name: 'Yoruba', nativeName: 'Yorùbá' },
  { code: 'ig', name: 'Igbo', nativeName: 'Igbo' },
  { code: 'ha', name: 'Hausa', nativeName: 'Hausa' },
  { code: 'so', name: 'Somali', nativeName: 'Soomaali' },
  { code: 'ti', name: 'Tigrinya', nativeName: 'ትግርኛ' },
  { code: 'eo', name: 'Esperanto', nativeName: 'Esperanto' },
  { code: 'la', name: 'Latin', nativeName: 'Latina' },
  { code: 'ky', name: 'Kyrgyz', nativeName: 'Кыргызча' },
  { code: 'tg', name: 'Tajik', nativeName: 'Тоҷикӣ' },
  { code: 'tk', name: 'Turkmen', nativeName: 'Türkmen' },
  { code: 'ps', name: 'Pashto', nativeName: 'پښتو', rtl: true },
  { code: 'ku', name: 'Kurdish', nativeName: 'Kurdî' },
  { code: 'sd', name: 'Sindhi', nativeName: 'سنڌي' },
  { code: 'bo', name: 'Tibetan', nativeName: 'བོད་སྐད' },
  { code: 'ug', name: 'Uyghur', nativeName: 'ئۇيغۇرچە', rtl: true },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া' },
  { code: 'ks', name: 'Kashmiri', nativeName: 'کٲشُر' },
  { code: 'sa', name: 'Sanskrit', nativeName: 'संस्कृतम्' },
  { code: 'gd', name: 'Scottish Gaelic', nativeName: 'Gàidhlig' },
  { code: 'lb', name: 'Luxembourgish', nativeName: 'Lëtzebuergesch' },
  { code: 'fy', name: 'Frisian', nativeName: 'Frysk' },
  { code: 'mi', name: 'Maori', nativeName: 'Te Reo Māori' },
  { code: 'haw', name: 'Hawaiian', nativeName: 'ʻŌlelo Hawaiʻi' },
  { code: 'sm', name: 'Samoan', nativeName: 'Gagana Samoa' },
  { code: 'to', name: 'Tongan', nativeName: 'lea faka-Tonga' },
  { code: 'fj', name: 'Fijian', nativeName: 'Vosa Vakaviti' },
  { code: 'mg', name: 'Malagasy', nativeName: 'Malagasy' },
  { code: 'sn', name: 'Shona', nativeName: 'chiShona' },
  { code: 'ny', name: 'Chichewa', nativeName: 'Chichewa' },
  { code: 'st', name: 'Sesotho', nativeName: 'Sesotho' },
  { code: 'tn', name: 'Tswana', nativeName: 'Setswana' },
  { code: 'lg', name: 'Luganda', nativeName: 'Luganda' },
  { code: 'rw', name: 'Kinyarwanda', nativeName: 'Ikinyarwanda' },
  { code: 'wo', name: 'Wolof', nativeName: 'Wolof' },
  { code: 'ff', name: 'Fulah', nativeName: 'Fulfulde' },
  { code: 'bm', name: 'Bambara', nativeName: 'Bamanankan' },
  { code: 'ln', name: 'Lingala', nativeName: 'Lingála' },
  { code: 'kg', name: 'Kongo', nativeName: 'Kikongo' },
  { code: 'ak', name: 'Akan', nativeName: 'Akan' },
  { code: 'tw', name: 'Twi', nativeName: 'Twi' },
  { code: 'yi', name: 'Yiddish', nativeName: 'ייִדיש', rtl: true },
  { code: 'ht', name: 'Haitian Creole', nativeName: 'Kreyòl Ayisyen' },
  { code: 'qu', name: 'Quechua', nativeName: 'Runa Simi' },
  { code: 'ay', name: 'Aymara', nativeName: 'Aymar aru' },
  { code: 'gn', name: 'Guarani', nativeName: 'Avañeʼẽ' },
  { code: 'jw', name: 'Javanese', nativeName: 'Basa Jawa' },
  { code: 'su', name: 'Sundanese', nativeName: 'Basa Sunda' },
  { code: 'ceb', name: 'Cebuano', nativeName: 'Cebuano' },
  { code: 'ilo', name: 'Ilocano', nativeName: 'Ilokano' },
  { code: 'hil', name: 'Hiligaynon', nativeName: 'Hiligaynon' },
  { code: 'bik', name: 'Bikol', nativeName: 'Bikol' },
  { code: 'war', name: 'Waray', nativeName: 'Waray' },
  { code: 'pam', name: 'Kapampangan', nativeName: 'Kapampangan' },
  { code: 'bcl', name: 'Central Bikol', nativeName: 'Bikol Sentral' },
  { code: 'mai', name: 'Maithili', nativeName: 'मैथिली' },
  { code: 'bho', name: 'Bhojpuri', nativeName: 'भोजपुरी' },
  { code: 'mag', name: 'Magahi', nativeName: 'मगही' },
  { code: 'hne', name: 'Chhattisgarhi', nativeName: 'छत्तीसगढ़ी' },
  { code: 'raj', name: 'Rajasthani', nativeName: 'राजस्थानी' },
  { code: 'dv', name: 'Dhivehi', nativeName: 'ދިވެހި', rtl: true },
  { code: 'pi', name: 'Pali', nativeName: 'पालि' }
];

/**
 * Get language by code
 */
export function getLanguageByCode(code: string): WorldLanguage | undefined {
  return WORLD_LANGUAGES.find(lang => lang.code === code || lang.code.split('-')[0] === code);
}

/**
 * Search languages by name (English or native)
 */
export function searchLanguages(query: string): WorldLanguage[] {
  const lowerQuery = query.toLowerCase();
  return WORLD_LANGUAGES.filter(lang => 
    lang.name.toLowerCase().includes(lowerQuery) ||
    lang.nativeName.toLowerCase().includes(lowerQuery) ||
    lang.code.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get locale string for a language code
 */
export function getLocaleForLanguage(code: string): string {
  // Map simple codes to full locales
  const localeMap: Record<string, string> = {
    'en': 'en-US',
    'zh': 'zh-CN',
    'es': 'es-ES',
    'pt': 'pt-PT',
    'ar': 'ar-SA',
    'hi': 'hi-IN',
    'bn': 'bn-BD',
    'pa': 'pa-IN',
    'ta': 'ta-IN',
    'te': 'te-IN',
    'mr': 'mr-IN',
    'gu': 'gu-IN',
    'kn': 'kn-IN',
    'ml': 'ml-IN',
    'or': 'or-IN',
    'as': 'as-IN',
    'ne': 'ne-NP',
    'si': 'si-LK',
    'my': 'my-MM',
    'km': 'km-KH',
    'lo': 'lo-LA',
    'th': 'th-TH',
    'vi': 'vi-VN',
    'id': 'id-ID',
    'ms': 'ms-MY',
    'tl': 'tl-PH',
    'ja': 'ja-JP',
    'ko': 'ko-KR',
    'de': 'de-DE',
    'fr': 'fr-FR',
    'it': 'it-IT',
    'ru': 'ru-RU',
    'uk': 'uk-UA',
    'pl': 'pl-PL',
    'nl': 'nl-NL',
    'sv': 'sv-SE',
    'no': 'no-NO',
    'da': 'da-DK',
    'fi': 'fi-FI',
    'is': 'is-IS',
    'el': 'el-GR',
    'tr': 'tr-TR',
    'he': 'he-IL',
    'fa': 'fa-IR',
    'ur': 'ur-PK',
    'sw': 'sw-KE',
    'am': 'am-ET',
    'ti': 'ti-ET',
    'so': 'so-SO',
    'ha': 'ha-NG',
    'yo': 'yo-NG',
    'ig': 'ig-NG',
    'zu': 'zu-ZA',
    'xh': 'xh-ZA',
    'af': 'af-ZA'
  };

  // Return mapped locale or construct from code
  return localeMap[code] || code;
}