import { useState, useCallback, useEffect } from "react";
import { Eye, FileText, IndianRupee } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCamera } from "@/hooks/useCamera";
import { useSpeech } from "@/hooks/useSpeech";
import { useVoiceCommand } from "@/hooks/useVoiceCommand";
import { CameraView } from "@/components/CameraView";
import { FeatureButton } from "@/components/FeatureButton";
import { ResponsePanel } from "@/components/ResponsePanel";
import { VoiceButton } from "@/components/VoiceButton";
import { LanguageSelector, type Language } from "@/components/LanguageSelector";
import { toast } from "sonner";

type Mode = "scene" | "ocr" | "currency";

const welcomeMessages: Record<Language, string> = {
  en: "Hello, I'm ready to help. Just point the camera and tell me what you need.",
  hi: "नमस्ते, मैं तैयार हूँ। कैमरा दिखाइए और बताइए क्या करना है।",
  te: "హలో, నేను సిద్ధంగా ఉన్నాను. కెమెరా చూపించి, ఏం కావాలో చెప్పండి.",
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
  didntUnderstand: {
    en: "I didn't quite catch that. You can say things like — describe what's around me, read the text, or check the money.",
    hi: "मैं समझ नहीं पाया। आप कह सकते हैं — आसपास क्या है बताओ, लिखा हुआ पढ़ो, या नोट पहचानो।",
    te: "నాకు అర్థం కాలేదు. మీరు ఇలా చెప్పవచ్చు — చుట్టూ ఏముందో చెప్పు, రాసింది చదువు, లేదా నోటు చూడు.",
  },
  analyzing: {
    en: "Let me take a look...",
    hi: "देखता हूँ...",
    te: "చూస్తాను...",
  },
  thinking: {
    en: "One moment...",
    hi: "एक पल...",
    te: "ఒక్క క్షణం...",
  },
};

const Index = () => {
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeMode, setActiveMode] = useState<Mode | null>(null);
  const [language, setLanguage] = useState<Language>("en");

  const { videoRef, isActive: cameraActive, isReady, startCamera, stopCamera, captureImage } = useCamera();
  const { speak, stop: stopSpeech, isSpeaking, unlock } = useSpeech();

  const handleStartCamera = useCallback(async () => {
    unlock();
    await startCamera();
    speak(welcomeMessages[language], language);
  }, [startCamera, speak, language, unlock]);

  useEffect(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
  }, []);

  const analyzeImage = useCallback(
    async (mode: Mode) => {
      unlock();
      if (!isReady) {
        const msg = feedback.cameraNeeded[language];
        toast.error(msg);
        speak(msg, language);
        return;
      }

      const image = captureImage();
      if (!image) {
        const msg = feedback.cameraNotReady[language];
        toast.error(msg);
        speak(msg, language);
        return;
      }

      setActiveMode(mode);
      setIsLoading(true);
      setResponse("");
      speak(feedback.analyzing[language], language);

      try {
        const { data, error } = await supabase.functions.invoke("vision-assist", {
          body: { image, mode, language },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        const result = data.result || "No result received.";
        setResponse(result);
        speak(result, language);
      } catch (err: any) {
        const msg = err?.message || "Something went wrong. Please try again.";
        setResponse(msg);
        toast.error(msg);
        speak(msg, language);
      } finally {
        setIsLoading(false);
        setActiveMode(null);
      }
    },
    [isReady, captureImage, speak, language, unlock]
  );

  const handleVoiceCommand = useCallback(
    async (transcript: string) => {
      // Use AI to understand the user's natural language intent
      try {
        const { data, error } = await supabase.functions.invoke("voice-intent", {
          body: { transcript, language },
        });

        if (error) throw error;

        const intent = data?.intent || "unknown";

        switch (intent) {
          case "scene":
            analyzeImage("scene");
            break;
          case "ocr":
            analyzeImage("ocr");
            break;
          case "currency":
            analyzeImage("currency");
            break;
          case "start_camera":
            handleStartCamera();
            break;
          case "stop_camera":
            stopCamera();
            speak(feedback.cameraStopped[language], language);
            break;
          default:
            speak(feedback.didntUnderstand[language], language);
            break;
        }
      } catch (err) {
        console.error("Voice intent error:", err);
        // Fallback: try basic keyword matching if AI fails
        fallbackKeywordMatch(transcript);
      }
    },
    [analyzeImage, handleStartCamera, stopCamera, speak, language]
  );

  const fallbackKeywordMatch = useCallback(
    (command: string) => {
      const text = command.toLowerCase();
      const sceneWords = ["scene", "describe", "look", "around", "दृश्य", "बताओ", "देखो", "చూడు", "చెప్పు", "చుట్టూ"];
      const ocrWords = ["read", "text", "पढ़ो", "टेक्स्ट", "చదువు", "టెక్స్ట్"];
      const currencyWords = ["money", "currency", "rupee", "note", "पैसा", "नोट", "నోటు", "డబ్బు"];
      const startWords = ["camera", "start", "open", "कैमरा", "शुरू", "కెమెరా"];
      const stopWords = ["stop", "close", "off", "बंद", "ఆపు"];

      if (sceneWords.some(w => text.includes(w))) analyzeImage("scene");
      else if (ocrWords.some(w => text.includes(w))) analyzeImage("ocr");
      else if (currencyWords.some(w => text.includes(w))) analyzeImage("currency");
      else if (startWords.some(w => text.includes(w))) handleStartCamera();
      else if (stopWords.some(w => text.includes(w))) {
        stopCamera();
        speak(feedback.cameraStopped[language], language);
      } else {
        speak(feedback.didntUnderstand[language], language);
      }
    },
    [analyzeImage, handleStartCamera, stopCamera, speak, language]
  );

  const { isListening, startListening, stopListening } = useVoiceCommand(handleVoiceCommand, language);

  const featureLabels: Record<Language, { scene: [string, string]; ocr: [string, string]; currency: [string, string] }> = {
    en: { scene: ["Describe Scene", "Identify objects & surroundings"], ocr: ["Read Text", "OCR — reads text aloud"], currency: ["Check Currency", "Detect Indian Rupee notes"] },
    hi: { scene: ["दृश्य बताएं", "वस्तुएं और परिवेश पहचानें"], ocr: ["टेक्स्ट पढ़ें", "लिखा हुआ पढ़कर सुनाएं"], currency: ["नोट पहचानें", "भारतीय रुपये के नोट"] },
    te: { scene: ["దృశ్యం వివరించు", "వస్తువులు & పరిసరాలు"], ocr: ["టెక్స్ట్ చదువు", "రాసిన టెక్స్ట్ చదివి వినిపించు"], currency: ["నోటు గుర్తించు", "భారతీయ రూపాయల నోట్లు"] },
  };

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
          onClick={() => analyzeImage("scene")}
          disabled={isLoading}
          isActive={activeMode === "scene"}
        />
        <FeatureButton
          icon={FileText}
          label={labels.ocr[0]}
          description={labels.ocr[1]}
          colorClass="text-feature-text"
          onClick={() => analyzeImage("ocr")}
          disabled={isLoading}
          isActive={activeMode === "ocr"}
        />
        <FeatureButton
          icon={IndianRupee}
          label={labels.currency[0]}
          description={labels.currency[1]}
          colorClass="text-feature-currency"
          onClick={() => analyzeImage("currency")}
          disabled={isLoading}
          isActive={activeMode === "currency"}
        />
      </div>

      <div className="sticky bottom-0 pb-6 pt-3 bg-background/95 backdrop-blur-sm border-t border-border">
        <VoiceButton
          isListening={isListening}
          onStart={startListening}
          onStop={stopListening}
        />
        <p className="text-center text-sm text-muted-foreground mt-2">
          {isListening
            ? language === "hi" ? "सुन रहा हूँ... बोलिए" : language === "te" ? "వింటున్నాను... చెప్పండి" : "Listening... go ahead"
            : language === "hi" ? "माइक दबाकर बोलिए" : language === "te" ? "మైక్ నొక్కి చెప్పండి" : "Tap mic to speak"}
        </p>
      </div>
    </div>
  );
};

export default Index;
