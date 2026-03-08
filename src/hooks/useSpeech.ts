import { useCallback, useRef, useState } from "react";

const langMap: Record<string, string> = {
  en: "en-IN",
  hi: "hi-IN",
  te: "te-IN",
};

export function useSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Pre-unlock browser speech synthesis on user gesture (needed for iOS Safari)
  const unlock = useCallback(() => {
    if (!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance("");
    u.volume = 0;
    window.speechSynthesis.speak(u);
  }, []);

  const speak = useCallback((text: string, language: string = "en") => {
    if (!text || text.trim().length === 0) return;
    if (!("speechSynthesis" in window)) return;

    // Stop any current speech
    window.speechSynthesis.cancel();

    const langCode = langMap[language] || "en-IN";
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode;
    utterance.rate = 0.85;
    utterance.pitch = 1.05;

    // Try to find the best voice for this language
    const voices = window.speechSynthesis.getVoices();
    const voice =
      voices.find((v) => v.lang === langCode) ||
      voices.find((v) => v.lang.startsWith(language));

    // For Telugu, fall back to Hindi if no Telugu voice found
    if (!voice && language === "te") {
      const hindiVoice =
        voices.find((v) => v.lang === "hi-IN") ||
        voices.find((v) => v.lang.startsWith("hi"));
      if (hindiVoice) {
        utterance.voice = hindiVoice;
        utterance.lang = hindiVoice.lang;
      }
    } else if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      utteranceRef.current = null;
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      utteranceRef.current = null;
    };

    utteranceRef.current = utterance;
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }, []);

  const stop = useCallback(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    utteranceRef.current = null;
  }, []);

  return { speak, stop, isSpeaking, unlock };
}
