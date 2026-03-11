import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Google Cloud TTS voice config for all supported Indian languages
const langVoiceMap: Record<string, { languageCode: string; name: string; ssmlGender: string }> = {
  en: { languageCode: "en-IN", name: "en-IN-Neural2-B", ssmlGender: "MALE" },
  hi: { languageCode: "hi-IN", name: "hi-IN-Neural2-B", ssmlGender: "MALE" },
  te: { languageCode: "te-IN", name: "te-IN-Standard-B", ssmlGender: "MALE" },
  ta: { languageCode: "ta-IN", name: "ta-IN-Standard-B", ssmlGender: "MALE" },
  kn: { languageCode: "kn-IN", name: "kn-IN-Standard-B", ssmlGender: "MALE" },
  ml: { languageCode: "ml-IN", name: "ml-IN-Standard-B", ssmlGender: "MALE" },
  mr: { languageCode: "mr-IN", name: "mr-IN-Standard-B", ssmlGender: "MALE" },
  bn: { languageCode: "bn-IN", name: "bn-IN-Standard-B", ssmlGender: "MALE" },
  gu: { languageCode: "gu-IN", name: "gu-IN-Standard-B", ssmlGender: "MALE" },
  pa: { languageCode: "pa-IN", name: "pa-IN-Standard-B", ssmlGender: "MALE" },
  ur: { languageCode: "ur-IN", name: "ur-IN-Standard-B", ssmlGender: "MALE" },
  od: { languageCode: "or-IN", name: "or-IN-Standard-B", ssmlGender: "MALE" },
  as: { languageCode: "as-IN", name: "as-IN-Standard-B", ssmlGender: "MALE" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, language = "en" } = await req.json();
    const API_KEY = Deno.env.get("GOOGLE_CLOUD_TTS_API_KEY");
    if (!API_KEY) throw new Error("GOOGLE_CLOUD_TTS_API_KEY is not configured");

    if (!text || text.trim().length === 0) {
      return new Response(JSON.stringify({ error: "No text provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const voiceConfig = langVoiceMap[language] || langVoiceMap.en;

    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: { text: text.substring(0, 5000) },
          voice: {
            languageCode: voiceConfig.languageCode,
            name: voiceConfig.name,
            ssmlGender: voiceConfig.ssmlGender,
          },
          audioConfig: {
            audioEncoding: "MP3",
            speakingRate: 0.9,
            pitch: 0.5,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Google TTS error:", response.status, errText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      throw new Error(`Google TTS API error: ${response.status}`);
    }

    const data = await response.json();

    return new Response(JSON.stringify({ audioContent: data.audioContent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("google-tts error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "TTS failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
