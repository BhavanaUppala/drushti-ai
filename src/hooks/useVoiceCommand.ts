import { useCallback, useRef, useState, useEffect } from "react";

type CommandHandler = (command: string) => void;

const langMap: Record<string, string> = {
  en: "en-IN",
  hi: "hi-IN",
  te: "te-IN",
};

export function useVoiceCommand(onCommand: CommandHandler, language: string = "en") {
  const [isListening, setIsListening] = useState(false);
  const [continuousMode, setContinuousMode] = useState(false);
  const recognitionRef = useRef<any>(null);
  const continuousModeRef = useRef(false);

  // Keep ref in sync with state
  useEffect(() => {
    continuousModeRef.current = continuousMode;
  }, [continuousMode]);

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (_) {}
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;

    const recLang = language === "te" ? "hi-IN" : (langMap[language] || "en-IN");
    recognition.lang = recLang;

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const results = event.results[0];
      const transcripts: string[] = [];
      for (let i = 0; i < results.length; i++) {
        transcripts.push(results[i].transcript.toLowerCase().trim());
      }
      onCommand(transcripts.join(" | "));
    };
    recognition.onerror = (e: any) => {
      console.log("Speech recognition error:", e.error);
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      console.log("Speech recognition start failed:", e);
      setIsListening(false);
    }
  }, [onCommand, language]);

  const stopListening = useCallback(() => {
    setContinuousMode(false);
    continuousModeRef.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
    }
    setIsListening(false);
  }, []);

  const startContinuousMode = useCallback(() => {
    setContinuousMode(true);
    continuousModeRef.current = true;
    startListening();
  }, [startListening]);

  const resumeListening = useCallback(() => {
    if (continuousModeRef.current) {
      // Small delay to avoid overlapping with speech recognition end
      setTimeout(() => {
        if (continuousModeRef.current) {
          startListening();
        }
      }, 500);
    }
  }, [startListening]);

  return { isListening, continuousMode, startListening, stopListening, startContinuousMode, resumeListening };
}
