
// @ts-ignore // Ignore TS errors for Deno imports
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { GoogleGenerativeAI } from "npm:@google/generative-ai";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Add debug logging
    console.log('Request received:', req.method, req.url);
    
    // Validate request body
    let body;
    try {
      body = await req.json();
      console.log('Request body:', body);
    } catch (e) {
      console.error('Error parsing request body:', e);
      throw new Error('Invalid request body');
    }

    const { message } = body;
    if (!message) {
      throw new Error('Message is required');
    }

    const apiKey = Deno.env.get('GOOGLE_API_KEY');
    if (!apiKey) {
      console.error('GOOGLE_API_KEY not found in environment variables');
      throw new Error('API key not configured');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    console.log('Calling Gemini API...');
    const result = await model.generateContent([
      { text: `You are a helpful AI assistant. Provide a concise and friendly response to: ${message}` }
    ]);

    if (!result || !result.response) {
      throw new Error('Invalid response from Gemini API');
    }

    const response = result.response;
    const text = response.text();
    console.log('Gemini API response:', text);

    return new Response(
      JSON.stringify({ response: text }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json'
        },
      },
    );
  } catch (error) {
    console.error('Error in chat function:', error);
    
    // Ensure we always return a proper JSON response
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred',
        details: 'An error occurred while processing your request'
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json'
        },
      },
    );
  }
});
