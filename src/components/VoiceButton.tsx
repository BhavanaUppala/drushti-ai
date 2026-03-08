import { Mic, MicOff } from "lucide-react";

interface VoiceButtonProps {
  isListening: boolean;
  continuousMode?: boolean;
  onStart: () => void;
  onStop: () => void;
}

export function VoiceButton({ isListening, continuousMode, onStart, onStop }: VoiceButtonProps) {
  const active = isListening || continuousMode;

  return (
    <div className="flex justify-center px-4">
      <button
        onClick={active ? onStop : onStart}
        className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-ring/50 ${
          active
            ? "bg-primary text-primary-foreground"
            : "bg-card border-2 border-border text-foreground hover:border-primary/50"
        }`}
        aria-label={active ? "Stop conversation" : "Start conversation"}
      >
        {isListening && (
          <div className="absolute inset-0 rounded-full border-2 border-primary animate-listening" />
        )}
        {continuousMode && !isListening && (
          <div className="absolute inset-0 rounded-full border-2 border-primary/50 animate-pulse" />
        )}
        {active ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
      </button>
    </div>
  );
}
