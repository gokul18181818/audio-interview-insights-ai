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
    console.log(`📝 Transcript: "${transcript}"`)
    console.log(`🖼️ Whiteboard image length: ${whiteboardImage?.length || 0}`)
    console.log(`🔍 Image starts with: ${whiteboardImage?.substring(0, 30)}`)
    
    // Validate OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      console.error('❌ OpenAI API key not configured')
      return new Response(
        JSON.stringify({ 
          feedback: "I'm having trouble accessing my AI capabilities right now. The OpenAI API key is not configured. Please try again later." 
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          },
          status: 200
        }
      )
    }

    console.log(`🔑 OpenAI API key configured: ${openaiApiKey ? 'YES' : 'NO'}`)
    console.log(`🔑 API key length: ${openaiApiKey?.length || 0}`)
    console.log(`🔑 API key starts with: ${openaiApiKey?.substring(0, 10)}...`)

    // Check if we have a valid whiteboard image
    const hasValidImage = whiteboardImage && 
      whiteboardImage !== "data:image/png;base64,placeholder" && 
      whiteboardImage.startsWith('data:image/')

    // Generate phase-specific prompt
    const systemPrompt = generateSystemPrompt(currentPhase, requirements)
    
    const userPrompt = `
CURRENT PHASE: ${currentPhase}
REQUIREMENTS GATHERED: ${JSON.stringify(requirements, null, 2)}
CANDIDATE'S EXPLANATION: "${transcript}"

${hasValidImage ? `
IMPORTANT: The candidate has drawn something on a whiteboard. Please carefully analyze the whiteboard drawing/diagram and incorporate your observations into your feedback. Describe what you can see on the whiteboard and how it relates to the system design.

If the candidate is asking whether you can see the whiteboard (e.g., "can you see what's on the whiteboard"), acknowledge that you can see their drawing and describe what's visible.
` : ''}

Please analyze the candidate's approach and provide feedback on:
1. Understanding of the current phase objectives
2. Technical correctness and completeness
3. Communication clarity
${hasValidImage ? '4. Analysis of their whiteboard diagram/drawing' : '4. Suggestions for visual representation'}
5. One specific suggestion for improvement
6. Encouragement and next steps

Keep response conversational, under 200 words, and suitable for text-to-speech.
${currentPhase === 'requirements' ? 'Focus on whether they\'re asking the right clarifying questions.' : ''}
${currentPhase === 'architecture' ? 'Focus on the design choices and component relationships.' : ''}
${currentPhase === 'scaling' ? 'Focus on scalability solutions and bottleneck identification.' : ''}
`

    console.log(`📝 System prompt length: ${systemPrompt.length}`)
    console.log(`📝 User prompt length: ${userPrompt.length}`)

    // Call OpenAI API (with vision if whiteboard image is available)
    console.log('🚀 Making OpenAI API call...')
    const openaiResponse = await callOpenAI(systemPrompt, userPrompt, whiteboardImage)
    
    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text()
      console.error('❌ OpenAI API failed:', openaiResponse.status, errorText)
      return new Response(
        JSON.stringify({ 
          feedback: `I'm having trouble processing your request right now. OpenAI API returned error ${openaiResponse.status}. Please try again.` 
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          },
          status: 200
        }
      )
    }

    const result = await openaiResponse.json()
    console.log('🔍 OpenAI response status:', openaiResponse.status)
    console.log('🔍 OpenAI response headers:', Object.fromEntries(openaiResponse.headers.entries()))
    console.log('🔍 OpenAI full response:', JSON.stringify(result, null, 2))
    
    const feedback = result.choices[0]?.message?.content
    
    if (!feedback) {
      console.error('❌ No feedback content in OpenAI response')
      console.error('❌ Response structure:', JSON.stringify(result, null, 2))
      return new Response(
        JSON.stringify({ 
          feedback: "I received an empty response from the AI. Let me try to help anyway - could you tell me more about what you've drawn on the whiteboard?" 
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          },
          status: 200
        }
      )
    }

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
    console.error('❌ Error stack:', error.stack)
    console.error('❌ Error message:', error.message)
    console.error('❌ Error name:', error.name)
    
    // Return graceful fallback
    return new Response(
      JSON.stringify({ 
        feedback: `I encountered an error while processing your request: ${error.message}. Please try again.` 
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

  console.log(`🔍 Has valid image: ${hasValidImage}`)
  console.log(`🔍 Whiteboard image check: length=${whiteboardImage?.length}, starts with data:image=${whiteboardImage?.startsWith('data:image/')}, not placeholder=${whiteboardImage !== "data:image/png;base64,placeholder"}`)

  // Use gpt-4.1-nano for cost efficiency (50x cheaper than gpt-4o)
  const model = 'gpt-4.1-nano'
  console.log(`🤖 Using model: ${model} (vision capable: ${hasValidImage})`)
  
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
    console.log('📤 Sending vision request with image')
  } else {
    // Use text-only model
    messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]
    console.log('📤 Sending text-only request (no valid image)')
  }

  console.log('📤 Request body preview:', JSON.stringify({
    model,
    messages: messages.map(msg => ({
      ...msg,
      content: typeof msg.content === 'string' ? msg.content.substring(0, 100) + '...' : '[VISION_CONTENT]'
    })),
    max_tokens: 250,
    temperature: 0.7,
  }, null, 2))

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