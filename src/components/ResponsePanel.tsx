import { Volume2, VolumeX } from "lucide-react";
import { loadingText, readAloudText, stopText } from "@/lib/languages";

interface ResponsePanelProps {
  response: string;
  isLoading: boolean;
  isSpeaking: boolean;
  onSpeak: () => void;
  onStop: () => void;
  language?: string;
}

export function ResponsePanel({ response, isLoading, isSpeaking, onSpeak, onStop, language = "en" }: ResponsePanelProps) {
  if (!response && !isLoading) return null;

  return (
    <div className="bg-card border-2 border-border rounded-2xl p-5 mx-4" role="status" aria-live="polite">
      {isLoading ? (
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-primary animate-bounce" />
          <div className="w-3 h-3 rounded-full bg-primary animate-bounce [animation-delay:0.15s]" />
          <div className="w-3 h-3 rounded-full bg-primary animate-bounce [animation-delay:0.3s]" />
          <span className="text-muted-foreground text-lg ml-2">{loadingText[language] || loadingText.en}</span>
        </div>
      ) : (
        <>
          <p className="text-foreground text-lg leading-relaxed">{response}</p>
          <button
            onClick={isSpeaking ? onStop : onSpeak}
            className="mt-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-muted text-foreground font-semibold text-base hover:bg-muted/80 transition-colors focus:outline-none focus:ring-4 focus:ring-ring/50"
            aria-label={isSpeaking ? "Stop speaking" : "Read aloud"}
          >
            {isSpeaking ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            {isSpeaking ? (stopText[language] || stopText.en) : (readAloudText[language] || readAloudText.en)}
          </button>
        </>
      )}
    </div>
  );
}
