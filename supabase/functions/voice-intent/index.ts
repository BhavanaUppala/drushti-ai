import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { transcript, language = "en" } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are an intent classifier for a vision assistant app used by visually impaired people.
The app has these actions:
- "scene" — describe surroundings / what's around / look around
- "ocr" — read text / what does it say / read aloud
- "currency" — identify money / check notes / how much money
- "start_camera" — turn on / start / open camera
- "stop_camera" — turn off / stop / close camera
- "unknown" — if none of the above match

The user speaks in English, Hindi, or Telugu. They may use casual, natural language.

Respond with ONLY a JSON object: {"intent": "<action>"}
No explanation, no extra text. Just the JSON.`
          },
          { role: "user", content: transcript }
        ],
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ intent: "unknown" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{"intent":"unknown"}';
    
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = content.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    }
    
    const parsed = JSON.parse(jsonStr);
    return new Response(JSON.stringify({ intent: parsed.intent || "unknown" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("voice-intent error:", e);
    return new Response(JSON.stringify({ intent: "unknown" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
