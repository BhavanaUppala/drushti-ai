import { useState, useCallback } from "react";
import { Eye, FileText, IndianRupee, Mic } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCamera } from "@/hooks/useCamera";
import { useSpeech } from "@/hooks/useSpeech";
import { useVoiceCommand } from "@/hooks/useVoiceCommand";
import { CameraView } from "@/components/CameraView";
import { FeatureButton } from "@/components/FeatureButton";
import { ResponsePanel } from "@/components/ResponsePanel";
import { VoiceButton } from "@/components/VoiceButton";
import { toast } from "sonner";

type Mode = "scene" | "ocr" | "currency";

const Index = () => {
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeMode, setActiveMode] = useState<Mode | null>(null);

  const { videoRef, isActive: cameraActive, isReady, startCamera, stopCamera, captureImage } = useCamera();
  const { speak, stop: stopSpeech, isSpeaking } = useSpeech();

  const analyzeImage = useCallback(
    async (mode: Mode) => {
      if (!cameraActive) {
        const msg = "Please start the camera first.";
        toast.error(msg);
        speak(msg);
        return;
      }

      const image = captureImage();
      if (!image) {
        toast.error("Failed to capture image.");
        return;
      }

      setActiveMode(mode);
      setIsLoading(true);
      setResponse("");

      try {
        const { data, error } = await supabase.functions.invoke("vision-assist", {
          body: { image, mode },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        const result = data.result || "No result received.";
        setResponse(result);
        speak(result);
      } catch (err: any) {
        const msg = err?.message || "Analysis failed. Please try again.";
        setResponse(msg);
        toast.error(msg);
        speak(msg);
      } finally {
        setIsLoading(false);
        setActiveMode(null);
      }
    },
    [cameraActive, captureImage, speak]
  );

  const handleVoiceCommand = useCallback(
    (command: string) => {
      speak(`You said: ${command}`);
      if (command.includes("scene") || command.includes("describe") || command.includes("see") || command.includes("look")) {
        analyzeImage("scene");
      } else if (command.includes("read") || command.includes("text") || command.includes("ocr")) {
        analyzeImage("ocr");
      } else if (command.includes("money") || command.includes("currency") || command.includes("rupee") || command.includes("note")) {
        analyzeImage("currency");
      } else if (command.includes("camera") || command.includes("start")) {
        startCamera();
        speak("Camera started.");
      } else if (command.includes("stop") || command.includes("close")) {
        stopCamera();
        speak("Camera stopped.");
      } else {
        speak("Command not recognized. Try saying: describe scene, read text, or check currency.");
      }
    },
    [analyzeImage, startCamera, stopCamera, speak]
  );

  const { isListening, startListening, stopListening } = useVoiceCommand(handleVoiceCommand);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="px-4 pt-6 pb-4 text-center">
        <h1 className="text-3xl font-black text-foreground tracking-tight">
          Drushti<span className="text-primary">AI</span>
        </h1>
        <p className="text-muted-foreground text-base mt-1">Your AI Vision Assistant</p>
      </header>

      {/* Camera */}
      <CameraView
        videoRef={videoRef}
        isActive={cameraActive}
        onStart={startCamera}
        onStop={stopCamera}
      />

      {/* Response */}
      <div className="mt-4">
        <ResponsePanel
          response={response}
          isLoading={isLoading}
          isSpeaking={isSpeaking}
          onSpeak={() => speak(response)}
          onStop={stopSpeech}
        />
      </div>

      {/* Features */}
      <div className="flex-1 px-4 mt-4 space-y-3 pb-4">
        <FeatureButton
          icon={Eye}
          label="Describe Scene"
          description="Identify objects & surroundings"
          colorClass="text-feature-scene"
          onClick={() => analyzeImage("scene")}
          disabled={isLoading}
          isActive={activeMode === "scene"}
        />
        <FeatureButton
          icon={FileText}
          label="Read Text"
          description="OCR — reads text aloud"
          colorClass="text-feature-text"
          onClick={() => analyzeImage("ocr")}
          disabled={isLoading}
          isActive={activeMode === "ocr"}
        />
        <FeatureButton
          icon={IndianRupee}
          label="Check Currency"
          description="Detect Indian Rupee notes"
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
          {isListening ? "Listening... speak a command" : "Tap mic for voice commands"}
        </p>
      </div>
    </div>
  );
};

export default Index;
