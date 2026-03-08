import { useCallback, useRef, useState } from "react";

type CommandHandler = (command: string) => void;

const langMap: Record<string, string> = {
  en: "en-IN",
  hi: "hi-IN",
  te: "te-IN",
};

export function useVoiceCommand(onCommand: CommandHandler, language: string = "en") {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const startListening = useCallback(() => {
    // Pre-unlock TTS in user gesture context so async responses can speak
    if ("speechSynthesis" in window) {
      const silent = new SpeechSynthesisUtterance("");
      silent.volume = 0;
      window.speechSynthesis.speak(silent);
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    // Stop any existing session first
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (_) {}
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;

    // Telugu speech recognition is poorly supported on most browsers/devices.
    // Use Hindi as the recognition language for Telugu users (better Indic support),
    // while still matching Telugu keywords from the transcript.
    const recLang = language === "te" ? "hi-IN" : (langMap[language] || "en-IN");
    recognition.lang = recLang;

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      // Check all alternatives for best match
      const results = event.results[0];
      const transcripts: string[] = [];
      for (let i = 0; i < results.length; i++) {
        transcripts.push(results[i].transcript.toLowerCase().trim());
      }
      // Send the primary transcript, but pass all for matching
      onCommand(transcripts.join(" | "));
    };
    recognition.onerror = (e: any) => {
      console.log("Speech recognition error:", e.error);
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      console.log("Speech recognition start failed:", e);
      setIsListening(false);
    }
  }, [onCommand, language]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
    }
    setIsListening(false);
  }, []);

  return { isListening, startListening, stopListening };
}
