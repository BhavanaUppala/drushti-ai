import { useState, useEffect, useCallback, useRef } from "react";

export interface MedicineReminder {
  id: string;
  medicineName: string;
  dosage: string;
  times: string[]; // e.g. ["08:00", "20:00"]
  notes: string; // e.g. "after meals"
  createdAt: number;
  active: boolean;
}

const STORAGE_KEY = "drushti_medicine_reminders";

function loadReminders(): MedicineReminder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveReminders(reminders: MedicineReminder[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
}

export function useMedicineReminders(
  onAlert: (reminder: MedicineReminder) => void
) {
  const [reminders, setReminders] = useState<MedicineReminder[]>(loadReminders);
  const alertedRef = useRef<Set<string>>(new Set());
  const onAlertRef = useRef(onAlert);
  onAlertRef.current = onAlert;

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Persist on change
  useEffect(() => {
    saveReminders(reminders);
  }, [reminders]);

  // Check reminders every 30 seconds
  useEffect(() => {
    const check = () => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      const currentTime = `${hh}:${mm}`;
      const today = now.toDateString();

      reminders.forEach((r) => {
        if (!r.active) return;
        r.times.forEach((t) => {
          const key = `${r.id}-${t}-${today}`;
          if (t === currentTime && !alertedRef.current.has(key)) {
            alertedRef.current.add(key);
            onAlertRef.current(r);

            // Browser notification
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification(`Medicine Reminder: ${r.medicineName}`, {
                body: `${r.dosage} — ${r.notes}`,
                icon: "/favicon.ico",
              });
            }
          }
        });
      });
    };

    const interval = setInterval(check, 30000);
    check(); // immediate check
    return () => clearInterval(interval);
  }, [reminders]);

  const addReminder = useCallback(
    (reminder: Omit<MedicineReminder, "id" | "createdAt" | "active">) => {
      const newReminder: MedicineReminder = {
        ...reminder,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        active: true,
      };
      setReminders((prev) => [...prev, newReminder]);
      return newReminder;
    },
    []
  );

  const removeReminder = useCallback((id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const toggleReminder = useCallback((id: string) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, active: !r.active } : r))
    );
  }, []);

  const clearAll = useCallback(() => {
    setReminders([]);
    alertedRef.current.clear();
  }, []);

  return { reminders, addReminder, removeReminder, toggleReminder, clearAll };
}
