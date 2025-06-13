import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface CodingFeedbackRequest {
  transcript: string;
  code: string;
  language: string;
  problem: string;
  testResults: {
    passed: number;
    total: number;
    details: string[];
  };
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Authentication failed');
    }

    const { transcript, code, language, problem, testResults }: CodingFeedbackRequest = await req.json();

    // Generate AI feedback using OpenAI
    const feedback = await generateCodingFeedback({
      transcript,
      code,
      language,
      problem,
      testResults,
      userId: user.id
    });

    return new Response(
      JSON.stringify({ feedback }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Coding feedback error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

async function generateCodingFeedback(params: {
  transcript: string;
  code: string;
  language: string;
  problem: string;
  testResults: any;
  userId: string;
}): Promise<string> {
  const { transcript, code, language, problem, testResults } = params;

  const prompt = `You are a senior software engineer conducting a coding interview. 
  
Context:
- Problem: ${problem}
- Language: ${language}
- Tests Passed: ${testResults.passed}/${testResults.total}

Candidate's latest response: "${transcript}"

Current code:
\`\`\`${language}
${code}
\`\`\`

Test Results:
${testResults.details.join('\n')}

Provide helpful, encouraging feedback as an interviewer would. Consider:
1. Code correctness and efficiency
2. Communication clarity
3. Problem-solving approach
4. Areas for improvement
5. Next steps or hints if needed

Keep your response conversational, under 100 words, and suitable for text-to-speech.`;

  try {
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an experienced technical interviewer providing real-time feedback during a coding interview. Be encouraging, helpful, and professional.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const data = await openaiResponse.json();
    return data.choices[0]?.message?.content || 'Keep working on your solution. You\'re making good progress!';

  } catch (error) {
    console.error('OpenAI API error:', error);
    // Fallback response based on code analysis
    return generateFallbackFeedback(transcript, code, testResults);
  }
}

function generateFallbackFeedback(transcript: string, code: string, testResults: any): string {
  if (testResults.passed === testResults.total && testResults.total > 0) {
    return "Excellent! All tests are passing. Your solution looks correct. Can you walk me through the time and space complexity?";
  }
  
  if (testResults.passed > 0) {
    return `Good progress! ${testResults.passed} out of ${testResults.total} tests are passing. Let's debug the failing cases together.`;
  }
  
  if (code.includes('for') && code.includes('for')) {
    return "I see you're using nested loops. That works! Can you think of a more efficient approach using a hash map?";
  }
  
  if (code.includes('Map') || code.includes('{}') || code.includes('new Map')) {
    return "Great! I see you're thinking about using a hash map. That's the optimal approach. Keep going!";
  }
  
  if (code.length < 100) {
    return "Take your time to think through the problem. What's your overall approach going to be?";
  }
  
  return "Keep explaining your thought process as you code. I'm here to help if you need guidance!";
} 