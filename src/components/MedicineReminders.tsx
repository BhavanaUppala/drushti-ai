import { useState } from "react";
import { Pill, Plus, Trash2, X, Bell, BellOff } from "lucide-react";
import type { MedicineReminder } from "@/hooks/useMedicineReminders";
import type { Language } from "@/components/LanguageSelector";

interface MedicineRemindersProps {
  reminders: MedicineReminder[];
  onAdd: (reminder: Omit<MedicineReminder, "id" | "createdAt" | "active">) => void;
  onRemove: (id: string) => void;
  onToggle: (id: string) => void;
  language: Language;
}

const labels: Record<Language, {
  title: string; add: string; name: string; dosage: string;
  time: string; notes: string; save: string; cancel: string;
  noReminders: string; addTime: string;
}> = {
  en: { title: "Medicine Reminders", add: "Add Reminder", name: "Medicine Name", dosage: "Dosage", time: "Reminder Time", notes: "Notes (e.g. after meals)", save: "Save", cancel: "Cancel", noReminders: "No reminders set", addTime: "Add time" },
  hi: { title: "दवा रिमाइंडर", add: "रिमाइंडर जोड़ें", name: "दवा का नाम", dosage: "खुराक", time: "रिमाइंडर समय", notes: "नोट्स (जैसे खाने के बाद)", save: "सेव करें", cancel: "रद्द करें", noReminders: "कोई रिमाइंडर नहीं", addTime: "समय जोड़ें" },
  te: { title: "మందుల రిమైండర్", add: "రిమైండర్ జోడించు", name: "మందు పేరు", dosage: "మోతాదు", time: "రిమైండర్ సమయం", notes: "నోట్స్ (ఉదా. భోజనం తర్వాత)", save: "సేవ్", cancel: "రద్దు", noReminders: "రిమైండర్లు లేవు", addTime: "సమయం జోడించు" },
};

export function MedicineReminders({ reminders, onAdd, onRemove, onToggle, language }: MedicineRemindersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [times, setTimes] = useState<string[]>(["08:00"]);
  const [notes, setNotes] = useState("");
  const l = labels[language];

  const activeCount = reminders.filter(r => r.active).length;

  const handleSave = () => {
    if (!name.trim()) return;
    onAdd({ medicineName: name.trim(), dosage: dosage.trim(), times, notes: notes.trim() });
    setName(""); setDosage(""); setTimes(["08:00"]); setNotes("");
    setShowForm(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center gap-4 px-6 py-5 bg-card border-2 border-border rounded-2xl hover:border-primary/50 transition-all duration-200 active:scale-95 focus:outline-none focus:ring-4 focus:ring-ring/50"
        aria-label={l.title}
      >
        <div className="flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center bg-muted">
          <Pill className="w-7 h-7 text-[hsl(var(--feature-voice))]" />
        </div>
        <div className="text-left flex-1">
          <div className="text-lg font-bold text-foreground">{l.title}</div>
          <div className="text-sm text-muted-foreground">
            {activeCount > 0
              ? `${activeCount} active reminder${activeCount > 1 ? "s" : ""}`
              : l.noReminders}
          </div>
        </div>
      </button>
    );
  }

  return (
    <div className="bg-card border-2 border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Pill className="w-5 h-5 text-[hsl(var(--feature-voice))]" />
          {l.title}
        </h2>
        <button onClick={() => setIsOpen(false)} className="p-2 rounded-xl hover:bg-muted text-muted-foreground focus:outline-none focus:ring-4 focus:ring-ring/50" aria-label="Close">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Existing reminders */}
      {reminders.length === 0 && !showForm && (
        <p className="text-muted-foreground text-base mb-4">{l.noReminders}</p>
      )}
      <div className="space-y-2 mb-4">
        {reminders.map((r) => (
          <div key={r.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl ${r.active ? "bg-muted" : "bg-muted/50 opacity-60"}`}>
            <button onClick={() => onToggle(r.id)} className="flex-shrink-0 focus:outline-none" aria-label={r.active ? "Disable" : "Enable"}>
              {r.active ? <Bell className="w-5 h-5 text-primary" /> : <BellOff className="w-5 h-5 text-muted-foreground" />}
            </button>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-foreground truncate">{r.medicineName}</div>
              <div className="text-sm text-muted-foreground">{r.dosage} · {r.times.join(", ")} {r.notes && `· ${r.notes}`}</div>
            </div>
            <button onClick={() => onRemove(r.id)} className="flex-shrink-0 p-1 text-destructive hover:bg-destructive/10 rounded-lg focus:outline-none" aria-label="Delete">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showForm ? (
        <div className="space-y-3 border-t border-border pt-4">
          <input value={name} onChange={e => setName(e.target.value)} placeholder={l.name}
            className="w-full px-4 py-3 rounded-xl bg-muted text-foreground placeholder:text-muted-foreground text-base focus:outline-none focus:ring-2 focus:ring-ring" />
          <input value={dosage} onChange={e => setDosage(e.target.value)} placeholder={l.dosage}
            className="w-full px-4 py-3 rounded-xl bg-muted text-foreground placeholder:text-muted-foreground text-base focus:outline-none focus:ring-2 focus:ring-ring" />
          <div>
            <label className="text-sm font-semibold text-muted-foreground mb-1 block">{l.time}</label>
            {times.map((t, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <input type="time" value={t} onChange={e => { const n = [...times]; n[i] = e.target.value; setTimes(n); }}
                  className="flex-1 px-4 py-3 rounded-xl bg-muted text-foreground text-base focus:outline-none focus:ring-2 focus:ring-ring" />
                {times.length > 1 && (
                  <button onClick={() => setTimes(times.filter((_, j) => j !== i))} className="p-2 text-destructive" aria-label="Remove time"><X className="w-4 h-4" /></button>
                )}
              </div>
            ))}
            <button onClick={() => setTimes([...times, "12:00"])} className="text-sm text-primary font-semibold flex items-center gap-1">
              <Plus className="w-4 h-4" /> {l.addTime}
            </button>
          </div>
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder={l.notes}
            className="w-full px-4 py-3 rounded-xl bg-muted text-foreground placeholder:text-muted-foreground text-base focus:outline-none focus:ring-2 focus:ring-ring" />
          <div className="flex gap-3">
            <button onClick={handleSave} className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-base">{l.save}</button>
            <button onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl bg-muted text-foreground font-bold text-base">{l.cancel}</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)} className="w-full py-3 rounded-xl border-2 border-dashed border-border text-muted-foreground font-semibold flex items-center justify-center gap-2 hover:border-primary/50 transition-colors">
          <Plus className="w-5 h-5" /> {l.add}
        </button>
      )}
    </div>
  );
}
