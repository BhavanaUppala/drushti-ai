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
  en: "Hello, I'm ready. Point the camera and I will describe what I see.",
  hi: "नमस्ते, मैं तैयार हूँ। कैमरा दिखाइए, मैं बताऊँगा क्या दिख रहा है।",
  te: "హలో, నేను సిద్ధంగా ఉన్నాను. కెమెరా చూపించండి, నేను చెప్తాను.",
};

const Index = () => {
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeMode, setActiveMode] = useState<Mode | null>(null);
  const [language, setLanguage] = useState<Language>("en");

  const { videoRef, isActive: cameraActive, isReady, startCamera, stopCamera, captureImage } = useCamera();
  const { speak, stop: stopSpeech, isSpeaking, unlock } = useSpeech();

  // Speak welcome message when camera starts
  const handleStartCamera = useCallback(async () => {
    await startCamera();
    speak(welcomeMessages[language], language);
  }, [startCamera, speak, language]);

  // Preload voices
  useEffect(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
  }, []);

  const analyzeImage = useCallback(
    async (mode: Mode) => {
      if (!isReady) {
        const msgs: Record<Language, string> = {
          en: "Please start the camera first.",
          hi: "कृपया पहले कैमरा चालू करें।",
          te: "దయచేసి ముందుగా కెమెరా ప్రారంభించండి.",
        };
        const msg = msgs[language];
        toast.error(msg);
        speak(msg, language);
        return;
      }

      const image = captureImage();
      if (!image) {
        const msgs: Record<Language, string> = {
          en: "Camera not ready yet. Please wait a moment.",
          hi: "कैमरा अभी तैयार नहीं है। कृपया थोड़ा रुकें।",
          te: "కెమెరా ఇంకా సిద్ధంగా లేదు. దయచేసి కొద్దిసేపు ఆగండి.",
        };
        const msg = msgs[language];
        toast.error(msg);
        speak(msg, language);
        return;
      }

      setActiveMode(mode);
      setIsLoading(true);
      setResponse("");

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
        const msg = err?.message || "Analysis failed. Please try again.";
        setResponse(msg);
        toast.error(msg);
        speak(msg, language);
      } finally {
        setIsLoading(false);
        setActiveMode(null);
      }
    },
    [isReady, captureImage, speak, language]
  );

  const handleVoiceCommand = useCallback(
    (command: string) => {
      // Broader keyword sets — Telugu speech recognition returns varied transliterations
      const sceneWords = [
        "scene", "describe", "see", "look", "around",
        "दृश्य", "बताओ", "देखो", "दिखाओ", "आसपास",
        "దృశ్యం", "వివరించు", "వివరించ", "చూడు", "చూడ", "చెప్పు", "చెప్ప", "చుట్టూ", "ఏముంది", "ఏమిటి", "చూపించు", "చూపించ"
      ];
      const ocrWords = [
        "read", "text", "ocr", "written",
        "पढ़ो", "पढ़", "टेक्स्ट", "लिखा",
        "చదువు", "చదువ", "చదివి", "టెక్స్ట్", "టెక్స్ట", "రాత", "రాసి", "అక్షరాలు", "ఏం రాసి"
      ];
      const currencyWords = [
        "money", "currency", "rupee", "note", "cash",
        "पैसा", "पैसे", "नोट", "रुपया", "रुपये",
        "నోటు", "నోట్లు", "రూపాయి", "రూపాయలు", "పైసా", "పైసలు", "డబ్బు", "గుర్తించు", "గుర్తించ", "ఎంత"
      ];
      const startWords = [
        "camera", "start", "open",
        "कैमरा", "शुरू", "खोलो",
        "కెమెరా", "కేమెరా", "చాలు", "స్టార్ట్", "మొదలు", "ప్రారంభ", "ఓపెన్"
      ];
      const stopWords = [
        "stop", "close", "off",
        "बंद", "रुको", "बंद करो",
        "ఆపు", "ఆప", "ఆగు", "ఆగ", "బంద్", "క్లోజ్", "ఆపండి", "ఆపేయ"
      ];

      if (sceneWords.some(w => command.includes(w))) {
        analyzeImage("scene");
      } else if (ocrWords.some(w => command.includes(w))) {
        analyzeImage("ocr");
      } else if (currencyWords.some(w => command.includes(w))) {
        analyzeImage("currency");
      } else if (startWords.some(w => command.includes(w))) {
        handleStartCamera();
      } else if (stopWords.some(w => command.includes(w))) {
        stopCamera();
        const msgs: Record<Language, string> = { en: "Camera stopped.", hi: "कैमरा बंद।", te: "కెమెరా ఆపబడింది." };
        speak(msgs[language], language);
      } else {
        const msgs: Record<Language, string> = {
          en: "Try saying: describe scene, read text, or check currency.",
          hi: "कहिए: दृश्य बताओ, टेक्स्ट पढ़ो, या नोट पहचानो।",
          te: "చెప్పండి: చుట్టూ చూడు, టెక్స్ట్ చదువు, లేదా నోటు గుర్తించు.",
        };
        speak(msgs[language], language);
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
      {/* Header */}
      <header className="px-4 pt-6 pb-3 text-center">
        <h1 className="text-3xl font-black text-foreground tracking-tight">
          Drushti<span className="text-primary">AI</span>
        </h1>
        <p className="text-muted-foreground text-base mt-1">
          {language === "hi" ? "आपका AI विज़न सहायक" : language === "te" ? "మీ AI విజన్ అసిస్టెంట్" : "Your AI Vision Assistant"}
        </p>
      </header>

      {/* Language Selector */}
      <div className="mb-3">
        <LanguageSelector language={language} onChange={setLanguage} />
      </div>

      {/* Camera */}
      <CameraView
        videoRef={videoRef}
        isActive={cameraActive}
        onStart={handleStartCamera}
        onStop={stopCamera}
      />

      {/* Response */}
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

      {/* Features */}
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

      {/* Voice Command */}
      <div className="sticky bottom-0 pb-6 pt-3 bg-background/95 backdrop-blur-sm border-t border-border">
        <VoiceButton
          isListening={isListening}
          onStart={startListening}
          onStop={stopListening}
        />
        <p className="text-center text-sm text-muted-foreground mt-2">
          {isListening
            ? language === "hi" ? "सुन रहा हूँ... बोलिए" : language === "te" ? "వింటున్నాను... చెప్పండి" : "Listening... speak a command"
            : language === "hi" ? "वॉइस कमांड के लिए माइक दबाएं" : language === "te" ? "వాయిస్ కమాండ్ కోసం మైక్ నొక్కండి" : "Tap mic for voice commands"}
        </p>
      </div>
    </div>
  );
};

export default Index;
