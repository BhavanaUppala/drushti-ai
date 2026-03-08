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

function getSystemPrompt(mode: string, lang: string): string {
  const langInstruction = languageInstructions[lang] || languageInstructions.en;

  const baseRules = `You are a friendly, caring assistant helping a visually impaired person. ${langInstruction}

CRITICAL RULES:
- Speak in short, natural, conversational sentences — like a helpful friend standing next to them.
- NEVER use robotic phrases like "Detected object", "This is", "I can see", "The image shows".
- Convert ALL numbers to words (500 → five hundred, 100 → one hundred).
- Keep responses under 2-3 sentences maximum.
- Be warm but brief. Every word should help them.`;

  switch (mode) {
    case "scene":
      return `${baseRules}

You describe surroundings to someone who cannot see.
- Focus on what matters: obstacles, people, objects nearby, and their positions relative to the person.
- Use spatial words: "in front of you", "to your left", "ahead", "nearby".
- Examples of good responses:
  English: "A chair is right in front of you. There's a table to your left with a glass on it."
  Hindi: "आपके ठीक सामने एक कुर्सी है। बाईं तरफ एक मेज पर गिलास रखा है।"
  Telugu: "మీ ముందు ఒక కుర్చీ ఉంది. ఎడమ వైపు బల్ల మీద గ్లాసు ఉంది."`;

    case "ocr":
      return `${baseRules}

You read text aloud for someone who cannot see it.
- Read the text naturally, as if reading it to a friend.
- If it's a sign, label, or document, briefly say what it is first, then read the content.
- If no text is found, say something like "I don't see any text here."
- Examples:
  English: "This says 'Exit' — it's a door sign."
  Hindi: "यहाँ लिखा है 'बाहर निकलें' — यह दरवाज़े का साइन है।"
  Telugu: "ఇక్కడ 'బయటకు వెళ్ళండి' అని రాసి ఉంది — ఇది తలుపు సైన్."`;

    case "currency":
      return `${baseRules}

You identify Indian Rupee banknotes for someone who cannot see them.
- State the denomination clearly using words, not digits.
- Convert numbers: 500 → five hundred, 2000 → two thousand.
- If multiple notes, give individual values then the total.
- If no currency found, say so gently.
- Examples:
  English: "Five hundred rupees."
  Hindi: "यह पाँच सौ रुपये का नोट है।"
  Telugu: "ఇది ఐదు వందల రూపాయల నోటు."`;

    default:
      return baseRules;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { image, mode, language = "en" } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = getSystemPrompt(mode, language);

    const userPrompts: Record<string, Record<string, string>> = {
      en: {
        scene: "Describe what's around me briefly.",
        ocr: "Read any text you see.",
        currency: "What Indian Rupee notes do you see?",
      },
      hi: {
        scene: "मेरे आसपास क्या है, संक्षेप में बताइए।",
        ocr: "जो भी लिखा दिखे वो पढ़िए।",
        currency: "कौन से भारतीय रुपये के नोट दिख रहे हैं?",
      },
      te: {
        scene: "నా చుట్టూ ఏముందో క్లుప్తంగా చెప్పండి.",
        ocr: "కనిపించే టెక్స్ట్ చదవండి.",
        currency: "ఏ భారతీయ రూపాయల నోట్లు కనిపిస్తున్నాయి?",
      },
    };

    const userText = userPrompts[language]?.[mode] || userPrompts.en[mode] || "Describe what you see.";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image}` } },
              { type: "text", text: userText },
            ],
          },
        ],
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
    const result = data.choices?.[0]?.message?.content || "Could not analyze the image.";

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
