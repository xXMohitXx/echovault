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
    const { text } = await req.json();
    
    if (!text) {
      throw new Error('No transcription text provided');
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }

    console.log('Analyzing transcription with Gemini...');

    // Analyze the text with Gemini
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are an expert at analyzing voice recordings and conversations. Your task is to analyze the provided transcription and return a structured JSON response with the following format:

{
  "summary": "A concise 2-3 sentence summary of the main content",
  "keyPoints": ["Array of 3-5 key points or insights from the recording"],
  "sentiment": "positive|neutral|negative",
  "tags": ["Array of 3-8 relevant tags/topics"],
  "highlights": [
    {
      "content": "Important quote or insight",
      "timestamp": "estimated time in seconds (number)"
    }
  ],
  "actionItems": ["Array of any action items or next steps mentioned"]
}

Provide practical, useful analysis that would help someone review and search through their recordings. Return ONLY the JSON object, no additional text or formatting.

Please analyze this voice recording transcription: ${text}`
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048,
        }
      }),
    });

    console.log('Gemini response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error status:', response.status);
      console.error('Gemini API error details:', errorText);
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('Raw Gemini response received, parsing...');
    
    let analysis;
    try {
      const content = result.candidates?.[0]?.content?.parts?.[0]?.text;
      console.log('Raw content to parse:', content);
      
      if (!content) {
        throw new Error('No content in Gemini response');
      }
      
      // Clean up the response text (remove markdown formatting if present)
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      analysis = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw content that failed to parse:', result.candidates?.[0]?.content?.parts?.[0]?.text);
      
      // Return a fallback analysis instead of failing
      analysis = {
        summary: "Analysis could not be completed due to parsing error",
        keyPoints: ["Raw transcription available"],
        sentiment: "neutral", 
        tags: ["transcription"],
        highlights: [],
        actionItems: []
      };
    }

    console.log('Parsed analysis result:', analysis);

    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-recording function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        summary: "Analysis failed",
        keyPoints: [],
        sentiment: "neutral",
        tags: [],
        highlights: [],
        actionItems: []
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});