import { LucideIcon } from "lucide-react";

interface FeatureButtonProps {
  icon: LucideIcon;
  label: string;
  description: string;
  colorClass: string;
  onClick: () => void;
  disabled?: boolean;
  isActive?: boolean;
}

export function FeatureButton({ icon: Icon, label, description, colorClass, onClick, disabled, isActive }: FeatureButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={`${label}: ${description}`}
      className={`btn-feature w-full flex items-center gap-4 px-6 py-5 bg-card border-2 ${
        isActive ? "border-primary animate-pulse-glow" : "border-border"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "hover:border-primary/50"} ${colorClass}`}
    >
      <div className={`flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center ${
        isActive ? "bg-primary/20" : "bg-muted"
      }`}>
        <Icon className="w-7 h-7" />
      </div>
      <div className="text-left">
        <div className="text-lg font-bold text-foreground">{label}</div>
        <div className="text-sm text-muted-foreground">{description}</div>
      </div>
    </button>
  );
}
