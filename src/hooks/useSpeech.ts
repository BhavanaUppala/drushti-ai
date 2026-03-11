import { useCallback, useRef, useState } from "react";

const TTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-tts`;

const langMap: Record<string, string> = {
  en: "en-IN", hi: "hi-IN", te: "te-IN", ta: "ta-IN", kn: "kn-IN",
  ml: "ml-IN", mr: "mr-IN", bn: "bn-IN", gu: "gu-IN", pa: "pa-IN",
  ur: "ur-IN", od: "or-IN", as: "as-IN",
};

export function useSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const preUnlockedAudioRef = useRef<HTMLAudioElement | null>(null);
  const onEndCallbackRef = useRef<(() => void) | null>(null);

  const unlock = useCallback(() => {
    const audio = new Audio();
    audio.play().catch(() => {});
    audio.preload = "auto";
    preUnlockedAudioRef.current = audio;
  }, []);

  const speak = useCallback(async (text: string, language: string = "en", onEnd?: () => void) => {
    if (!text || text.trim().length === 0) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    onEndCallbackRef.current = onEnd || null;
    setIsSpeaking(true);

    try {
      const response = await fetch(TTS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ text, language }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `TTS failed: ${response.status}`);
      }

      const data = await response.json();
      if (!data.audioContent) throw new Error("No audio received");

      const audioUrl = `data:audio/mpeg;base64,${data.audioContent}`;
      const audio = preUnlockedAudioRef.current || new Audio();
      preUnlockedAudioRef.current = null;

      audio.src = audioUrl;
      audio.onended = () => {
        setIsSpeaking(false);
        audioRef.current = null;
        onEndCallbackRef.current?.();
        onEndCallbackRef.current = null;
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        audioRef.current = null;
        onEndCallbackRef.current?.();
        onEndCallbackRef.current = null;
      };

      audioRef.current = audio;
      await audio.play();
    } catch (err) {
      console.error("Cloud TTS error:", err);
      setIsSpeaking(false);
      fallbackBrowserTTS(text, language, () => {
        onEndCallbackRef.current?.();
        onEndCallbackRef.current = null;
      });
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    onEndCallbackRef.current = null;
    setIsSpeaking(false);
  }, []);

  return { speak, stop, isSpeaking, unlock };
}

function fallbackBrowserTTS(text: string, language: string, onEnd?: () => void) {
  if (!("speechSynthesis" in window)) {
    onEnd?.();
    return;
  }

  const langCode = langMap[language] || "en-IN";
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = langCode;
  utterance.rate = 0.85;
  utterance.pitch = 1.05;

  const voices = window.speechSynthesis.getVoices();
  const voice =
    voices.find((v) => v.lang === langCode) ||
    voices.find((v) => v.lang.startsWith(language));
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  }

  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();

  window.speechSynthesis.speak(utterance);
}
