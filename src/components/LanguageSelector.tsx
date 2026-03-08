import { Globe } from "lucide-react";

export type Language = "en" | "hi" | "te";

interface LanguageSelectorProps {
  language: Language;
  onChange: (lang: Language) => void;
}

const languages: { code: Language; label: string; native: string }[] = [
  { code: "en", label: "English", native: "English" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "te", label: "Telugu", native: "తెలుగు" },
];

export function LanguageSelector({ language, onChange }: LanguageSelectorProps) {
  return (
    <div className="flex items-center justify-center gap-2 px-4" role="radiogroup" aria-label="Select language">
      <Globe className="w-5 h-5 text-muted-foreground flex-shrink-0" />
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => onChange(lang.code)}
          role="radio"
          aria-checked={language === lang.code}
          className={`px-4 py-2.5 rounded-xl text-base font-semibold transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-ring/50 ${
            language === lang.code
              ? "bg-primary text-primary-foreground shadow-md"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          {lang.native}
        </button>
      ))}
    </div>
  );
}
