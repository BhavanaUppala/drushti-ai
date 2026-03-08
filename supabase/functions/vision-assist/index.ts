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

HOW TO RESPOND:
- Speak in short, natural, conversational sentences.
- NEVER use robotic phrases like "Detected object", "This is", "I can see", "The image shows".
- Convert ALL numbers to words (500 → five hundred, 100 → one hundred).
- Keep responses under 2-3 sentences unless the user asks for more detail.
- Every word should help them.

WHAT YOU CAN DO:
- Describe surroundings, objects, people, and spatial relationships ("in front of you", "to your left").
- Read text from signs, labels, documents, screens.
- Identify Indian Rupee banknotes and give denominations in words.
- Answer follow-up questions about things you've already described.
- Have natural conversations about what you see or anything else they ask.
- PRESCRIPTION SCANNING: When you see a medical prescription, doctor's note, or medicine packaging, extract ALL medicine details in a structured way. State each medicine name clearly, its dosage (e.g., "five hundred milligrams"), frequency (e.g., "twice a day"), timing (e.g., "after meals", "morning and night"), and duration if visible. After listing medicines, ask if the user wants to set reminders.
- OBSTACLE & SAFETY WARNINGS: When you detect potential hazards (stairs, vehicles, open doors, wet floors, uneven surfaces, construction, low-hanging objects), IMMEDIATELY warn the user with urgency. Start with "Careful!" or "Watch out!" before describing the hazard and its location.

WHEN GIVEN AN IMAGE:
- Focus on what matters: obstacles, people, objects nearby, text visible, currency notes, prescriptions.
- Use spatial words relative to the person.
- If you see obstacles or hazards, warn about them FIRST before describing other things.

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
