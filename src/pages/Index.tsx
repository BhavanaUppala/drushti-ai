import { useState, useCallback, useEffect, useRef } from "react";
import { Eye, FileText, IndianRupee } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCamera } from "@/hooks/useCamera";
import { useSpeech } from "@/hooks/useSpeech";
import { useVoiceCommand } from "@/hooks/useVoiceCommand";
import { useMedicineReminders } from "@/hooks/useMedicineReminders";
import { CameraView } from "@/components/CameraView";
import { FeatureButton } from "@/components/FeatureButton";
import { ResponsePanel } from "@/components/ResponsePanel";
import { VoiceButton } from "@/components/VoiceButton";
import { LanguageSelector, type Language } from "@/components/LanguageSelector";
import { MedicineReminders } from "@/components/MedicineReminders";
import { toast } from "sonner";

type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

const welcomeMessages: Record<Language, string> = {
  en: "Hello, I'm ready to help. Just point the camera and talk to me. I'll keep listening.",
  hi: "नमस्ते, मैं तैयार हूँ। कैमरा दिखाइए और बात करिए। मैं सुनता रहूँगा।",
  te: "హలో, నేను సిద్ధంగా ఉన్నాను. కెమెరా చూపించి మాట్లాడండి. నేను వింటూ ఉంటాను.",
};

const feedback: Record<string, Record<Language, string>> = {
  cameraNeeded: {
    en: "Please turn on the camera first, then I can help you.",
    hi: "कृपया पहले कैमरा चालू कीजिए, फिर मैं मदद कर सकता हूँ।",
    te: "దయచేసి ముందుగా కెమెరా ఆన్ చేయండి, అప్పుడు నేను సహాయం చేయగలను.",
  },
  cameraNotReady: {
    en: "Give me a moment, the camera is still getting ready.",
    hi: "एक पल रुकिए, कैमरा अभी तैयार हो रहा है।",
    te: "ఒక్క క్షణం ఆగండి, కెమెరా ఇంకా సిద్ధమవుతోంది.",
  },
  cameraStopped: {
    en: "Camera is off now.",
    hi: "कैमरा बंद हो गया।",
    te: "కెమెరా ఆపేశాను.",
  },
  analyzing: {
    en: "Let me take a look...",
    hi: "देखता हूँ...",
    te: "చూస్తాను...",
  },
  reminderAlert: {
    en: "Time to take your medicine: ",
    hi: "दवा लेने का समय: ",
    te: "మందు తీసుకునే సమయం: ",
  },
};

const featureLabels: Record<Language, { scene: [string, string]; ocr: [string, string]; currency: [string, string] }> = {
  en: { scene: ["Describe Scene", "Identify objects & surroundings"], ocr: ["Read Text", "OCR, prescriptions & labels"], currency: ["Check Currency", "Detect Indian Rupee notes"] },
  hi: { scene: ["दृश्य बताएं", "वस्तुएं और परिवेश पहचानें"], ocr: ["टेक्स्ट पढ़ें", "OCR, प्रिस्क्रिप्शन और लेबल"], currency: ["नोट पहचानें", "भारतीय रुपये के नोट"] },
  te: { scene: ["దృశ్యం వివరించు", "వస్తువులు & పరిసరాలు"], ocr: ["టెక్స్ట్ చదువు", "OCR, ప్రిస్క్రిప్షన్ & లేబుల్స్"], currency: ["నోటు గుర్తించు", "భారతీయ రూపాయల నోట్లు"] },
};

const modePrompts: Record<string, Record<Language, string>> = {
  scene: {
    en: "Describe what's around me. Warn me about any obstacles or hazards first.",
    hi: "मेरे आसपास क्या है बताइए। पहले किसी भी बाधा या खतरे के बारे में बताइए।",
    te: "నా చుట్టూ ఏముందో చెప్పండి. ముందుగా ఏవైనా అడ్డంకులు లేదా ప్రమాదాల గురించి చెప్పండి.",
  },
  ocr: {
    en: "Read any text you can see. If this looks like a prescription or medicine label, extract medicine names, dosage, and timing details.",
    hi: "जो भी लिखा दिखे वो पढ़िए। अगर यह प्रिस्क्रिप्शन या दवा का लेबल है तो दवा का नाम, खुराक और समय बताइए।",
    te: "కనిపించే టెక్స్ట్ చదవండి. ఇది ప్రిస్క్రిప్షన్ లేదా మందు లేబుల్ అయితే మందు పేరు, మోతాదు, సమయం చెప్పండి.",
  },
  currency: {
    en: "What Indian Rupee notes do you see?",
    hi: "कौन से भारतीय रुपये के नोट दिख रहे हैं?",
    te: "ఏ భారతీయ రూపాయల నోట్లు కనిపిస్తున్నాయి?",
  },
};

const Index = () => {
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeMode, setActiveMode] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>("en");
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);

  const { videoRef, isActive: cameraActive, isReady, startCamera, stopCamera, captureImage } = useCamera();
  const { speak, stop: stopSpeech, isSpeaking, unlock } = useSpeech();

  const languageRef = useRef(language);
  languageRef.current = language;

  // Medicine reminder alert handler
  const handleReminderAlert = useCallback(
    (reminder: { medicineName: string; dosage: string; notes: string }) => {
      const lang = languageRef.current;
      const msg = `${feedback.reminderAlert[lang]}${reminder.medicineName}. ${reminder.dosage}${reminder.notes ? ` — ${reminder.notes}` : ""}`;
      toast.info(msg);
      speak(msg, lang);
    },
    [speak]
  );

  const { reminders, addReminder, removeReminder, toggleReminder } = useMedicineReminders(handleReminderAlert);

  // Pre-load browser voices
  useEffect(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
  }, []);

  // Auto-start camera and continuous listening on first user interaction
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (autoStartedRef.current) return;
    const autoStart = async () => {
      if (autoStartedRef.current) return;
      autoStartedRef.current = true;
      unlock();
      try {
        await startCamera();
        speak(welcomeMessages[language], language);
        // Start continuous listening after a brief delay for welcome message
        setTimeout(() => {
          startContinuousMode();
        }, 1500);
      } catch (e) {
        console.log("Auto-start failed, user gesture may be required:", e);
      }
    };
    // Try immediately (works on some browsers)
    autoStart();
    // Also listen for first interaction as fallback
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

  const handleStartCamera = useCallback(async () => {
    unlock();
    await startCamera();
    speak(welcomeMessages[language], language);
  }, [startCamera, speak, language, unlock]);

  const resumeRef = useRef<() => void>(() => {});

  const sendToAssistant = useCallback(
    async (message: string, includeImage: boolean) => {
      unlock();

      let image: string | null = null;
      if (includeImage) {
        if (!cameraActive) {
          const msg = feedback.cameraNeeded[language];
          toast.error(msg);
          speak(msg, language, () => resumeRef.current());
          return;
        }
        if (!isReady) {
          const msg = feedback.cameraNotReady[language];
          toast.error(msg);
          speak(msg, language, () => resumeRef.current());
          return;
        }
        image = captureImage();
        if (!image) {
          const msg = feedback.cameraNotReady[language];
          toast.error(msg);
          speak(msg, language, () => resumeRef.current());
          return;
        }
      }

      setIsLoading(true);
      setActiveMode("thinking");
      setResponse("");

      const userMsg: ConversationMessage = { role: "user", content: message };

      try {
        const { data, error } = await supabase.functions.invoke("vision-assist", {
          body: { image, message, history: conversationHistory, language },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        const result = data.result || "I'm sorry, I couldn't process that.";
        const assistantMsg: ConversationMessage = { role: "assistant", content: result };

        setConversationHistory(prev => [...prev, userMsg, assistantMsg].slice(-40));
        setResponse(result);

        speak(result, language, () => resumeRef.current());
      } catch (err: any) {
        const msg = err?.message || "Something went wrong. Please try again.";
        setResponse(msg);
        toast.error(msg);
        speak(msg, language, () => resumeRef.current());
      } finally {
        setIsLoading(false);
        setActiveMode(null);
      }
    },
    [cameraActive, isReady, captureImage, speak, language, unlock, conversationHistory]
  );

  const analyzeWithMode = useCallback(
    (mode: "scene" | "ocr" | "currency") => {
      const prompt = modePrompts[mode]?.[language] || modePrompts[mode]?.en || "What do you see?";
      sendToAssistant(prompt, true);
    },
    [sendToAssistant, language]
  );

  const handleVoiceCommand = useCallback(
    async (transcript: string) => {
      unlock();
      const text = transcript.split(" | ")[0];

      const lowerText = text.toLowerCase();
      const cameraStartWords = ["start camera", "open camera", "turn on camera", "कैमरा चालू", "कैमरा खोलो", "కెమెరా ఆన్"];
      const cameraStopWords = ["stop camera", "close camera", "turn off camera", "कैमरा बंद", "కెమెరా ఆపు"];

      if (cameraStartWords.some(w => lowerText.includes(w))) {
        handleStartCamera();
        return;
      }
      if (cameraStopWords.some(w => lowerText.includes(w))) {
        stopCamera();
        speak(feedback.cameraStopped[language], language, () => resumeRef.current());
        return;
      }

      // Safety voice commands
      const stopListeningWords = ["stop listening", "stop voice", "be quiet", "chup", "सुनना बंद करो", "आवाज बंद", "వినడం ఆపు"];
      const pauseCameraWords = ["pause camera", "कैमरा रोको", "కెమెరా ఆపు"];
      const resumeWords = ["resume assistant", "resume", "continue", "जारी रखो", "फिर से शुरू", "కొనసాగించు", "మళ్ళీ మొదలు"];

      if (stopListeningWords.some(w => lowerText.includes(w))) {
        stopListening();
        stopSpeech();
        const msg = language === "hi" ? "मैंने सुनना बंद कर दिया।" : language === "te" ? "నేను వినడం ఆపేశాను." : "I've stopped listening.";
        speak(msg, language);
        return;
      }
      if (pauseCameraWords.some(w => lowerText.includes(w))) {
        stopCamera();
        speak(feedback.cameraStopped[language], language, () => resumeRef.current());
        return;
      }
      if (resumeWords.some(w => lowerText.includes(w))) {
        if (!cameraActive) {
          await startCamera();
        }
        if (!continuousMode) {
          startContinuousMode();
        }
        const msg = language === "hi" ? "मैं फिर से तैयार हूँ।" : language === "te" ? "నేను మళ్ళీ సిద్ధంగా ఉన్నాను." : "I'm ready again.";
        speak(msg, language, () => resumeRef.current());
        return;
      }

      sendToAssistant(text, cameraActive && isReady);
    },
    [unlock, handleStartCamera, stopCamera, startCamera, speak, language, sendToAssistant, cameraActive, isReady, stopSpeech, continuousMode, startContinuousMode, stopListening]
  );

  const { isListening, continuousMode, startListening, stopListening, startContinuousMode, resumeListening } =
    useVoiceCommand(handleVoiceCommand, language);

  useEffect(() => {
    resumeRef.current = resumeListening;
  }, [resumeListening]);

  const labels = featureLabels[language];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-4 pt-6 pb-3 text-center">
        <h1 className="text-3xl font-black text-foreground tracking-tight">
          Drushti<span className="text-primary">AI</span>
        </h1>
        <p className="text-muted-foreground text-base mt-1">
          {language === "hi" ? "आपका AI विज़न सहायक" : language === "te" ? "మీ AI విజన్ అసిస్టెంట్" : "Your AI Vision Assistant"}
        </p>
      </header>

      <div className="mb-3">
        <LanguageSelector language={language} onChange={setLanguage} />
      </div>

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
          onSpeak={() => speak(response, language)}
          onStop={stopSpeech}
          language={language}
        />
      </div>

      <div className="flex-1 px-4 mt-4 space-y-3 pb-4">
        <FeatureButton
          icon={Eye}
          label={labels.scene[0]}
          description={labels.scene[1]}
          colorClass="text-feature-scene"
          onClick={() => analyzeWithMode("scene")}
          disabled={isLoading}
          isActive={activeMode === "thinking"}
        />
        <FeatureButton
          icon={FileText}
          label={labels.ocr[0]}
          description={labels.ocr[1]}
          colorClass="text-feature-text"
          onClick={() => analyzeWithMode("ocr")}
          disabled={isLoading}
          isActive={activeMode === "thinking"}
        />
        <FeatureButton
          icon={IndianRupee}
          label={labels.currency[0]}
          description={labels.currency[1]}
          colorClass="text-feature-currency"
          onClick={() => analyzeWithMode("currency")}
          disabled={isLoading}
          isActive={activeMode === "thinking"}
        />

        <div className="mx-0">
          <MedicineReminders
            reminders={reminders}
            onAdd={addReminder}
            onRemove={removeReminder}
            onToggle={toggleReminder}
            language={language}
          />
        </div>
      </div>

      <div className="sticky bottom-0 pb-6 pt-3 bg-background/95 backdrop-blur-sm border-t border-border">
        <VoiceButton
          isListening={isListening}
          continuousMode={continuousMode}
          onStart={startContinuousMode}
          onStop={stopListening}
        />
        <p className="text-center text-sm text-muted-foreground mt-2">
          {isListening
            ? language === "hi" ? "सुन रहा हूँ... बोलिए" : language === "te" ? "వింటున్నాను... చెప్పండి" : "Listening... go ahead"
            : continuousMode
              ? language === "hi" ? "जवाब दे रहा हूँ..." : language === "te" ? "జవాబు చెప్తున్నాను..." : "Responding..."
              : language === "hi" ? "माइक दबाकर बात शुरू करें" : language === "te" ? "మైక్ నొక్కి సంభాషణ మొదలు పెట్టండి" : "Tap mic to start conversation"}
        </p>
      </div>
    </div>
  );
};

export default Index;
