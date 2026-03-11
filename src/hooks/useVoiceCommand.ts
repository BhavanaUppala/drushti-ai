import { useCallback, useRef, useState, useEffect } from "react";
import { LANGUAGE_MAP } from "@/lib/languages";

type CommandHandler = (command: string) => void;

export function useVoiceCommand(onCommand: CommandHandler, recognitionLang?: string) {
  const [isListening, setIsListening] = useState(false);
  const [continuousMode, setContinuousMode] = useState(false);
  const recognitionRef = useRef<any>(null);
  const continuousModeRef = useRef(false);

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

    // Use the selected language's speech recognition code, default to hi-IN for broad Indian language support
    const langConfig = recognitionLang ? LANGUAGE_MAP.get(recognitionLang) : null;
    recognition.lang = langConfig?.speechRecogLang || "hi-IN";

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
  }, [onCommand, recognitionLang]);

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
      setTimeout(() => {
        if (continuousModeRef.current) {
          startListening();
        }
      }, 500);
    }
  }, [startListening]);

  return { isListening, continuousMode, startListening, stopListening, startContinuousMode, resumeListening };
}
