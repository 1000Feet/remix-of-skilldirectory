// Edge function: proxy chat requests to Lovable AI Gateway (Gemini)
// Keeps the AI key server-side — never exposed to the browser.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const formatSocialLinks = (profile: any) => {
  const links: string[] = [];
  if (profile?.facebook_url) links.push(`Facebook: ${profile.facebook_url}`);
  if (profile?.instagram_url) links.push(`Instagram: ${profile.instagram_url}`);
  return links.length > 0 ? links.join("\n") : "No social media links available";
};

const formatContactInfo = (profile: any) => {
  const info: string[] = [];
  if (profile?.phone) info.push(`Phone: ${profile.phone}`);
  if (profile?.email) info.push(`Email: ${profile.email}`);
  if (profile?.website) info.push(`Website: ${profile.website}`);
  if (profile?.address) info.push(`Address: ${profile.address}`);
  return info.join("\n");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, profile } = await req.json();

    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "Missing 'message' string" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are Skill Directory, the AI assistant for ${profile?.name ?? "this educator"}, an educator on the 1000Feet platform.

EDUCATOR PROFILE:
Business Name: ${profile?.name ?? "Not provided"}
Description: ${profile?.description || "Not provided"}
Categories: ${profile?.categories?.join(", ") || "Not specified"}

CONTACT INFORMATION:
${formatContactInfo(profile)}

SOCIAL MEDIA:
${formatSocialLinks(profile)}

ABOUT THE BUSINESS:
${profile?.about_business || "Not provided"}

ADDITIONAL KNOWLEDGE BASE:
${profile?.ai_chatbot || ""}

CONVERSATION GUIDELINES:
1. You are Skill Directory, a friendly and professional AI assistant.
2. Provide natural, conversational responses.
3. Share contact details from the profile when relevant, formatted clearly.
4. Focus on the educator's specific services, categories, and expertise.
5. Share the address if asked about location.
6. Share available social/website links and encourage engagement.
7. If information isn't available, acknowledge it and suggest alternatives.
8. Stay focused on educational services and maintain professional boundaries.
9. If asked about unrelated topics, politely redirect to educational services.

Remember: You represent ${profile?.name ?? "this educator"}'s educational business.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in Lovable Cloud." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResponse.json();
    const reply = data?.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("gemini-chat error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
