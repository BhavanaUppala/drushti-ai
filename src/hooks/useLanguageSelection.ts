import { useState, useCallback, useRef } from "react";
import { SUPPORTED_LANGUAGES, LANGUAGE_KEYWORDS, LANGUAGE_MAP } from "@/lib/languages";

export function useLanguageSelection() {
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const selectedRef = useRef<string | null>(null);

  const detectLanguageFromText = useCallback((text: string): string | null => {
    const lower = text.toLowerCase().trim();
    
    // Check exact and partial matches against keyword map
    for (const [keyword, code] of Object.entries(LANGUAGE_KEYWORDS)) {
      if (lower.includes(keyword.toLowerCase())) {
        return code;
      }
    }

    // Check if user said a number (1-13) corresponding to language list
    const numberWords: Record<string, number> = {
      "1": 0, one: 0, ek: 0, "एक": 0,
      "2": 1, two: 1, do: 1, "दो": 1,
      "3": 2, three: 2, teen: 2, "तीन": 2,
      "4": 3, four: 3, char: 3, "चार": 3,
      "5": 4, five: 4, paanch: 4, "पाँच": 4,
      "6": 5, six: 5, chhe: 5, "छह": 5,
      "7": 6, seven: 6, saat: 6, "सात": 6,
      "8": 7, eight: 7, aath: 7, "आठ": 7,
      "9": 8, nine: 8, nau: 8, "नौ": 8,
      "10": 9, ten: 9, das: 9, "दस": 9,
      "11": 10, eleven: 10, gyarah: 10, "ग्यारह": 10,
      "12": 11, twelve: 11, barah: 11, "बारह": 11,
      "13": 12, thirteen: 12, terah: 12, "तेरह": 12,
    };

    for (const [word, idx] of Object.entries(numberWords)) {
      if (lower.includes(word) && idx < SUPPORTED_LANGUAGES.length) {
        return SUPPORTED_LANGUAGES[idx].code;
      }
    }

    return null;
  }, []);

  const selectLanguage = useCallback((code: string) => {
    if (LANGUAGE_MAP.has(code)) {
      setSelectedLanguage(code);
      selectedRef.current = code;
      setIsSelecting(false);
    }
  }, []);

  const autoDetectFromAI = useCallback((langCode: string) => {
    // Called when AI returns a language tag and no language was selected yet
    if (!selectedRef.current && LANGUAGE_MAP.has(langCode)) {
      setSelectedLanguage(langCode);
      selectedRef.current = langCode;
      setIsSelecting(false);
    }
  }, []);

  const startSelection = useCallback(() => {
    setIsSelecting(true);
  }, []);

  const getLanguagePrompt = useCallback((): string => {
    const langList = SUPPORTED_LANGUAGES.map((l, i) => 
      `${i + 1}. ${l.name} - ${l.nativeName}`
    ).join(". ");
    
    return `Welcome to Drushti AI, your vision assistant. Please choose your language by saying the language name or number. ${langList}. Or just start speaking, and I will detect your language automatically.`;
  }, []);

  return {
    selectedLanguage,
    isSelecting,
    selectLanguage,
    detectLanguageFromText,
    autoDetectFromAI,
    startSelection,
    getLanguagePrompt,
  };
}
