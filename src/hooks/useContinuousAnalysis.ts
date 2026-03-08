import { useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseContinuousAnalysisOptions {
  captureImage: () => string | null;
  speak: (text: string, language: string) => void;
  language: string;
  intervalMs?: number;
}

function similarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/));
  const wordsB = new Set(b.toLowerCase().split(/\s+/));
  const intersection = [...wordsA].filter(w => wordsB.has(w)).length;
  const union = new Set([...wordsA, ...wordsB]).size;
  return union === 0 ? 1 : intersection / union;
}

export function useContinuousAnalysis({
  captureImage,
  speak,
  language,
  intervalMs = 3000,
}: UseContinuousAnalysisOptions) {
  const [isRunning, setIsRunning] = useState(false);
  const [latestDescription, setLatestDescription] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastDescRef = useRef("");
  const busyRef = useRef(false);

  const analyzeFrame = useCallback(async () => {
    if (busyRef.current) return;
    const image = captureImage();
    if (!image) return;

    busyRef.current = true;
    try {
      const { data, error } = await supabase.functions.invoke("vision-assist", {
        body: { image, mode: "scene", language },
      });

      if (error || data?.error) {
        busyRef.current = false;
        return;
      }

      const result: string = data.result || "";
      if (!result) {
        busyRef.current = false;
        return;
      }

      // Skip if too similar to last description (Jaccard > 0.7)
      if (lastDescRef.current && similarity(result, lastDescRef.current) > 0.7) {
        busyRef.current = false;
        return;
      }

      lastDescRef.current = result;
      setLatestDescription(result);
      speak(result, language);
    } catch {
      // silently skip failed frames
    } finally {
      busyRef.current = false;
    }
  }, [captureImage, speak, language]);

  const start = useCallback(() => {
    if (intervalRef.current) return;
    setIsRunning(true);
    lastDescRef.current = "";
    setLatestDescription("");
    // Analyze immediately, then on interval
    analyzeFrame();
    intervalRef.current = setInterval(analyzeFrame, intervalMs);
  }, [analyzeFrame, intervalMs]);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
  }, []);

  return { isRunning, latestDescription, start, stop };
}
