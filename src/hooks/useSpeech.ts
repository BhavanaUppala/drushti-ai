import { useCallback, useRef, useState, useEffect } from "react";

const langMap: Record<string, string> = {
  en: "en-IN",
  hi: "hi-IN",
  te: "te-IN",
};

function findBestVoice(voices: SpeechSynthesisVoice[], langCode: string): SpeechSynthesisVoice | null {
  const langPrefix = langCode.split("-")[0];

  // Prefer Google voices (they sound more natural)
  const googleExact = voices.find(v => v.lang === langCode && v.name.toLowerCase().includes("google"));
  if (googleExact) return googleExact;

  // Exact match
  let v = voices.find(v => v.lang === langCode);
  if (v) return v;

  // Google prefix match
  const googlePrefix = voices.find(v => v.lang.startsWith(langPrefix) && v.name.toLowerCase().includes("google"));
  if (googlePrefix) return googlePrefix;

  // Prefix match
  v = voices.find(v => v.lang.startsWith(langPrefix));
  if (v) return v;

  // Name-based match
  const nameKeywords: Record<string, string[]> = {
    te: ["telugu", "తెలుగు"],
    hi: ["hindi", "हिन्दी", "हिंदी"],
    en: ["english"],
  };
  const keywords = nameKeywords[langPrefix] || [];
  v = voices.find(vx => keywords.some(k => vx.name.toLowerCase().includes(k)));
  if (v) return v;

  return null;
}

export function useSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const unlockedRef = useRef(false);
  const voicesLoadedRef = useRef(false);

  // Pre-load voices
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const loadVoices = () => {
      const v = window.speechSynthesis.getVoices();
      if (v.length > 0) voicesLoadedRef.current = true;
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  const unlock = useCallback(() => {
    if (unlockedRef.current) return;
    if (!("speechSynthesis" in window)) return;
    const silent = new SpeechSynthesisUtterance("");
    silent.volume = 0;
    window.speechSynthesis.speak(silent);
    unlockedRef.current = true;
  }, []);

  const speak = useCallback((text: string, language: string = "en") => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();

    const doSpeak = () => {
      const langCode = langMap[language] || "en-IN";
      const voices = window.speechSynthesis.getVoices();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = langCode;
      // Natural speech: slightly slower, warm pitch
      utterance.rate = language === "te" ? 0.8 : 0.85;
      utterance.pitch = 1.05;
      utterance.volume = 1;

      const matchedVoice = findBestVoice(voices, langCode);
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      } else if (language !== "en") {
        const fallbackLang = language === "te" ? "hi-IN" : "en-IN";
        const fallbackVoice = findBestVoice(voices, fallbackLang) || findBestVoice(voices, "en-IN");
        if (fallbackVoice) utterance.voice = fallbackVoice;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    };

    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) {
      const onVoicesReady = () => {
        window.speechSynthesis.onvoiceschanged = null;
        doSpeak();
      };
      window.speechSynthesis.onvoiceschanged = onVoicesReady;
      setTimeout(() => {
        window.speechSynthesis.onvoiceschanged = null;
        doSpeak();
      }, 500);
    } else {
      doSpeak();
    }
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  return { speak, stop, isSpeaking, unlock };
}
