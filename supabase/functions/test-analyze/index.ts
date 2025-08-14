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
    console.log('Test analysis function called');
    
    const { text } = await req.json();
    
    if (!text) {
      throw new Error('No transcription text provided');
    }

    // Return mock analysis data
    const mockAnalysis = {
      summary: "This is a test analysis of your recording about planning and strategy.",
      keyPoints: [
        "Discussion about team planning",
        "Strategy development mentioned", 
        "Future goals outlined"
      ],
      sentiment: "positive",
      tags: ["planning", "strategy", "meeting", "goals"],
      highlights: [
        {
          content: "Important planning discussion",
          timestamp: 15
        }
      ],
      actionItems: [
        "Follow up on strategy planning",
        "Schedule next team meeting"
      ]
    };

    console.log('Returning mock analysis');

    return new Response(
      JSON.stringify(mockAnalysis),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in test-analyze function:', error);
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