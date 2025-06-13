import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://llfckjszmvhirwjfzdqj.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxsZmNranN6bXZoaXJ3amZ6ZHFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3OTIxNDIsImV4cCI6MjA2NTM2ODE0Mn0.G9FHck8cRIdz5K31ZmnMHufIWceW6fF2pmc9m4BUBbE'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Edge Function endpoints
export const EDGE_FUNCTIONS = {
  sessionManagement: `${supabaseUrl}/functions/v1/session-management`,
  questionGenerator: `${supabaseUrl}/functions/v1/question-generator`,
  transcriptHandler: `${supabaseUrl}/functions/v1/transcript-handler`,
  audioWebSocket: `${supabaseUrl.replace('https://', 'wss://')}/functions/v1/audio-websocket`,
  codingFeedback: `${supabaseUrl}/functions/v1/coding-feedback`,
  codeExecutor: `${supabaseUrl}/functions/v1/code-executor`,
}

// Database types for TypeScript
export interface UserProfile {
  id: string
  email: string
  full_name?: string
  role?: 'frontend' | 'backend' | 'fullstack' | 'mobile' | 'devops' | 'data' | 'ml'
  experience_level?: 'student' | 'junior' | 'mid' | 'senior' | 'staff' | 'principal'
  voice_persona?: string
  created_at: string
  updated_at: string
}

export interface InterviewSession {
  id: string
  user_id: string
  role: string
  company?: string
  interview_type: 'behavioral' | 'coding' | 'system_design' | 'mixed'
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'canceled'
  started_at?: string
  completed_at?: string
  duration_seconds?: number
  created_at: string
  updated_at: string
}

export interface SessionTranscript {
  id: string
  session_id: string
  speaker: 'user' | 'ai'
  content: string
  timestamp_seconds: number
  confidence_score?: number
  created_at: string
}

export interface SessionMetrics {
  id: string
  session_id: string
  words_per_minute?: number
  filler_word_count: number
  total_words: number
  speaking_time_seconds: number
  created_at: string
} 