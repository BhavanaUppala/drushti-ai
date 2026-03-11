// Supported Indian languages with metadata for speech recognition, TTS, and UI
export interface LanguageConfig {
  code: string;
  name: string;           // English name
  nativeName: string;     // Name in native script
  speechRecogLang: string; // BCP-47 for SpeechRecognition
  greeting: string;       // "I speak [language]" in native
}

export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  { code: "en", name: "English",    nativeName: "English",    speechRecogLang: "en-IN", greeting: "I speak English" },
  { code: "hi", name: "Hindi",      nativeName: "हिन्दी",      speechRecogLang: "hi-IN", greeting: "मैं हिंदी बोलता हूँ" },
  { code: "te", name: "Telugu",     nativeName: "తెలుగు",     speechRecogLang: "te-IN", greeting: "నేను తెలుగు మాట్లాడతాను" },
  { code: "ta", name: "Tamil",      nativeName: "தமிழ்",      speechRecogLang: "ta-IN", greeting: "நான் தமிழ் பேசுகிறேன்" },
  { code: "kn", name: "Kannada",    nativeName: "ಕನ್ನಡ",      speechRecogLang: "kn-IN", greeting: "ನಾನು ಕನ್ನಡ ಮಾತನಾಡುತ್ತೇನೆ" },
  { code: "ml", name: "Malayalam",  nativeName: "മലയാളം",    speechRecogLang: "ml-IN", greeting: "ഞാൻ മലയാളം സംസാരിക്കുന്നു" },
  { code: "mr", name: "Marathi",    nativeName: "मराठी",      speechRecogLang: "mr-IN", greeting: "मी मराठी बोलतो" },
  { code: "bn", name: "Bengali",    nativeName: "বাংলা",      speechRecogLang: "bn-IN", greeting: "আমি বাংলা বলি" },
  { code: "gu", name: "Gujarati",   nativeName: "ગુજરાતી",    speechRecogLang: "gu-IN", greeting: "હું ગુજરાતી બોલું છું" },
  { code: "pa", name: "Punjabi",    nativeName: "ਪੰਜਾਬੀ",     speechRecogLang: "pa-IN", greeting: "ਮੈਂ ਪੰਜਾਬੀ ਬੋਲਦਾ ਹਾਂ" },
  { code: "ur", name: "Urdu",       nativeName: "اردو",       speechRecogLang: "ur-IN", greeting: "میں اردو بولتا ہوں" },
  { code: "od", name: "Odia",       nativeName: "ଓଡ଼ିଆ",      speechRecogLang: "or-IN", greeting: "ମୁଁ ଓଡ଼ିଆ କହେ" },
  { code: "as", name: "Assamese",   nativeName: "অসমীয়া",    speechRecogLang: "as-IN", greeting: "মই অসমীয়া কওঁ" },
];

export const LANGUAGE_MAP = new Map(SUPPORTED_LANGUAGES.map(l => [l.code, l]));

export const LANGUAGE_CODES = SUPPORTED_LANGUAGES.map(l => l.code);

// Loading/UI text per language
export const loadingText: Record<string, string> = {
  en: "Analyzing...",
  hi: "विश्लेषण हो रहा है...",
  te: "విశ్లేషిస్తోంది...",
  ta: "பகுப்பாய்வு செய்கிறது...",
  kn: "ವಿಶ್ಲೇಷಿಸಲಾಗುತ್ತಿದೆ...",
  ml: "വിശകലനം ചെയ്യുന്നു...",
  mr: "विश्लेषण होत आहे...",
  bn: "বিশ্লেষণ করা হচ্ছে...",
  gu: "વિશ્લેષણ થઈ રહ્યું છે...",
  pa: "ਵਿਸ਼ਲੇਸ਼ਣ ਹੋ ਰਿਹਾ ਹੈ...",
  ur: "تجزیہ ہو رہا ہے...",
  od: "ବିଶ୍ଳେଷଣ ହେଉଛି...",
  as: "বিশ্লেষণ হৈ আছে...",
};

export const readAloudText: Record<string, string> = {
  en: "Read Aloud",
  hi: "पढ़कर सुनाएं",
  te: "చదివి వినిపించు",
  ta: "படித்துக் காட்டு",
  kn: "ಓದಿ ಹೇಳಿ",
  ml: "വായിച്ചു കേൾപ്പിക്കൂ",
  mr: "वाचून दाखवा",
  bn: "পড়ে শোনাও",
  gu: "વાંચી સંભળાવો",
  pa: "ਪੜ੍ਹ ਕੇ ਸੁਣਾਓ",
  ur: "پڑھ کر سنائیں",
  od: "ପଢ଼ି ଶୁଣାନ୍ତୁ",
  as: "পঢ়ি শুনাওক",
};

export const stopText: Record<string, string> = {
  en: "Stop Reading",
  hi: "रुकें",
  te: "ఆపండి",
  ta: "நிறுத்து",
  kn: "ನಿಲ್ಲಿಸಿ",
  ml: "നിർത്തുക",
  mr: "थांबा",
  bn: "থামান",
  gu: "બંધ કરો",
  pa: "ਰੁਕੋ",
  ur: "رکیں",
  od: "ବନ୍ଦ କରନ୍ତୁ",
  as: "ৰৈ যাওক",
};

// Language detection keywords mapping (spoken language name -> code)
export const LANGUAGE_KEYWORDS: Record<string, string> = {
  // English keywords
  english: "en", hindi: "hi", telugu: "te", tamil: "ta", kannada: "kn",
  malayalam: "ml", marathi: "mr", bengali: "bn", bangla: "bn",
  gujarati: "gu", punjabi: "pa", urdu: "ur", odia: "od", oriya: "od",
  assamese: "as",
  // Hindi keywords
  "अंग्रेज़ी": "en", "हिंदी": "hi", "हिन्दी": "hi", "तेलुगु": "te",
  "तमिल": "ta", "कन्नड़": "kn", "मलयालम": "ml", "मराठी": "mr",
  "बंगाली": "bn", "बांग्ला": "bn", "गुजराती": "gu", "पंजाबी": "pa",
  "उर्दू": "ur", "ओडिया": "od", "असमिया": "as",
  // Native script keywords
  "తెలుగు": "te", "தமிழ்": "ta", "ಕನ್ನಡ": "kn", "മലയാളം": "ml",
  "মরাঠি": "mr", "বাংলা": "bn", "ગુજરાતી": "gu", "ਪੰਜਾਬੀ": "pa",
  "اردو": "ur", "ଓଡ଼ିଆ": "od", "অসমীয়া": "as",
};
