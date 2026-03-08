import { Radar, StopCircle } from "lucide-react";

interface ContinuousModeButtonProps {
  isRunning: boolean;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
  language?: string;
}

const labels: Record<string, { start: string; stop: string; desc: string }> = {
  en: { start: "Live Scene", stop: "Stop Live", desc: "Continuous real-time description" },
  hi: { start: "लाइव दृश्य", stop: "लाइव बंद", desc: "लगातार वास्तविक समय विवरण" },
  te: { start: "లైవ్ దృశ్యం", stop: "లైవ్ ఆపు", desc: "నిరంతర రియల్-టైమ్ వివరణ" },
};

export function ContinuousModeButton({ isRunning, onStart, onStop, disabled, language = "en" }: ContinuousModeButtonProps) {
  const l = labels[language] || labels.en;

  return (
    <button
      onClick={isRunning ? onStop : onStart}
      disabled={disabled && !isRunning}
      className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-ring/50 ${
        isRunning
          ? "bg-destructive/10 border-destructive text-destructive animate-pulse"
          : "bg-card border-border text-foreground hover:border-primary/50"
      } ${disabled && !isRunning ? "opacity-50 cursor-not-allowed" : ""}`}
      aria-label={isRunning ? l.stop : l.start}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
        isRunning ? "bg-destructive/20" : "bg-primary/10"
      }`}>
        {isRunning ? (
          <StopCircle className="w-7 h-7 text-destructive" />
        ) : (
          <Radar className="w-7 h-7 text-primary" />
        )}
      </div>
      <div className="text-left">
        <span className="font-bold text-lg block leading-tight">
          {isRunning ? l.stop : l.start}
        </span>
        <span className="text-sm text-muted-foreground">{l.desc}</span>
      </div>
      {isRunning && (
        <div className="ml-auto flex gap-1">
          <div className="w-2 h-2 rounded-full bg-destructive animate-bounce" />
          <div className="w-2 h-2 rounded-full bg-destructive animate-bounce [animation-delay:0.15s]" />
          <div className="w-2 h-2 rounded-full bg-destructive animate-bounce [animation-delay:0.3s]" />
        </div>
      )}
    </button>
  );
}
