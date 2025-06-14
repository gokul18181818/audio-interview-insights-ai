import { corsHeaders } from '../_shared/cors.ts'

interface SystemDesignFeedbackRequest {
  whiteboardImage: string
  transcript: string
  currentPhase: string
  requirements: Record<string, any>
  sessionId: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const {
      whiteboardImage,
      transcript,
      currentPhase,
      requirements,
      sessionId
    }: SystemDesignFeedbackRequest = await req.json()

    console.log(`🎯 System Design Feedback Request for phase: ${currentPhase}`)

    // Generate phase-specific prompt
    const systemPrompt = generateSystemPrompt(currentPhase, requirements)
    
    const userPrompt = `
CURRENT PHASE: ${currentPhase}
REQUIREMENTS GATHERED: ${JSON.stringify(requirements, null, 2)}
CANDIDATE'S EXPLANATION: "${transcript}"

Please analyze the candidate's approach and provide feedback on:
1. Understanding of the current phase objectives
2. Technical correctness and completeness
3. Communication clarity
4. One specific suggestion for improvement
5. Encouragement and next steps

Keep response conversational, under 200 words, and suitable for text-to-speech.
${currentPhase === 'requirements' ? 'Focus on whether they\'re asking the right clarifying questions.' : ''}
${currentPhase === 'architecture' ? 'Focus on the design choices and component relationships.' : ''}
${currentPhase === 'scaling' ? 'Focus on scalability solutions and bottleneck identification.' : ''}
`

    // Call OpenAI API (with vision if whiteboard image is available)
    const openaiResponse = await callOpenAI(systemPrompt, userPrompt, whiteboardImage)
    
    if (!openaiResponse.ok) {
      console.error('❌ OpenAI API failed:', await openaiResponse.text())
      return generateFallbackResponse(currentPhase, transcript)
    }

    const result = await openaiResponse.json()
    const feedback = result.choices[0]?.message?.content || generateFallbackMessage(currentPhase)

    console.log('✅ Generated AI feedback:', feedback.substring(0, 100) + '...')

    return new Response(
      JSON.stringify({ feedback }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('❌ System design feedback error:', error)
    
    // Return graceful fallback
    return new Response(
      JSON.stringify({ 
        feedback: "Thank you for sharing your thoughts. You're making good progress. Please continue with your design approach." 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 200 // Return 200 even on error for graceful degradation
      }
    )
  }
})

function generateSystemPrompt(phase: string, requirements: Record<string, any>): string {
  const basePrompt = `You are an experienced senior system design interviewer at a top tech company. You provide helpful, encouraging, and insightful feedback to candidates during system design interviews.`

  switch (phase) {
    case 'requirements':
      return `${basePrompt}

CURRENT PHASE: Requirements Clarification
Your role is to evaluate how well the candidate is gathering and understanding requirements. Focus on:
- Are they asking the right clarifying questions about scale, users, and features?
- Do they understand the difference between functional and non-functional requirements?
- Are they making reasonable assumptions when information isn't provided?
- Are they thinking about the scope and constraints appropriately?

Be encouraging but guide them toward important questions they might have missed.`

    case 'architecture':
      return `${basePrompt}

CURRENT PHASE: High-Level Design
Your role is to evaluate the candidate's architectural thinking. Focus on:
- Is the high-level design appropriate for the requirements?
- Are the major components and services well-defined?
- Does the data flow make sense?
- Are they considering API design and service boundaries?
- Is the design simple enough to start with, avoiding premature optimization?

Requirements context: ${JSON.stringify(requirements)}

Provide feedback on their design choices and suggest improvements.`

    case 'scaling':
      return `${basePrompt}

CURRENT PHASE: Scaling and Optimization
Your role is to evaluate the candidate's understanding of scalability. Focus on:
- Are they identifying the right bottlenecks?
- Do their scaling solutions make sense for the given requirements?
- Are they considering appropriate caching strategies?
- Do they understand load balancing and database scaling?
- Are they thinking about monitoring, reliability, and failure scenarios?

Requirements context: ${JSON.stringify(requirements)}

Help them think through scalability challenges systematically.`

    default:
      return basePrompt
  }
}

async function callOpenAI(systemPrompt: string, userPrompt: string, whiteboardImage?: string) {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
  
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured')
  }

  // Determine if we should use vision model based on image availability
  const hasValidImage = whiteboardImage && 
    whiteboardImage !== "data:image/png;base64,placeholder" && 
    whiteboardImage.startsWith('data:image/')

  const model = hasValidImage ? 'gpt-4-vision-preview' : 'gpt-4o'
  
  let messages: any[]

  if (hasValidImage) {
    // Use vision model with image
    messages = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          { type: 'text', text: userPrompt },
          {
            type: 'image_url',
            image_url: { url: whiteboardImage }
          }
        ]
      }
    ]
  } else {
    // Use text-only model
    messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]
  }

  return fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 250,
      temperature: 0.7,
    }),
  })
}

function generateFallbackResponse(phase: string, transcript: string) {
  const fallbackMessage = generateFallbackMessage(phase)
  
  return new Response(
    JSON.stringify({ feedback: fallbackMessage }),
    { 
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      } 
    }
  )
}

function generateFallbackMessage(phase: string): string {
  switch (phase) {
    case 'requirements':
      return "Great start on gathering requirements! Make sure to ask about scale, key features, and performance needs. What other clarifying questions come to mind?"
    
    case 'architecture':
      return "Nice work on the high-level design! Consider how your components will communicate and what the main data flow looks like. Are there any services you might have missed?"
    
    case 'scaling':
      return "Good thinking about scaling! Consider where bottlenecks might occur and how caching could help. What about database scaling strategies?"
    
    default:
      return "You're doing well! Keep thinking through the problem systematically and consider the trade-offs of your design choices."
  }
} 