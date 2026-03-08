import { useCallback, useRef, useState } from "react";

const langMap: Record<string, string> = {
  en: "en-IN",
  hi: "hi-IN",
  te: "te-IN",
};

export function useSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const unlockedRef = useRef(false);

  // Unlock speechSynthesis from a user gesture context (required on mobile)
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

    // Retry mechanism: on some mobile browsers, voices load lazily
    const attemptSpeak = (retries: number) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = langMap[language] || "en-IN";
      utterance.rate = 0.85;
      utterance.pitch = 1.05;
      utterance.volume = 1;

      const voices = window.speechSynthesis.getVoices();
      const langCode = langMap[language] || "en-IN";
      const matchedVoice =
        voices.find(v => v.lang === langCode) ||
        voices.find(v => v.lang.startsWith(langCode.split("-")[0]));
      if (matchedVoice) utterance.voice = matchedVoice;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = (e) => {
        // If blocked/canceled and we have retries left, try again after a short delay
        if (retries > 0 && e.error !== "canceled") {
          setTimeout(() => attemptSpeak(retries - 1), 250);
        } else {
          setIsSpeaking(false);
        }
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    };

    attemptSpeak(2);
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  return { speak, stop, isSpeaking, unlock };
}
