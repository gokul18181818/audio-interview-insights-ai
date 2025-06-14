import { supabase, EDGE_FUNCTIONS, InterviewSession, SessionTranscript, SessionMetrics } from './supabase'
import { SystemDesignSession, WhiteboardSnapshot, AIFeedback } from './systemDesignTypes'

// Helper function to make authenticated requests to Edge Functions
async function makeAuthenticatedRequest(url: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    throw new Error('Not authenticated')
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || 'Request failed')
  }

  return response.json()
}

// Session Management API
export const sessionAPI = {
  // Create a new interview session
  async create(data: { role: string; company?: string; type: string }): Promise<{ session: InterviewSession }> {
    return makeAuthenticatedRequest(EDGE_FUNCTIONS.sessionManagement, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Start a session
  async start(sessionId: string): Promise<{ session: InterviewSession }> {
    return makeAuthenticatedRequest(EDGE_FUNCTIONS.sessionManagement, {
      method: 'PUT',
      body: JSON.stringify({ sessionId, action: 'start' }),
    })
  },

  // Complete a session
  async complete(sessionId: string): Promise<{ session: InterviewSession }> {
    return makeAuthenticatedRequest(EDGE_FUNCTIONS.sessionManagement, {
      method: 'PUT',
      body: JSON.stringify({ sessionId, action: 'complete' }),
    })
  },

  // Get session details
  async get(sessionId: string): Promise<{ session: InterviewSession & { session_transcripts: SessionTranscript[], session_metrics: SessionMetrics[] } }> {
    return makeAuthenticatedRequest(`${EDGE_FUNCTIONS.sessionManagement}?sessionId=${sessionId}`)
  },
}

// Question Generation API
export const questionAPI = {
  // Generate a new question
  async generate(data: { role: string; type: string; company?: string }): Promise<{ question: string }> {
    return makeAuthenticatedRequest(EDGE_FUNCTIONS.questionGenerator, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
}

// Transcript API
export const transcriptAPI = {
  // Add a transcript entry
  async add(data: { 
    sessionId: string
    speaker: 'user' | 'ai'
    content: string
    timestampSeconds: number 
  }): Promise<{ transcript: SessionTranscript }> {
    return makeAuthenticatedRequest(EDGE_FUNCTIONS.transcriptHandler, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Get session summary (transcripts + metrics)
  async getSummary(sessionId: string): Promise<{ 
    session: InterviewSession
    transcripts: SessionTranscript[]
    metrics: SessionMetrics | null 
  }> {
    return makeAuthenticatedRequest(`${EDGE_FUNCTIONS.transcriptHandler}?sessionId=${sessionId}`)
  },
}

// Audio WebSocket API
export class AudioWebSocket {
  private ws: WebSocket | null = null
  private onTranscription?: (data: { sessionId: string; text: string; timestamp: number }) => void
  private onAudioResponse?: (data: { sessionId: string; audioData: string; mimeType: string }) => void
  private onError?: (error: string) => void

  constructor(callbacks: {
    onTranscription?: (data: { sessionId: string; text: string; timestamp: number }) => void
    onAudioResponse?: (data: { sessionId: string; audioData: string; mimeType: string }) => void
    onError?: (error: string) => void
  }) {
    this.onTranscription = callbacks.onTranscription
    this.onAudioResponse = callbacks.onAudioResponse
    this.onError = callbacks.onError
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(EDGE_FUNCTIONS.audioWebSocket)
        
        this.ws.onopen = () => {
          console.log('Audio WebSocket connected')
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            
            switch (data.type) {
              case 'transcription':
                this.onTranscription?.(data)
                break
              case 'audio_response':
                this.onAudioResponse?.(data)
                break
              case 'error':
                this.onError?.(data.message)
                break
            }
          } catch (error) {
            console.error('WebSocket message parse error:', error)
          }
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          this.onError?.('WebSocket connection error')
          reject(error)
        }

        this.ws.onclose = () => {
          console.log('Audio WebSocket disconnected')
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  // Send audio chunk for transcription
  sendAudioChunk(audioData: string, sessionId: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'audio_chunk',
        audioData,
        sessionId
      }))
    }
  }

  // Request TTS generation
  generateSpeech(text: string, sessionId: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'generate_speech',
        text,
        sessionId
      }))
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
}

// System Design Interview API
export const systemDesignAPI = {
  // Create a new system design session
  async createSession(data: { 
    problem_statement: string
    interview_session_id?: string 
  }): Promise<SystemDesignSession> {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data: result, error } = await supabase
      .from('system_design_sessions')
      .insert([{
        problem_statement: data.problem_statement,
        interview_session_id: data.interview_session_id,
        user_id: user.id,
        current_phase: 'requirements',
        phase_timings: {},
        whiteboard_snapshots: [],
        requirements_gathered: {},
        ai_feedback_history: []
      }])
      .select()
      .single()

    if (error) throw error
    return result
  },

  // Update phase and timing
  async updatePhase(sessionId: string, phase: string, timeSpent: number): Promise<void> {
    const { data: session } = await supabase
      .from('system_design_sessions')
      .select('phase_timings')
      .eq('id', sessionId)
      .single()

    const updatedTimings = {
      ...session?.phase_timings,
      [phase]: timeSpent
    }

    const { error } = await supabase
      .from('system_design_sessions')
      .update({ 
        current_phase: phase,
        phase_timings: updatedTimings,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)

    if (error) throw error
  },

  // Save whiteboard snapshot
  async saveSnapshot(sessionId: string, snapshot: {
    image_data: string
    elements_data: any
    phase: string
  }): Promise<void> {
    const { data: session } = await supabase
      .from('system_design_sessions')
      .select('whiteboard_snapshots')
      .eq('id', sessionId)
      .single()

    const newSnapshot: WhiteboardSnapshot = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      image_data: snapshot.image_data,
      elements_data: snapshot.elements_data,
      phase: snapshot.phase
    }

    const updatedSnapshots = [...(session?.whiteboard_snapshots || []), newSnapshot]

    const { error } = await supabase
      .from('system_design_sessions')
      .update({ 
        whiteboard_snapshots: updatedSnapshots,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)

    if (error) throw error
  },

  // Update requirements
  async updateRequirements(sessionId: string, requirements: Record<string, any>): Promise<void> {
    const { error } = await supabase
      .from('system_design_sessions')
      .update({ 
        requirements_gathered: requirements,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)

    if (error) throw error
  },

  // Get AI feedback for current state
  async getAIFeedback(data: {
    whiteboardImage: string
    transcript: string
    currentPhase: string
    requirements: Record<string, any>
    sessionId: string
  }): Promise<string> {
    return makeAuthenticatedRequest(EDGE_FUNCTIONS.systemDesignFeedback, {
      method: 'POST',
      body: JSON.stringify(data),
    }).then(result => result.feedback)
  },

  // Save AI feedback
  async saveFeedback(sessionId: string, feedback: {
    phase: string
    feedback_text: string
    diagram_analysis: string
    transcript: string
    suggestions: string[]
  }): Promise<void> {
    const { data: session } = await supabase
      .from('system_design_sessions')
      .select('ai_feedback_history')
      .eq('id', sessionId)
      .single()

    const newFeedback: AIFeedback = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      ...feedback
    }

    const updatedFeedback = [...(session?.ai_feedback_history || []), newFeedback]

    const { error } = await supabase
      .from('system_design_sessions')
      .update({ 
        ai_feedback_history: updatedFeedback,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)

    if (error) throw error
  },

  // Get session with all data
  async getSession(sessionId: string): Promise<SystemDesignSession> {
    const { data, error } = await supabase
      .from('system_design_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (error) throw error
    return data
  },

  // Complete the design session
  async completeSession(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from('system_design_sessions')
      .update({ 
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)

    if (error) throw error
  }
}

// Coding Interview API
export const codingAPI = {
  // Execute code with test cases
  async executeCode(data: { 
    code: string
    language: string
    testCases: Array<{
      input: any[]
      expected: any
      description: string
    }>
    functionName: string
  }): Promise<{ 
    output: string
    tests: {
      passed: number
      total: number
      details: string[]
      results: any[]
    }
  }> {
    return makeAuthenticatedRequest(EDGE_FUNCTIONS.codeExecutor, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Get AI feedback on code + transcript
  async getCodingFeedback(data: {
    transcript: string
    code: string
    language: string
    problem: string
    testResults: any
  }): Promise<{ feedback: string }> {
    return makeAuthenticatedRequest(EDGE_FUNCTIONS.codingFeedback, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
}

// User Profile API (using direct Supabase client)
export const userAPI = {
  // Get current user profile
  async getProfile() {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .single()
    
    if (error) throw error
    return data
  },

  // Update user profile
  async updateProfile(updates: Partial<{
    full_name: string
    role: string
    experience_level: string
    voice_persona: string
  }>) {
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Get user's recent sessions
  async getRecentSessions(limit = 10) {
    const { data, error } = await supabase
      .from('interview_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    return data
  },
}

// Authentication helpers
export const authAPI = {
  // Sign up with email/password
  async signUp(email: string, password: string, metadata?: { full_name?: string }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    })
    
    if (error) throw error
    return data
  },

  // Sign in with email/password
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) throw error
    return data
  },

  // Sign out
  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  // Get current session
  async getSession() {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    return data.session
  },

  // Listen to auth changes
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback)
  }
} 