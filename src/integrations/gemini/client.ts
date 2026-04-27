import { supabase } from "@/integrations/supabase/client";

/**
 * Sends a chat message to the Gemini-backed assistant via a secure edge function.
 * The AI API key lives server-side only — no keys are exposed to the browser.
 */
export const getChatResponse = async (message: string, profile: any): Promise<string> => {
  const { data, error } = await supabase.functions.invoke("gemini-chat", {
    body: { message, profile },
  });

  if (error) {
    console.error("gemini-chat invoke error:", error);
    throw error;
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data?.reply ?? "";
};
