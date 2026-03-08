import { Mic, MicOff } from "lucide-react";

interface VoiceButtonProps {
  isListening: boolean;
  onStart: () => void;
  onStop: () => void;
}

export function VoiceButton({ isListening, onStart, onStop }: VoiceButtonProps) {
  return (
    <div className="flex justify-center px-4">
      <button
        onClick={isListening ? onStop : onStart}
        className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-ring/50 ${
          isListening
            ? "bg-primary text-primary-foreground"
            : "bg-card border-2 border-border text-foreground hover:border-primary/50"
        }`}
        aria-label={isListening ? "Stop voice command" : "Start voice command"}
      >
        {isListening && (
          <div className="absolute inset-0 rounded-full border-2 border-primary animate-listening" />
        )}
        {isListening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
      </button>
    </div>
  );
}
