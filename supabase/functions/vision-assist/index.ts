import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { image, mode } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemPrompt = "";
    switch (mode) {
      case "scene":
        systemPrompt = "You are a visual assistant for a visually impaired person. Describe the scene in the image in detail, focusing on: objects present, their positions, people, colors, any text visible, potential hazards, and the overall environment. Be descriptive but concise. Speak as if you're describing to someone who cannot see. Use simple, clear language.";
        break;
      case "ocr":
        systemPrompt = "You are a text reading assistant for a visually impaired person. Extract ALL text visible in this image. Read it exactly as written, preserving formatting where possible. If the text is in a language other than English, mention the language. If no text is found, say 'No text detected in this image.'";
        break;
      case "currency":
        systemPrompt = "You are a currency detection assistant for a visually impaired person in India. Identify the Indian Rupee banknote(s) in this image. For each note detected, state: the denomination (₹10, ₹20, ₹50, ₹100, ₹200, ₹500, ₹2000), its color, and any distinguishing features. If multiple notes are present, give the total. If no currency is detected, say 'No Indian currency notes detected.' Be very clear and confident in your identification.";
        break;
      default:
        systemPrompt = "You are a helpful visual assistant for a visually impaired person. Describe what you see in this image clearly and concisely.";
    }

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
              { type: "text", text: mode === "currency" ? "What Indian Rupee notes do you see?" : mode === "ocr" ? "Read all the text in this image." : "Describe what you see." },
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
