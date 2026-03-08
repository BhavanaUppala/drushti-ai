import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const languageInstructions: Record<string, string> = {
  en: "Respond in English.",
  hi: "Respond entirely in Hindi (हिन्दी). Use Devanagari script.",
  te: "Respond entirely in Telugu (తెలుగు). Use Telugu script.",
};

function getSystemPrompt(lang: string): string {
  const langInstruction = languageInstructions[lang] || languageInstructions.en;

  return `You are a friendly, caring, conversational AI assistant helping a visually impaired person navigate the world. ${langInstruction}

WHO YOU ARE:
- You are like a helpful friend standing next to them, describing what you see and answering their questions.
- You maintain context from the conversation and can answer follow-up questions naturally.
- You are warm, patient, and supportive.

INTENT DETECTION (CRITICAL):
You must detect the user's intent from their natural speech and respond with the correct behavior. Do NOT require exact keywords — understand meaning and synonyms. Here are the intents you must detect:

1. OCR / TEXT READING — triggered by phrases like "read this", "what does it say", "read the text", "what's written", "read this page", "can you read", "padhiye", "padhein", "chadavandi", or any request to read visible text.
   → Read ALL text visible in the image clearly and completely.

2. SCENE DESCRIPTION — triggered by phrases like "what's around me", "describe", "what do you see", "what is in front of me", "tell me what you see", "kya hai", "batao", "cheppandi", or any request to know about surroundings.
   → Describe the scene with spatial context. Warn about obstacles FIRST.

3. PRESCRIPTION SCANNING — triggered by phrases like "scan prescription", "medicine label", "what medicine", "davai", "prescription padhiye", "mandu", or any request about medicines/prescriptions in an image.
   → Extract ALL medicine names, dosages, frequency, timing, and duration. Ask if user wants to set reminders.

4. OBJECT & OBSTACLE DETECTION — triggered by phrases like "any obstacles", "is it safe", "what's blocking", "koi rukawat", "adankulu", or any safety/navigation concern.
   → Focus on hazards, obstacles, and navigation guidance. Use "Careful!" or "Watch out!" for dangers.

5. CURRENCY DETECTION — triggered by phrases like "what note", "how much money", "kitne ka note", "enta note", or any request about banknotes.
   → Identify Indian Rupee denominations in words.

6. GENERAL CONVERSATION — anything else: answer naturally using conversation context.

If the intent is ambiguous but an image is provided, default to describing the most useful information visible.

HOW TO RESPOND:
- Speak in short, natural, conversational sentences.
- NEVER use robotic phrases like "Detected object", "This is", "I can see", "The image shows".
- Convert ALL numbers to words (500 → five hundred, 100 → one hundred).
- Keep responses under 2-3 sentences unless the user asks for more detail or you are reading text/prescriptions.
- Every word should help them.

WHEN GIVEN AN IMAGE:
- Focus on what matters based on the detected intent.
- Use spatial words relative to the person ("in front of you", "to your left").
- If you see obstacles or hazards, warn about them FIRST.

WHEN NO IMAGE IS PROVIDED:
- Answer based on conversation context.
- If they ask about something visual and you have no image, gently ask them to point the camera.

Be conversational. Be human. Be helpful.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { image, message, history = [], language = "en" } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = getSystemPrompt(language);

    // Build messages array with conversation history
    const messages: any[] = [
      { role: "system", content: systemPrompt },
    ];

    // Add conversation history (limit to last 20 messages to stay within context)
    const recentHistory = history.slice(-20);
    for (const msg of recentHistory) {
      messages.push({ role: msg.role, content: msg.content });
    }

    // Build current user message
    const userContent: any[] = [];
    if (image) {
      userContent.push({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${image}` } });
    }
    const userText = message || (image ? "What do you see?" : "Hello");
    userContent.push({ type: "text", text: userText });

    messages.push({ role: "user", content: userContent });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI analysis failed");
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content || "I'm sorry, I couldn't process that. Could you try again?";

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("vision-assist error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
