
// @ts-ignore // Ignore TS errors for Deno imports
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

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

    console.log('Calling Gemini API...');
    
    // Format the request according to Gemini's API specifications
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are a helpful AI assistant. Provide a concise and friendly response to: ${message}`
          }]
        }]
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Gemini API error:', errorData);
      throw new Error('Failed to get response from Gemini API');
    }

    const data = await response.json();
    console.log('Gemini API response:', data);

    // Extract the response text from the Gemini API response
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) {
      throw new Error('Invalid response format from Gemini API');
    }

    return new Response(
      JSON.stringify({ response: responseText }),
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
