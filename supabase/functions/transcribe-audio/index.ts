import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Starting transcription request...');
    
    const { audio } = await req.json();
    
    if (!audio) {
      console.error('No audio data provided');
      throw new Error('No audio data provided');
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      console.error('Gemini API key not configured');
      throw new Error('Gemini API key not configured');
    }

    console.log('Processing audio data, length:', audio.length);
    
    // Check if audio data is too large (prevent stack overflow)
    if (audio.length > 10000000) { // ~7.5MB limit
      throw new Error('Audio file too large. Please use shorter recordings.');
    }

    // Use direct base64 for Gemini instead of converting to bytes
    console.log('Using direct base64 for Gemini API...');
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              text: "Please transcribe this audio file. Return only the transcribed text, no additional formatting or commentary."
            },
            {
              inline_data: {
                mime_type: "audio/webm",
                data: audio // Use the base64 directly without conversion
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 8192,
        }
      }),
    });

    console.log('Gemini response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error status:', response.status);
      console.error('Gemini API error details:', errorText);
      
      return new Response(
        JSON.stringify({ 
          error: `Gemini API error: ${response.status}`,
          details: errorText,
          gemini_status: response.status
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const result = await response.json();
    console.log('Gemini response received');

    const transcribedText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!transcribedText) {
      console.error('No transcription text in Gemini response');
      throw new Error('No transcription text returned from Gemini');
    }

    console.log('Transcription successful, text length:', transcribedText.length);

    return new Response(
      JSON.stringify({ 
        text: transcribedText.trim(),
        language: 'auto-detected'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in transcribe-audio function:', error);
    console.error('Error stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        type: error.constructor.name,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});