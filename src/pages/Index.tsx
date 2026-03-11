import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCamera } from "@/hooks/useCamera";
import { useSpeech } from "@/hooks/useSpeech";
import { useVoiceCommand } from "@/hooks/useVoiceCommand";
import { useLanguageSelection } from "@/hooks/useLanguageSelection";
import { CameraView } from "@/components/CameraView";
import { ResponsePanel } from "@/components/ResponsePanel";
import { VoiceButton } from "@/components/VoiceButton";
import { toast } from "sonner";

type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

const Index = () => {
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState("en");
  const conversationHistoryRef = useRef<ConversationMessage[]>([]);

  const { videoRef, isActive: cameraActive, isReady, startCamera, stopCamera, captureImage } = useCamera();
  const { speak, stop: stopSpeech, isSpeaking, unlock } = useSpeech();
  const {
    selectedLanguage,
    isSelecting,
    selectLanguage,
    detectLanguageFromText,
    autoDetectFromAI,
    startSelection,
    getLanguagePrompt,
  } = useLanguageSelection();

  const resumeRef = useRef<() => void>(() => {});
  const stopListeningRef = useRef<() => void>(() => {});
  const startContinuousModeRef = useRef<() => void>(() => {});
  const continuousModeRef = useRef(false);
  const languagePromptSpokenRef = useRef(false);

  const sendToAssistant = useCallback(
    async (message: string, includeImage: boolean) => {
      unlock();

      if (!cameraActive) {
        const msg = "Camera is not active. Please enable the camera.";
        toast.error(msg);
        speak(msg, "en", () => resumeRef.current());
        return;
      }

      let image: string | null = null;
      if (includeImage) {
        if (!isReady) {
          const msg = "Give me a moment, the camera is still getting ready.";
          toast.error(msg);
          speak(msg, "en", () => resumeRef.current());
          return;
        }
        image = captureImage();
        if (!image) {
          const msg = "Give me a moment, the camera is still getting ready.";
          toast.error(msg);
          speak(msg, "en", () => resumeRef.current());
          return;
        }
      }

      setIsLoading(true);
      setResponse("");

      const userMsg: ConversationMessage = { role: "user", content: message };

      try {
        const { data, error } = await supabase.functions.invoke("vision-assist", {
          body: {
            image,
            message,
            history: conversationHistoryRef.current,
            preferredLanguage: selectedLanguage || undefined,
          },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        const result = data.result || "I'm sorry, I couldn't process that.";
        const lang = data.detectedLanguage || "en";
        setDetectedLanguage(lang);

        // Auto-detect language from AI response if not yet selected
        if (!selectedLanguage) {
          autoDetectFromAI(lang);
        }

        const assistantMsg: ConversationMessage = { role: "assistant", content: result };
        conversationHistoryRef.current = [...conversationHistoryRef.current, userMsg, assistantMsg].slice(-40);
        setResponse(result);

        speak(result, lang, () => resumeRef.current());
      } catch (err: any) {
        const msg = err?.message || "Something went wrong. Please try again.";
        setResponse(msg);
        toast.error(msg);
        speak(msg, "en", () => resumeRef.current());
      } finally {
        setIsLoading(false);
      }
    },
    [cameraActive, isReady, captureImage, speak, unlock, selectedLanguage, autoDetectFromAI]
  );

  const handleVoiceCommand = useCallback(
    async (transcript: string) => {
      unlock();
      const text = transcript.split(" | ")[0];
      const lowerText = text.toLowerCase();

      // If in language selection mode, try to detect language choice
      if (isSelecting && !selectedLanguage) {
        const detected = detectLanguageFromText(text);
        if (detected) {
          selectLanguage(detected);
          const langNames: Record<string, string> = {
            en: "English", hi: "Hindi", te: "Telugu", ta: "Tamil", kn: "Kannada",
            ml: "Malayalam", mr: "Marathi", bn: "Bengali", gu: "Gujarati",
            pa: "Punjabi", ur: "Urdu", od: "Odia", as: "Assamese",
          };
          const confirmMsg = `${langNames[detected] || detected} selected. I'm ready to help you.`;
          speak(confirmMsg, detected, () => resumeRef.current());
          return;
        }
        // If no language detected from selection, auto-detect via AI and proceed
        autoDetectFromAI("en"); // fallback, will be overridden by AI response
      }

      const cameraStartWords = ["start camera", "open camera", "turn on camera", "कैमरा चालू", "कैमरा खोलो", "కెమెరా ఆన్"];
      const cameraStopWords = ["stop camera", "close camera", "turn off camera", "कैमरा बंद", "కెమెరా ఆపు"];
      const stopListeningWords = ["stop listening", "stop voice", "be quiet", "chup", "सुनना बंद करो", "आवाज बंद", "వినడం ఆపు"];
      const resumeWords = ["resume", "continue", "जारी रखो", "फिर से शुरू", "కొనసాగించు", "మళ్ళీ మొదలు"];
      const changeLangWords = ["change language", "switch language", "भाषा बदलो", "భాష మార్చు"];

      if (cameraStartWords.some(w => lowerText.includes(w))) {
        handleStartCamera();
        return;
      }
      if (cameraStopWords.some(w => lowerText.includes(w))) {
        stopCamera();
        speak("Camera is off now.", selectedLanguage || "en", () => resumeRef.current());
        return;
      }
      if (stopListeningWords.some(w => lowerText.includes(w))) {
        stopListeningRef.current();
        stopSpeech();
        speak("I've stopped listening.", selectedLanguage || "en");
        return;
      }
      if (resumeWords.some(w => lowerText.includes(w))) {
        if (!cameraActive) await startCamera();
        if (!continuousModeRef.current) startContinuousModeRef.current();
        speak("I'm ready again.", selectedLanguage || "en", () => resumeRef.current());
        return;
      }
      if (changeLangWords.some(w => lowerText.includes(w))) {
        startSelection();
        languagePromptSpokenRef.current = false;
        const prompt = getLanguagePrompt();
        speak(prompt, "en", () => resumeRef.current());
        return;
      }

      if (!cameraActive) {
        const msg = "Camera is not active. Please enable the camera.";
        toast.error(msg);
        speak(msg, "en", () => resumeRef.current());
        return;
      }

      sendToAssistant(text, cameraActive && isReady);
    },
    [unlock, sendToAssistant, cameraActive, isReady, stopSpeech, speak, startCamera, stopCamera,
     isSelecting, selectedLanguage, detectLanguageFromText, selectLanguage, autoDetectFromAI,
     startSelection, getLanguagePrompt]
  );

  const handleStartCamera = useCallback(async () => {
    unlock();
    await startCamera();
    speak("Camera is active. You can ask me about your surroundings.", selectedLanguage || "en");
  }, [startCamera, speak, unlock, selectedLanguage]);

  const { isListening, continuousMode, startListening, stopListening, startContinuousMode, resumeListening } =
    useVoiceCommand(handleVoiceCommand, selectedLanguage || undefined);

  useEffect(() => {
    resumeRef.current = resumeListening;
    stopListeningRef.current = stopListening;
    startContinuousModeRef.current = startContinuousMode;
    continuousModeRef.current = continuousMode;
  }, [resumeListening, stopListening, startContinuousMode, continuousMode]);

  // Auto-start: camera + language selection prompt
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (autoStartedRef.current) return;
    const autoStart = async () => {
      if (autoStartedRef.current) return;
      autoStartedRef.current = true;
      unlock();
      try {
        await startCamera();
        // Speak language selection prompt
        startSelection();
        const prompt = getLanguagePrompt();
        languagePromptSpokenRef.current = true;
        speak(prompt, "en", () => {
          startContinuousModeRef.current();
        });
      } catch (e) {
        console.log("Auto-start failed, user gesture may be required:", e);
      }
    };
    autoStart();
    const handleInteraction = () => {
      if (!autoStartedRef.current) autoStart();
      document.removeEventListener("click", handleInteraction);
      document.removeEventListener("touchstart", handleInteraction);
    };
    document.addEventListener("click", handleInteraction, { once: true });
    document.addEventListener("touchstart", handleInteraction, { once: true });
    return () => {
      document.removeEventListener("click", handleInteraction);
      document.removeEventListener("touchstart", handleInteraction);
    };
  }, []);

  const currentLang = selectedLanguage || detectedLanguage;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-4 pt-6 pb-3 text-center">
        <h1 className="text-3xl font-black text-foreground tracking-tight">
          Drushti<span className="text-primary">AI</span>
        </h1>
        <p className="text-muted-foreground text-base mt-1">Your AI Vision Assistant</p>
      </header>

      <CameraView
        videoRef={videoRef}
        isActive={cameraActive}
        onStart={handleStartCamera}
        onStop={stopCamera}
      />

      <div className="mt-4">
        <ResponsePanel
          response={response}
          isLoading={isLoading}
          isSpeaking={isSpeaking}
          onSpeak={() => speak(response, currentLang)}
          onStop={stopSpeech}
          language={currentLang}
        />
      </div>

      <div className="flex-1" />

      <div className="sticky bottom-0 pb-6 pt-3 bg-background/95 backdrop-blur-sm border-t border-border">
        <VoiceButton
          isListening={isListening}
          continuousMode={continuousMode}
          onStart={startContinuousMode}
          onStop={stopListening}
        />
        <p className="text-center text-sm text-muted-foreground mt-2">
          {isSelecting && !selectedLanguage
            ? "Say your language name or number..."
            : isListening
              ? "Listening... go ahead"
              : continuousMode
                ? "Responding..."
                : "Tap mic to start conversation"}
        </p>
      </div>
    </div>
  );
};

export default Index;
