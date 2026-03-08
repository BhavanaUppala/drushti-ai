import { useCallback, useRef, useState } from "react";

const langMap: Record<string, string> = {
  en: "en-IN",
  hi: "hi-IN",
  te: "te-IN",
};

export function useSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = useCallback((text: string, language: string = "en") => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langMap[language] || "en-IN";
    utterance.rate = 0.85;
    utterance.pitch = 1.05;
    utterance.volume = 1;

    // Try to pick a voice matching the language
    const voices = window.speechSynthesis.getVoices();
    const langCode = langMap[language] || "en-IN";
    const matchedVoice = voices.find(v => v.lang === langCode) || voices.find(v => v.lang.startsWith(langCode.split("-")[0]));
    if (matchedVoice) utterance.voice = matchedVoice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  return { speak, stop, isSpeaking };
}
